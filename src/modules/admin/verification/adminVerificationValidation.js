import { param, query, body, validationResult } from "express-validator";
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

const guideIdRules = param("guideId")
  .isMongoId()
  .withMessage("Invalid guide ID");

const touristIdRules = param("touristId")
  .isMongoId()
  .withMessage("Invalid tourist ID");

const reasonRules = body("reason")
  .trim()
  .notEmpty()
  .withMessage("Rejection reason is required")
  .isLength({ max: 500 })
  .withMessage("Reason must be at most 500 characters");

const rejectedFieldsRules = body("rejectedFields")
  .isArray({ min: 1 })
  .withMessage("Rejected fields must be a non-empty array")
  .custom((fields) => {
    const invalid = fields.filter((f) => !GUIDE_DOCUMENT_FIELD_VALUES.includes(f));
    if (invalid.length > 0) {
      throw new Error(`Invalid rejected fields: ${invalid.join(", ")}`);
    }
    return true;
  });

const paginationRules = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
];

export const guideIdValidation = [guideIdRules];
export const touristIdValidation = [touristIdRules];
export const rejectGuideValidation = [guideIdRules, reasonRules, rejectedFieldsRules];
export const rejectTouristValidation = [touristIdRules, reasonRules];
export const paginationValidation = paginationRules;