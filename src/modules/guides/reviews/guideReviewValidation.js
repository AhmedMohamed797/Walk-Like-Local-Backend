import { body, param, query, validationResult } from "express-validator";
import {
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

const reviewIdRules = param("reviewId").isMongoId().withMessage("Invalid review ID");

const guideIdRules = param("guideId").isMongoId().withMessage("Invalid guide ID");

const paginationRules = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Limit must be between 1 and 50"),
  query("sort")
    .optional()
    .isIn([
      "createdAt",
      "-createdAt",
      "rating",
      "-rating",
    ])
    .withMessage(`Sort must be one of: createdAt, -createdAt, rating, -rating`),
];

export const createReviewValidation = [
  body("bookingId").isMongoId().withMessage("Invalid booking ID"),
  body("rating")
    .isInt({ min: REVIEW_LIMITS.MIN_RATING, max: REVIEW_LIMITS.MAX_RATING })
    .withMessage(`Rating must be between ${REVIEW_LIMITS.MIN_RATING} and ${REVIEW_LIMITS.MAX_RATING}`),
  body("comment")
    .optional()
    .trim()
    .isLength({ max: REVIEW_LIMITS.MAX_COMMENT_LENGTH })
    .withMessage(`Comment must not exceed ${REVIEW_LIMITS.MAX_COMMENT_LENGTH} characters`),
];

export const updateReviewValidation = [
  reviewIdRules,
  body("rating")
    .optional()
    .isInt({ min: REVIEW_LIMITS.MIN_RATING, max: REVIEW_LIMITS.MAX_RATING })
    .withMessage(`Rating must be between ${REVIEW_LIMITS.MIN_RATING} and ${REVIEW_LIMITS.MAX_RATING}`),
  body("comment")
    .optional()
    .trim()
    .isLength({ max: REVIEW_LIMITS.MAX_COMMENT_LENGTH })
    .withMessage(`Comment must not exceed ${REVIEW_LIMITS.MAX_COMMENT_LENGTH} characters`),
  body().custom((value) => {
    if (value.rating === undefined && value.comment === undefined) {
      throw new Error("At least one of rating or comment must be provided");
    }
    return true;
  }),
];

export const getReviewByIdValidation = [reviewIdRules];

export const getReviewsByGuideValidation = [
  guideIdRules,
  ...paginationRules,
  query("minRating")
    .optional()
    .isFloat({ min: REVIEW_LIMITS.MIN_RATING, max: REVIEW_LIMITS.MAX_RATING })
    .withMessage(`minRating must be between ${REVIEW_LIMITS.MIN_RATING} and ${REVIEW_LIMITS.MAX_RATING}`),
  query("maxRating")
    .optional()
    .isFloat({ min: REVIEW_LIMITS.MIN_RATING, max: REVIEW_LIMITS.MAX_RATING })
    .withMessage(`maxRating must be between ${REVIEW_LIMITS.MIN_RATING} and ${REVIEW_LIMITS.MAX_RATING}`),
];

export const listMyReviewsValidation = [...paginationRules];

export const deleteReviewValidation = [reviewIdRules];
