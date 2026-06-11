import { param, query, body, validationResult } from "express-validator";
import { ROLES } from "../../../constants/roles.js";
import { USER_STATUS } from "../../../constants/userStatus.js";

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

const userIdRules = param("userId")
  .isMongoId()
  .withMessage("Invalid user ID");

const reasonRules = body("reason")
  .trim()
  .notEmpty()
  .withMessage("Reason is required")
  .isLength({ max: 500 })
  .withMessage("Reason must be at most 500 characters");

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

const filterRules = [
  query("role")
    .optional()
    .isIn([ROLES.GUIDE, ROLES.TOURIST, ROLES.ADMIN])
    .withMessage("Role must be GUIDE, TOURIST, or ADMIN"),
  query("status")
    .optional()
    .isIn([USER_STATUS.ACTIVE, USER_STATUS.SUSPENDED, USER_STATUS.BANNED])
    .withMessage("Status must be ACTIVE, SUSPENDED, or BANNED"),
  query("search")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Search must be at most 100 characters"),
];

export const getUsersValidation = [...paginationRules, ...filterRules];
export const userIdValidation = [userIdRules];
export const suspendUserValidation = [userIdRules, reasonRules];
export const activateUserValidation = [userIdRules];
export const banUserValidation = [userIdRules, reasonRules];
export const unbanUserValidation = [userIdRules];