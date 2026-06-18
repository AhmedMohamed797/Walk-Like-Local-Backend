import { Router } from "express";
import { authMiddleware } from "../auth/authMiddleware.js";
import { createCheckoutSession, handleSuccessRedirect, handleCancelRedirect, getPaymentStatus } from "../payments/paymentController.js";
import { checkoutValidation, paymentStatusValidation } from "../payments/paymentValidation.js";
import checkoutRateLimiter from "../payments/checkoutRateLimiter.js";

const router = Router();

router.get("/success", handleSuccessRedirect);
router.get("/cancel", handleCancelRedirect);

router.post(
  "/checkout/:bookingId",
  authMiddleware,
  checkoutValidation,
  checkoutRateLimiter,
  createCheckoutSession,
);

router.get(
  "/status/:bookingId",
  authMiddleware,
  paymentStatusValidation,
  getPaymentStatus,
);

export default router;
