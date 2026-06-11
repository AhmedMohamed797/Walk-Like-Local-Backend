import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth2";
import { ROLES } from "../../constants/roles.js";
import * as authService from "./authService.js";
import { asyncHandler } from "../../middlewares/error.middleware.js";

const getFrontendUrl = () =>
  process.env.FRONTEND_URL?.replace(/\/$/, "") || "http://localhost:5173";

const redirectToFrontend = (res, path, query = {}) => {
  const url = new URL(path, getFrontendUrl());
  Object.entries(query).forEach(([key, value]) => {
    if (value != null) url.searchParams.set(key, String(value));
  });
  return res.redirect(url.toString());
};

export const isGoogleRedirectEnabled = () =>
  Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_CALLBACK_URL,
  );

const encodeOAuthState = (role) =>
  Buffer.from(JSON.stringify({ role }), "utf8").toString("base64url");

const decodeOAuthState = (state) => {
  if (!state) return null;

  try {
    const parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
    if (![ROLES.GUIDE, ROLES.TOURIST].includes(parsed.role)) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const configureGooglePassport = () => {
  if (!isGoogleRedirectEnabled()) {
    console.warn("Google OAuth redirect is not configured; skipping passport setup");
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
        passReqToCallback: true,
      },
      async (req, _accessToken, _refreshToken, profile, done) => {
        try {
          const state = decodeOAuthState(req.query.state);
          if (!state?.role) {
            return done(new Error("Invalid OAuth state"));
          }

          const email = profile.emails?.[0]?.value?.toLowerCase();
          if (!email) {
            return done(new Error("Google account email not available"));
          }

          const user = await authService.findOrCreateUserFromGoogleProfile({
            googleId: profile.id,
            email,
            fullName: profile.displayName || email,
            profilePicture: profile.picture || null,
            role: state.role,
          });

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      },
    ),
  );
};

export const registerGuide = asyncHandler(async (req, res) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const user = await authService.registerAccount({
    fullName: req.body.fullName,
    email: req.body.email.toLowerCase(),
    password: req.body.password,
    role: "GUIDE",
  }, baseUrl);

  return res.status(201).json({
    success: true,
    message: "Guide account created successfully",
    data: { email: user.email, role: user.role },
  });
});

export const registerTourist = asyncHandler(async (req, res) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const user = await authService.registerAccount({
    fullName: req.body.fullName,
    email: req.body.email.toLowerCase(),
    password: req.body.password,
    role: "TOURIST",
  }, baseUrl);

  return res.status(201).json({
    success: true,
    message: "Tourist account created successfully",
    data: { email: user.email, role: user.role },
  });
});

export const login = asyncHandler(async (req, res) => {
  const { accessToken, user } = await authService.login({
    email: req.body.email.toLowerCase(),
    password: req.body.password,
  });

  return res.json({
    success: true,
    message: "Login successful",
    data: { accessToken, user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role } },
  });
});

export const googleAuth = asyncHandler(async (req, res) => {
  const { accessToken, user } = await authService.googleAuth({
    idToken: req.body.idToken,
    role: req.body.role,
  });

  return res.json({
    success: true,
    message: "Login successful",
    data: { accessToken, user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role } },
  });
});

export const startGoogleOAuth = (req, res, next) => {
  if (!isGoogleRedirectEnabled()) {
    return res.status(503).json({
      success: false,
      message: "Google OAuth redirect is not configured on the server",
    });
  }

  return passport.authenticate("google", {
    scope: ["email", "profile"],
    state: encodeOAuthState(req.query.role),
    session: false,
  })(req, res, next);
};

export const googleOAuthCallback = (req, res, next) => {
  passport.authenticate("google", { session: false }, (error, user) => {
    if (error || !user) {
      return redirectToFrontend(res, "/auth/error", {
        message: error?.message || "Google authentication failed",
      });
    }

    const accessToken = authService.getAccessTokenForUser(user);
    return redirectToFrontend(res, "/auth/callback", { token: accessToken });
  })(req, res, next);
};


export const verifyEmail = asyncHandler(async (req, res) => {
  await authService.verifyEmail(req.query.token);
  return res.redirect(`${getFrontendUrl()}/email-verified`);
});

export const resendVerificationEmail = asyncHandler(async (req, res) => {
  await authService.resendVerificationEmail(req.body.email.toLowerCase(), `${req.protocol}://${req.get("host")}`);

  return res.json({
    success: true,
    message: "Verification email resent successfully",
  });
});

export const requestPasswordReset = asyncHandler(async (req, res) => {
  await authService.requestPasswordReset(req.body.email.toLowerCase());

  return res.json({
    success: true,
    message: "Password reset code sent to email",
  });
});

export const verifyResetCode = asyncHandler(async (req, res) => {
  await authService.verifyResetCode(req.body.email.toLowerCase(), req.body.code);

  return res.json({
    success: true,
    message: "Reset code verified successfully",
  });
});

export const resendResetCode = asyncHandler(async (req, res) => {
  await authService.resendResetCode(req.body.email.toLowerCase());

  return res.json({
    success: true,
    message: "Password reset code resent successfully",
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body.email.toLowerCase(), req.body.password);

  return res.json({
    success: true,
    message: "Password reset successfully",
  });
});

export const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(req.user._id, req.body.currentPassword, req.body.newPassword);

  return res.json({
    success: true,
    message: "Password changed successfully",
  });
});
