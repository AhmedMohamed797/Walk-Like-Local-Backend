import * as paymentService from "./paymentService.js";
import { asyncHandler } from "../../middlewares/error.middleware.js";
import { ROLES } from "../../constants/roles.js";
import config from "../../config/env.js";
import stripe from "../../config/stripe.js";

export const createCheckoutSession = asyncHandler(async (req, res) => {
  if (req.user.role !== ROLES.TOURIST) {
    return res.status(403).json({
      success: false,
      message: "Only tourists can initiate payments",
    });
  }

  const result = await paymentService.createCheckoutSession(req.user._id, req.params.bookingId);

  return res.json({
    success: true,
    data: result,
  });
});

export const handleSuccessRedirect = asyncHandler(async (req, res) => {
  const sessionId = req.query.session_id;
  if (!sessionId) {
    return res.redirect(`${config.frontendUrl}/payment/cancel`);
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status === "paid") {
      return res.redirect(`${config.frontendUrl}/payment/success?session_id=${sessionId}`);
    }
    return res.redirect(`${config.frontendUrl}/payment/cancel`);
  } catch {
    return res.redirect(`${config.frontendUrl}/payment/cancel`);
  }
});

export const handleCancelRedirect = asyncHandler(async (req, res) => {
  const bookingId = req.query.booking_id;
  return res.redirect(`${config.frontendUrl}/payment/cancel${bookingId ? `?booking_id=${bookingId}` : ""}`);
});
