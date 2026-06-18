import { param, validationResult } from "express-validator";

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

export const checkoutValidation = [
  param("bookingId")
    .isMongoId()
    .withMessage("Invalid booking ID"),
  handleValidation,
];

export const paymentStatusValidation = [
  param("bookingId")
    .isMongoId()
    .withMessage("Invalid booking ID"),
  handleValidation,
];
