import { body, validationResult } from "express-validator";
import {
  GUIDE_PROFILE_LIMITS,
  SUPPORTED_GUIDE_LANGUAGES,
} from "../../../constants/guideProfileConstants.js";

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

const optionalCloudinaryMediaRules = (fieldName) => [
  body(`${fieldName}.secureUrl`)
    .optional()
    .trim()
    .notEmpty()
    .withMessage(`${fieldName} secureUrl cannot be empty`)
    .isURL()
    .withMessage(`${fieldName} secureUrl must be a valid URL`),
  body(`${fieldName}.publicId`)
    .optional()
    .trim()
    .notEmpty()
    .withMessage(`${fieldName} publicId cannot be empty`),
  body(fieldName).custom((value) => {
    if (value === null || value === undefined) {
      return true;
    }

    if (typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`${fieldName} must be an object with secureUrl and publicId`);
    }

    const hasSecureUrl = Boolean(String(value.secureUrl || "").trim());
    const hasPublicId = Boolean(String(value.publicId || "").trim());

    if (hasSecureUrl !== hasPublicId) {
      throw new Error(`${fieldName} requires both secureUrl and publicId`);
    }

    return true;
  }),
];

export const updateGuideProfileValidation = [
  body("bio")
    .optional()
    .isString()
    .trim()
    .isLength({ max: GUIDE_PROFILE_LIMITS.MAX_BIO_LENGTH })
    .withMessage(`Bio must be at most ${GUIDE_PROFILE_LIMITS.MAX_BIO_LENGTH} characters`),

  body("interests")
    .optional()
    .isArray({ max: GUIDE_PROFILE_LIMITS.MAX_INTERESTS })
    .withMessage(`You can add at most ${GUIDE_PROFILE_LIMITS.MAX_INTERESTS} interests`),

  body("interests.*")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Each interest must be a non-empty string")
    .isLength({ max: GUIDE_PROFILE_LIMITS.MAX_INTEREST_LENGTH })
    .withMessage(
      `Each interest must be at most ${GUIDE_PROFILE_LIMITS.MAX_INTEREST_LENGTH} characters`,
    ),

  body("experience")
    .optional()
    .isObject()
    .withMessage("experience must be an object"),

  body("experience.year")
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage("experience.year must be a non-empty string")
    .isLength({ max: GUIDE_PROFILE_LIMITS.MAX_EXPERIENCE_YEAR_LENGTH })
    .withMessage(
      `experience.year must be at most ${GUIDE_PROFILE_LIMITS.MAX_EXPERIENCE_YEAR_LENGTH} characters`,
    ),

  ...optionalCloudinaryMediaRules("experience.photo"),

  body().custom((_, { req }) => {
    if (
      req.body.bio === undefined &&
      req.body.interests === undefined &&
      req.body.experience === undefined
    ) {
      throw new Error("At least one of bio, interests, or experience must be provided");
    }

    if (req.body.experience !== undefined && req.body.experience.year === undefined) {
      throw new Error("experience.year is required when experience is provided");
    }

    return true;
  }),
];

export const setGuideLanguagesValidation = [
  body("languages")
    .isArray({
      min: GUIDE_PROFILE_LIMITS.MIN_LANGUAGES,
      max: GUIDE_PROFILE_LIMITS.MAX_LANGUAGES,
    })
    .withMessage(
      `languages must contain between ${GUIDE_PROFILE_LIMITS.MIN_LANGUAGES} and ${GUIDE_PROFILE_LIMITS.MAX_LANGUAGES} items`,
    ),

  body("languages.*")
    .trim()
    .notEmpty()
    .withMessage("Each language must be a non-empty string")
    .custom((value) => {
      const code = String(value).trim().toLowerCase();

      if (!SUPPORTED_GUIDE_LANGUAGES.includes(code)) {
        throw new Error(
          `Unsupported language code: ${value}. Supported codes: ${SUPPORTED_GUIDE_LANGUAGES.join(", ")}`,
        );
      }

      return true;
    }),
];
