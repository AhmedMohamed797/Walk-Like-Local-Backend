import { body, param, query, validationResult } from "express-validator";
import {
  BOOKING_STATUS_VALUES,
  BOOKING_LIMITS,
} from "../../constants/bookingConstants.js";

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

const bookingIdRules = param("id")
  .isMongoId()
  .withMessage("Invalid booking ID");

const cloudinaryMediaRules = (prefix) => [
  body(`${prefix}.secureUrl`)
    .trim()
    .notEmpty()
    .withMessage(`${prefix} secureUrl is required`)
    .isURL()
    .withMessage(`${prefix} secureUrl must be a valid URL`),
  body(`${prefix}.publicId`)
    .trim()
    .notEmpty()
    .withMessage(`${prefix} publicId is required`),
];

const memberRules = body("members")
  .optional()
  .isArray()
  .withMessage("members must be an array");

const memberItemRules = [
  body("members.*.fullName")
    .trim()
    .notEmpty()
    .withMessage("Member fullName is required")
    .isLength({ max: BOOKING_LIMITS.MAX_MEMBER_NAME_LENGTH })
    .withMessage(`Member fullName must be at most ${BOOKING_LIMITS.MAX_MEMBER_NAME_LENGTH} characters`),
  ...cloudinaryMediaRules("members.*.idDocument"),
];

const listQueryRules = [
  query("status")
    .optional()
    .isIn(BOOKING_STATUS_VALUES)
    .withMessage(`status must be one of: ${BOOKING_STATUS_VALUES.join(", ")}`),
  query("search")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("search must be between 1 and 100 characters"),
  query("dateFrom")
    .optional()
    .isISO8601()
    .withMessage("dateFrom must be a valid ISO 8601 date"),
  query("dateTo")
    .optional()
    .isISO8601()
    .withMessage("dateTo must be a valid ISO 8601 date"),
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("limit must be between 1 and 50"),
  query("sort")
    .optional()
    .isIn(["-createdAt", "createdAt", "slot.date", "-slot.date"])
    .withMessage("sort must be one of: -createdAt, createdAt, slot.date, -slot.date"),
];

export const createBookingValidation = [
  body("tourId")
    .isMongoId()
    .withMessage("Invalid tour ID"),
  body("slotId")
    .isMongoId()
    .withMessage("Invalid slot ID"),
  body("groupSize")
    .isInt({ min: BOOKING_LIMITS.MIN_GROUP_SIZE, max: BOOKING_LIMITS.MAX_GROUP_SIZE })
    .withMessage(`groupSize must be between ${BOOKING_LIMITS.MIN_GROUP_SIZE} and ${BOOKING_LIMITS.MAX_GROUP_SIZE}`),
  memberRules,
  ...memberItemRules,
  body("deselectedActivityIds")
    .optional()
    .isArray()
    .withMessage("deselectedActivityIds must be an array"),
  body("deselectedActivityIds.*")
    .optional()
    .isMongoId()
    .withMessage("Each deselectedActivityId must be a valid MongoDB ID"),
  body("couponCode")
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage("couponCode must be between 3 and 30 characters"),
  handleValidation,
];

export const getBookingValidation = [
  bookingIdRules,
  handleValidation,
];

export const listMyBookingsValidation = [
  ...listQueryRules,
  handleValidation,
];

export const cancelBookingValidation = [
  bookingIdRules,
  body("reason")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("reason must be at most 500 characters"),
  handleValidation,
];

export const listGuideBookingsValidation = [
  ...listQueryRules,
  handleValidation,
];
