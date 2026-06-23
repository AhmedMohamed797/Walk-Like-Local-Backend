import { param, query, validationResult } from "express-validator";
import { BOOKING_STATUS_VALUES } from "../../constants/bookingConstants.js";
import { PAYMENT_STATUS_VALUES } from "../../constants/paymentConstants.js";
import { SUPPORTED_GROUP_TYPE_VALUES } from "../../constants/tourConstants.js";

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

const TOURIST_BOOKING_SORT_FIELDS = [
  "createdAt",
  "tourTitle",
  "totalPrice",
  "bookingStatus",
];

const GUIDE_BOOKING_SORT_FIELDS = [
  "createdAt",
  "tourTitle",
  "totalPrice",
  "groupSize",
];

const bookingIdRules = param("bookingId")
  .isMongoId()
  .withMessage("Invalid booking ID");

const commonListQueryRules = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("page must be a positive integer"),
  query("search")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("search must be between 1 and 100 characters"),
  query("status")
    .optional()
    .isIn(BOOKING_STATUS_VALUES)
    .withMessage(`status must be one of: ${BOOKING_STATUS_VALUES.join(", ")}`),
  query("paymentStatus")
    .optional()
    .isIn(PAYMENT_STATUS_VALUES)
    .withMessage(`paymentStatus must be one of: ${PAYMENT_STATUS_VALUES.join(", ")}`),
  query("groupType")
    .optional()
    .isIn(SUPPORTED_GROUP_TYPE_VALUES)
    .withMessage(`groupType must be one of: ${SUPPORTED_GROUP_TYPE_VALUES.join(", ")}`),
  query("from")
    .optional()
    .isISO8601()
    .withMessage("from must be a valid ISO 8601 date"),
  query("to")
    .optional()
    .isISO8601()
    .withMessage("to must be a valid ISO 8601 date"),
  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("sortOrder must be asc or desc"),
];

export const touristBookingHistoryValidation = [
  ...commonListQueryRules,
  query("sortBy")
    .optional()
    .isIn(TOURIST_BOOKING_SORT_FIELDS)
    .withMessage(`sortBy must be one of: ${TOURIST_BOOKING_SORT_FIELDS.join(", ")}`),
  handleValidation,
];

export const guideBookingHistoryValidation = [
  ...commonListQueryRules,
  query("sortBy")
    .optional()
    .isIn(GUIDE_BOOKING_SORT_FIELDS)
    .withMessage(`sortBy must be one of: ${GUIDE_BOOKING_SORT_FIELDS.join(", ")}`),
  handleValidation,
];

export const touristBookingDetailValidation = [
  bookingIdRules,
  handleValidation,
];

export const guideBookingDetailValidation = [
  bookingIdRules,
  handleValidation,
];
