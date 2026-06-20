import { query, validationResult } from "express-validator";

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

export const earningsHistoryValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("limit must be between 1 and 50"),
  query("sortBy")
    .optional()
    .isIn(["createdAt", "guideEarnings", "tourTitle"])
    .withMessage("sortBy must be one of: createdAt, guideEarnings, tourTitle"),
  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("sortOrder must be asc or desc"),
  query("from")
    .optional()
    .isISO8601()
    .withMessage("from must be a valid ISO 8601 date"),
  query("to")
    .optional()
    .isISO8601()
    .withMessage("to must be a valid ISO 8601 date"),
  handleValidation,
];

export const earningsSummaryValidation = [
  handleValidation,
];

export const earningsAnalyticsValidation = [
  handleValidation,
];

export const revenueSummaryValidation = [
  handleValidation,
];

export const revenueAnalyticsValidation = [
  query("year")
    .optional()
    .isInt({ min: 2020, max: 2030 })
    .withMessage("year must be between 2020 and 2030"),
  handleValidation,
];
