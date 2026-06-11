import { body, validationResult } from "express-validator";
import { GUIDE_DOCUMENT_FIELD_VALUES } from "../../../constants/verificationStatus.js";

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

const cloudinaryMediaRulesOptional = (fieldName) => [
  body(`${fieldName}.secureUrl`)
    .if((value, { req }) => req.body[fieldName] !== undefined)
    .trim()
    .notEmpty()
    .withMessage(`${fieldName} secureUrl is required`)
    .isURL()
    .withMessage(`${fieldName} secureUrl must be a valid URL`),
  body(`${fieldName}.publicId`)
    .if((value, { req }) => req.body[fieldName] !== undefined)
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
  body()
    .custom((value) => {
      const hasAtLeastOne = GUIDE_DOCUMENT_FIELD_VALUES.some(
        (field) => value[field] !== undefined,
      );
      if (!hasAtLeastOne) {
        throw new Error("At least one rejected document must be provided");
      }
      return true;
    }),

  ...cloudinaryMediaRulesOptional("nationalId"),
  ...cloudinaryMediaRulesOptional("profilePhoto"),
  ...cloudinaryMediaRulesOptional("tourismLicense"),
  ...cloudinaryMediaRulesOptional("introductionVideo"),
];