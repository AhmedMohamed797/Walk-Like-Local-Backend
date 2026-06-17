import { Router } from "express";
import { authMiddleware } from "../auth/authMiddleware.js";
import { createCheckoutSession } from "../payments/paymentController.js";
import { checkoutValidation } from "../payments/paymentValidation.js";

const router = Router();

router.post(
  "/checkout/:bookingId",
  authMiddleware,
  checkoutValidation,
  createCheckoutSession,
);

export default router;
