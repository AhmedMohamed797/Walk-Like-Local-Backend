import { param, query, validationResult } from "express-validator";
import {
  GUIDE_LIST_DEFAULTS,
  GUIDE_LIST_SORT_FIELD_VALUES,
  REVIEW_LIMITS,
} from "../../../constants/reviewConstants.js";

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

export const listGuidesValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Limit must be between 1 and 50"),
  query("sortBy")
    .optional()
    .isIn(GUIDE_LIST_SORT_FIELD_VALUES)
    .withMessage(`sortBy must be one of: ${GUIDE_LIST_SORT_FIELD_VALUES.join(", ")}`),
  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("sortOrder must be asc or desc"),
  query("minRating")
    .optional()
    .isFloat({ min: 0, max: REVIEW_LIMITS.MAX_RATING })
    .withMessage(`minRating must be between 0 and ${REVIEW_LIMITS.MAX_RATING}`),
  query("maxRating")
    .optional()
    .isFloat({ min: 0, max: REVIEW_LIMITS.MAX_RATING })
    .withMessage(`maxRating must be between 0 and ${REVIEW_LIMITS.MAX_RATING}`),
  query("minReviewCount")
    .optional()
    .isInt({ min: 0 })
    .withMessage("minReviewCount must be a non-negative integer"),
  query("language")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("language cannot be empty"),
  query("search")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("search cannot be empty"),
];

export const getGuidePublicProfileValidation = [
  param("guideId").isMongoId().withMessage("Invalid guide ID"),
];
