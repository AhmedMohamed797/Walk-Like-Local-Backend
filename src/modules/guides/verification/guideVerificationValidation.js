import { body, validationResult } from "express-validator";

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

const cloudinaryMediaRules = (fieldName) => [
  body(`${fieldName}.secureUrl`)
    .trim()
    .notEmpty()
    .withMessage(`${fieldName} secureUrl is required`)
    .isURL()
    .withMessage(`${fieldName} secureUrl must be a valid URL`),
  body(`${fieldName}.publicId`)
    .trim()
    .notEmpty()
    .withMessage(`${fieldName} publicId is required`),
];

export const submitVerificationValidation = [
  body("nationality")
    .trim()
    .notEmpty()
    .withMessage("Nationality is required"),

  ...cloudinaryMediaRules("nationalId"),
  ...cloudinaryMediaRules("profilePhoto"),
  ...cloudinaryMediaRules("tourismLicense"),
  ...cloudinaryMediaRules("introductionVideo"),
];

export const resubmitVerificationValidation = [
  body("nationality")
    .trim()
    .notEmpty()
    .withMessage("Nationality is required"),

  ...cloudinaryMediaRules("nationalId"),
  ...cloudinaryMediaRules("profilePhoto"),
  ...cloudinaryMediaRules("tourismLicense"),
  ...cloudinaryMediaRules("introductionVideo"),
];