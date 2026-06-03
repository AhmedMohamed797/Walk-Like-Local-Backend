import { Router } from "express";
import {
  registerGuide,
  registerTourist,
  login,
  googleAuth,
  startGoogleOAuth,
  googleOAuthCallback,
  verifyEmail,
  resendVerificationEmail,
  requestPasswordReset,
  verifyResetCode,
  resendResetCode,
  resetPassword,
  changePassword,
} from "./authController.js";
import { handleValidation } from "./authValidation.js";
import {
  registerGuideValidation,
  registerTouristValidation,
  loginValidation,
  googleAuthValidation,
  googleOAuthStartValidation,
  resendVerificationEmailValidation,
  requestPasswordResetValidation,
  verifyResetCodeValidation,
  resetPasswordValidation,
  changePasswordValidation,
} from "./authValidation.js";
import { authMiddleware } from "./authMiddleware.js";

const router = Router();

router.post("/register-guide", registerGuideValidation, handleValidation, registerGuide);
router.post("/register-tourist", registerTouristValidation, handleValidation, registerTourist);
router.post("/login", loginValidation, handleValidation, login);
router.post("/google", googleAuthValidation, handleValidation, googleAuth);

router.get("/google", googleOAuthStartValidation, handleValidation, startGoogleOAuth);
router.get("/google/callback", googleOAuthCallback);

router.get("/verify-email", verifyEmail);
router.post(
  "/resend-verification-email",
  resendVerificationEmailValidation,
  handleValidation,
  resendVerificationEmail,
);
router.post(
  "/request-password-reset",
  requestPasswordResetValidation,
  handleValidation,
  requestPasswordReset,
);
router.post("/verify-reset-code", verifyResetCodeValidation, handleValidation, verifyResetCode);
router.post(
  "/resend-reset-code",
  requestPasswordResetValidation,
  handleValidation,
  resendResetCode,
);
router.post("/reset-password", resetPasswordValidation, handleValidation, resetPassword);
router.patch(
  "/change-password",
  authMiddleware,
  changePasswordValidation,
  handleValidation,
  changePassword,
);

export default router;
