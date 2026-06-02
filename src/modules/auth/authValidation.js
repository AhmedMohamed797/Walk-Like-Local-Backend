import { body, query, validationResult } from "express-validator";
import { ROLES } from "../../constants/roles.js";

const passwordRules = body("password")
  .trim()
  .notEmpty()
  .withMessage("Password is required")
  .isLength({ min: 8 })
  .withMessage("Password must be at least 8 characters");

const emailRules = body("email")
  .trim()
  .notEmpty()
  .withMessage("Email is required")
  .isEmail()
  .withMessage("Invalid email address")
  .normalizeEmail();

const fullNameRules = body("fullName")
  .trim()
  .notEmpty()
  .withMessage("Full name is required")
  .isLength({ min: 3, max: 25 })
  .withMessage("Full name must be between 3 and 25 characters");

const newPasswordRules = body("newPassword")
  .trim()
  .notEmpty()
  .withMessage("New password is required")
  .isLength({ min: 8 })
  .withMessage("New password must be at least 8 characters");

const roleRules = body("role")
  .notEmpty()
  .withMessage("Role is required")
  .isIn([ROLES.GUIDE, ROLES.TOURIST])
  .withMessage("Role must be GUIDE or TOURIST");

const resetCodeRules = body("code")
  .trim()
  .notEmpty()
  .withMessage("Reset code is required")
  .isLength({ min: 6, max: 6 })
  .withMessage("Reset code must be 6 digits");

export const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
    });
  }
  next();
};

export const registerGuideValidation = [fullNameRules, emailRules, passwordRules];
export const registerTouristValidation = registerGuideValidation;
export const loginValidation = [emailRules, body("password").notEmpty().withMessage("Password is required")];

export const googleAuthValidation = [body("idToken").notEmpty().withMessage("Google idToken is required"), roleRules];
export const googleOAuthStartValidation = [roleRules];

export const resendVerificationEmailValidation = [emailRules];
export const requestPasswordResetValidation = [emailRules];

export const verifyResetCodeValidation = [emailRules, resetCodeRules];

export const resetPasswordValidation = [emailRules, newPasswordRules];

export const changePasswordValidation = [body("currentPassword").notEmpty().withMessage("Current password is required"), newPasswordRules];
