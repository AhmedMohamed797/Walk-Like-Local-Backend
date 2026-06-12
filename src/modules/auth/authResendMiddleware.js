import rateLimit from "express-rate-limit";
import User from "../users/userModel.js";
import { asyncHandler } from "../../middlewares/error.middleware.js";
import { AppError } from "../../utils/AppError.js";

const rateLimitResponse = {
  success: false,
  message: "Too many requests. Please try again later.",
};

const createEmailResendRateLimiter = (max, windowMs) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: rateLimitResponse,
  });

/** IP-based limit for verification resend (5 requests / 15 min). */
export const resendVerificationRateLimiter = createEmailResendRateLimiter(5, 15 * 60 * 1000);

/** IP-based limit for password reset code resend (5 requests / 15 min). */
export const resendResetCodeRateLimiter = createEmailResendRateLimiter(5, 15 * 60 * 1000);

/** IP-based limit for login (20 requests / 15 min). */
export const loginRateLimiter = createEmailResendRateLimiter(20, 15 * 60 * 1000);

const getRetryAfterSeconds = (expiresAt) => {
  if (!expiresAt) return null;

  const expiry = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  const remainingMs = expiry.getTime() - Date.now();

  if (remainingMs <= 0) return null;

  return Math.ceil(remainingMs / 1000);
};

const rejectUntilExpiry = (res, retryAfterSeconds, label) => {
  res.set("Retry-After", String(retryAfterSeconds));

  return res.status(429).json({
    success: false,
    message: `A ${label} was already sent and is still valid. Please wait ${retryAfterSeconds} seconds before requesting another.`,
    retryAfterSeconds,
  });
};

/**
 * Blocks resend while the current verification link has not expired.
 * Runs after validation so req.body.email is present.
 */
export const verificationResendCooldown = asyncHandler(async (req, res, next) => {
  const email = req.body.email.toLowerCase();
  const user = await User.findOne({ email });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (user.isEmailVerified) {
    throw new AppError("Email is already verified", 400);
  }

  const retryAfterSeconds = getRetryAfterSeconds(user.emailVerificationExpiresAt);
  if (retryAfterSeconds) {
    return rejectUntilExpiry(res, retryAfterSeconds, "verification email");
  }

  next();
});

/**
 * Blocks sending a new reset code while the current one has not expired.
 * Used for both initial request and resend endpoints.
 */
export const resetCodeResendCooldown = asyncHandler(async (req, res, next) => {
  const email = req.body.email.toLowerCase();
  const user = await User.findOne({ email });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (!user.passwordResetCode || !user.passwordResetCodeExpiresAt) {
    return next();
  }

  const retryAfterSeconds = getRetryAfterSeconds(user.passwordResetCodeExpiresAt);
  if (retryAfterSeconds) {
    return rejectUntilExpiry(res, retryAfterSeconds, "reset code");
  }

  next();
});
