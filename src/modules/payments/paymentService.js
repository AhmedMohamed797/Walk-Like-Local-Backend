import Booking from "../bookings/models/bookingModel.js";
import Payment from "./models/paymentModel.js";
import User from "../users/userModel.js";
import stripe from "../../config/stripe.js";
import logger from "../../utils/logger.js";
import { AppError } from "../../utils/AppError.js";
import { ROLES } from "../../constants/roles.js";
import { BOOKING_STATUS } from "../../constants/bookingConstants.js";
import { PAYMENT_STATUS, PAYMENT_DEFAULTS } from "../../constants/paymentConstants.js";
import { markCouponAsUsed } from "../bookings/bookingHelper.js";
import { sendPaymentConfirmationEmail } from "./emailService.js";

export const createCheckoutSession = async (touristId, bookingId) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError("Booking not found", 404);
  }

  if (booking.touristId.toString() !== touristId.toString()) {
    throw new AppError("You are not authorized to pay for this booking", 403);
  }

  if (booking.status !== BOOKING_STATUS.PENDING_PAYMENT) {
    throw new AppError("Booking is not in PENDING_PAYMENT status", 400);
  }

  if (booking.paymentExpiresAt < new Date()) {
    throw new AppError("Booking payment window has expired", 400);
  }

  if (!booking.pricing || !booking.pricing.totalPrice) {
    throw new AppError("Booking pricing information is missing", 400);
  }

  const existingPayment = await Payment.findOne({
    bookingId: booking._id,
    status: PAYMENT_STATUS.PENDING,
  });

  if (existingPayment) {
    try {
      const existingSession = await stripe.checkout.sessions.retrieve(existingPayment.stripeSessionId);
      if (existingSession.status === "open") {
        return { checkoutUrl: existingSession.url };
      }
    } catch {
      await Payment.deleteOne({ _id: existingPayment._id });
    }
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: PAYMENT_DEFAULTS.CURRENCY,
          unit_amount: Math.round(booking.pricing.totalPrice * 100),
          product_data: {
            name: `Tour: ${booking.tourTitle}`,
            description: `Booking for ${booking.destination} - ${booking.groupType} group (${booking.groupSize} people)`,
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${process.env.API_BASE_URL}/api/v1/payments/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.API_BASE_URL}/api/v1/payments/cancel?booking_id=${booking._id}`,
    metadata: {
      bookingId: booking._id.toString(),
      touristId: touristId.toString(),
    },
    expires_at: Math.floor(Math.max(booking.paymentExpiresAt.getTime(), Date.now() + 30 * 60 * 1000) / 1000),
  });

  const payment = await Payment.create({
    bookingId: booking._id,
    touristId,
    amount: booking.pricing.totalPrice,
    currency: PAYMENT_DEFAULTS.CURRENCY,
    stripeSessionId: session.id,
    status: PAYMENT_STATUS.PENDING,
  });

  booking.paymentId = payment._id;
  await booking.save();

  return { checkoutUrl: session.url };
};

export const handleCheckoutSessionCompleted = async (session) => {
  const { bookingId } = session.metadata;

  const payment = await Payment.findOne({ stripeSessionId: session.id });
  if (!payment) {
    throw new AppError("Payment not found for this session", 404);
  }

  if (payment.status === PAYMENT_STATUS.PAID) {
    logger.info(`Payment ${payment._id} already processed, skipping duplicate`);
    const booking = await Booking.findById(bookingId);
    return { payment, booking };
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError("Booking not found", 404);
  }

  if (booking.status === BOOKING_STATUS.ACTIVE) {
    logger.info(`Booking ${booking._id} already active, skipping duplicate processing`);
    payment.status = PAYMENT_STATUS.PAID;
    payment.paidAt = payment.paidAt || new Date();
    payment.stripePaymentIntentId = session.payment_intent;
    await payment.save();
    return { payment, booking };
  }

  payment.status = PAYMENT_STATUS.PAID;
  payment.paidAt = new Date();
  payment.stripePaymentIntentId = session.payment_intent;
  await payment.save();

  booking.status = BOOKING_STATUS.ACTIVE;
  await booking.save();

  if (booking.appliedCouponId) {
    await markCouponAsUsed(booking.appliedCouponId);
  }

  const tourist = await User.findById(booking.touristId);
  if (tourist) {
    await sendPaymentConfirmationEmail(tourist.email, booking, payment);
  }

  return { payment, booking };
};

export const handlePaymentIntentFailed = async (paymentIntent) => {
  const payment = await Payment.findOne({ stripePaymentIntentId: paymentIntent.id });
  if (!payment) {
    return;
  }

  payment.status = PAYMENT_STATUS.FAILED;
  await payment.save();
};

export const getPaymentStatus = async (touristId, bookingId) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError("Booking not found", 404);
  }

  if (booking.touristId.toString() !== touristId.toString()) {
    throw new AppError("You are not authorized to view this payment status", 403);
  }

  const payment = await Payment.findOne({ bookingId: booking._id });
  if (!payment) {
    throw new AppError("Payment not found for this booking", 404);
  }

  return {
    bookingStatus: booking.status,
    paymentStatus: payment.status,
    stripeSessionId: payment.stripeSessionId,
    paymentIntentId: payment.stripePaymentIntentId,
    paidAt: payment.paidAt,
  };
};

export const expirePendingPayments = async () => {
  const expiredPayments = await Payment.find({
    status: PAYMENT_STATUS.PENDING,
  });

  for (const payment of expiredPayments) {
    const booking = await Booking.findById(payment.bookingId);
    if (!booking || booking.status !== BOOKING_STATUS.PENDING_PAYMENT) {
      payment.status = PAYMENT_STATUS.FAILED;
      await payment.save();
    }
  }
};

export const processRefund = async (bookingId, refundAmount, isFullRefund = false) => {
  const payment = await Payment.findOne({ bookingId, status: PAYMENT_STATUS.PAID });

  if (!payment) {
    logger.warn(`No PAID payment found for booking ${bookingId}, skipping Stripe refund`);
    return { refundProcessed: false, reason: "NO_PAID_PAYMENT" };
  }

  if (!payment.stripePaymentIntentId) {
    logger.warn(`Payment ${payment._id} has no stripePaymentIntentId, skipping Stripe refund`);
    return { refundProcessed: false, reason: "NO_PAYMENT_INTENT" };
  }

  if (payment.status === PAYMENT_STATUS.REFUNDED) {
    logger.info(`Payment ${payment._id} already refunded, skipping duplicate refund`);
    return { refundProcessed: false, reason: "ALREADY_REFUNDED" };
  }

  try {
    const refundParams = {
      payment_intent: payment.stripePaymentIntentId,
    };

    if (!isFullRefund && refundAmount > 0) {
      refundParams.amount = Math.round(refundAmount * 100);
    }

    await stripe.refunds.create(refundParams);

    payment.status = PAYMENT_STATUS.REFUNDED;
    payment.refundedAt = new Date();
    await payment.save();

    logger.info(`Stripe refund processed for payment ${payment._id}, amount: ${isFullRefund ? "full" : refundAmount}`);
    return { refundProcessed: true, payment };
  } catch (err) {
    logger.error(`Stripe refund failed for payment ${payment._id}: ${err.message}`);
    payment.refundNeedsReview = true;
    await payment.save();
    return { refundProcessed: false, reason: "STRIPE_REFUND_FAILED", error: err.message };
  }
};
