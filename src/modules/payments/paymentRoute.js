import { Router } from "express";
import { authMiddleware } from "../auth/authMiddleware.js";
import { createCheckoutSession, handleSuccessRedirect, handleCancelRedirect } from "../payments/paymentController.js";
import { checkoutValidation } from "../payments/paymentValidation.js";

const router = Router();

router.get("/success", handleSuccessRedirect);
router.get("/cancel", handleCancelRedirect);

router.post(
  "/checkout/:bookingId",
  authMiddleware,
  checkoutValidation,
  createCheckoutSession,
);

export default router;
