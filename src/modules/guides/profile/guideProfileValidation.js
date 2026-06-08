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

  body().custom((_, { req }) => {
    if (req.body.bio === undefined && req.body.interests === undefined) {
      throw new Error("At least one of bio or interests must be provided");
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
      const isSupported = SUPPORTED_GUIDE_LANGUAGES.some(
        (language) => language.toLowerCase() === String(value).trim().toLowerCase(),
      );

      if (!isSupported) {
        throw new Error(
          `Unsupported language: ${value}. Supported: ${SUPPORTED_GUIDE_LANGUAGES.join(", ")}`,
        );
      }

      return true;
    }),
];
