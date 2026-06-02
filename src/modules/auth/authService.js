import User from "../users/userModel.js";
import GuideProfile from "../guides/guideProfileModel.js";
import TouristProfile from "../tourists/touristProfileModel.js";
import { AppError } from "../../utils/AppError.js";
import {
  hashPassword,
  comparePasswords,
  signJwt,
  generateRandomToken,
  generateResetCode,
  getEmailVerificationExpiry,
  getResetCodeExpiry,
  hashValue,
  compareHashedValue,
} from "./authUtils.js";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "./authUtils.js";
import { AUTH_PROVIDERS } from "../../constants/authProviders.js";
import { ROLES } from "../../constants/roles.js";

const createProfileForRole = async (user) => {
  if (user.role === ROLES.GUIDE) {
    await GuideProfile.create({ user: user._id });
  }

  if (user.role === ROLES.TOURIST) {
    await TouristProfile.create({ user: user._id });
  }
};

export const getAccessTokenForUser = (user) =>
  signJwt({
    id: user._id.toString(),
    role: user.role,
    email: user.email,
  });

export const registerAccount = async ({ fullName, email, password, role }, baseUrl) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError("Email already exists", 409);
  }

  const hashedPassword = await hashPassword(password);
  const verificationToken = generateRandomToken();

  const user = await User.create({
    fullName,
    email,
    password: hashedPassword,
    role,
    authProvider: AUTH_PROVIDERS.LOCAL,
    emailVerificationToken: verificationToken,
    emailVerificationExpiresAt: getEmailVerificationExpiry(),
  });

  await createProfileForRole(user);
  await sendVerificationEmail(user, verificationToken);

  return user;
};

export const registerGuide = async ({ fullName, email, password }) => {
  await registerAccount({
    fullName,
    email,
    password,
    role: ROLES.GUIDE,
  });

  return { message: "Guide account created successfully" };
};

export const registerTourist = async ({ fullName, email, password }) => {
  await registerAccount({
    fullName,
    email,
    password,
    role: ROLES.TOURIST,
  });

  return { message: "Tourist account created successfully" };
};

export const login = async ({ email, password }) => {
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    throw new AppError("Invalid credentials", 401);
  }

  if (user.authProvider !== AUTH_PROVIDERS.LOCAL) {
    throw new AppError("Please login with Google", 400);
  }

  const isMatch = await comparePasswords(password, user.password);
  if (!isMatch) {
    throw new AppError("Invalid credentials", 401);
  }

  if (!user.isEmailVerified) {
    throw new AppError("Please verify your email before logging in", 403);
  }

  user.lastLoginAt = new Date();
  await user.save();

  return {
    message: "Login successful",
    accessToken: getAccessTokenForUser(user),
    user,
  };
};

const verifyGoogleIdToken = async (idToken) => {
  if (!idToken) {
    throw new AppError("Google idToken is required", 400);
  }

  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`,
  );
  if (!response.ok) {
    throw new AppError("Invalid Google token", 401);
  }

  const payload = await response.json();
  if (!payload.email || payload.email_verified !== "true") {
    throw new AppError("Google account email not verified", 400);
  }

  return payload;
};

export const findOrCreateUserFromGoogleProfile = async ({
  googleId,
  email,
  fullName,
  profilePicture,
  role,
}) => {
  let user = await User.findOne({ email });

  if (user) {
    if (user.authProvider !== AUTH_PROVIDERS.GOOGLE) {
      throw new AppError("This email is already registered with local login", 409);
    }

    if (user.role !== role) {
      throw new AppError("Role mismatch for this Google account", 409);
    }

    user.lastLoginAt = new Date();
    await user.save();
    return user;
  }

  user = await User.create({
    fullName,
    email,
    authProvider: AUTH_PROVIDERS.GOOGLE,
    googleId,
    role,
    profilePicture,
    isEmailVerified: true,
  });

  await createProfileForRole(user);
  return user;
};

export const googleAuth = async ({ idToken, role }) => {
  const parsedRole = role?.toUpperCase?.();
  if (!parsedRole || !Object.values(ROLES).includes(parsedRole)) {
    throw new AppError("Role must be GUIDE or TOURIST", 400);
  }

  const googlePayload = await verifyGoogleIdToken(idToken);

  const user = await findOrCreateUserFromGoogleProfile({
    googleId: googlePayload.sub,
    email: googlePayload.email.toLowerCase(),
    fullName: googlePayload.name || googlePayload.email,
    profilePicture: googlePayload.picture || null,
    role: parsedRole,
  });

  return {
    message: "Login successful",
    accessToken: getAccessTokenForUser(user),
    user,
  };
};

export const verifyEmail = async (token) => {
  const trimmedToken = String(token || "").trim();

  const user = await User.findOne({
    emailVerificationToken: trimmedToken,
    emailVerificationExpiresAt: { $gt: new Date() },
  });

  if (!user) {
    throw new AppError("Invalid or expired verification token", 400);
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = null;
  user.emailVerificationExpiresAt = null;
  await user.save();

  return user;
};

export const resendVerificationEmail = async (email, baseUrl) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (user.isEmailVerified) {
    throw new AppError("Email is already verified", 400);
  }

  const token = generateRandomToken();
  user.emailVerificationToken = token;
  user.emailVerificationExpiresAt = getEmailVerificationExpiry();
  await user.save();

  await sendVerificationEmail(user, token);

  return { message: "Verification email sent successfully" };
};

export const requestPasswordReset = async (email) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError("User not found", 404);
  }

  const resetCode = generateResetCode();
  user.passwordResetCode = hashValue(resetCode);
  user.passwordResetCodeExpiresAt = getResetCodeExpiry();
  user.isResetCodeVerified = false;
  await user.save();

  await sendPasswordResetEmail(user, resetCode);

  return { message: "Password reset code sent successfully" };
};

export const verifyResetCode = async (email, code) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (!user.passwordResetCode || !user.passwordResetCodeExpiresAt) {
    throw new AppError("No reset request found", 400);
  }

  if (user.passwordResetCodeExpiresAt < new Date()) {
    throw new AppError("Reset code has expired", 400);
  }

  if (!compareHashedValue(code, user.passwordResetCode)) {
    throw new AppError("Invalid reset code", 400);
  }

  user.isResetCodeVerified = true;
  await user.save();

  return { message: "Reset code verified successfully" };
};

export const resendResetCode = async (email) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError("User not found", 404);
  }

  const resetCode = generateResetCode();
  user.passwordResetCode = hashValue(resetCode);
  user.passwordResetCodeExpiresAt = getResetCodeExpiry();
  user.isResetCodeVerified = false;
  await user.save();

  await sendPasswordResetEmail(user, resetCode);

  return { message: "Password reset code sent successfully" };
};

export const resetPassword = async (email, newPassword) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (!user.isResetCodeVerified) {
    throw new AppError(
      "Reset code verification is required before changing password",
      400,
    );
  }

  user.password = await hashPassword(newPassword);
  user.passwordResetCode = null;
  user.passwordResetCodeExpiresAt = null;
  user.isResetCodeVerified = false;
  await user.save();

  return { message: "Password reset successfully" };
};

export const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select("+password");
  if (!user) {
    throw new AppError("User not found", 404);
  }

  const isMatch = await comparePasswords(currentPassword, user.password);
  if (!isMatch) {
    throw new AppError("Current password is incorrect", 400);
  }

  user.password = await hashPassword(newPassword);
  await user.save();

  return { message: "Password changed successfully" };
};
