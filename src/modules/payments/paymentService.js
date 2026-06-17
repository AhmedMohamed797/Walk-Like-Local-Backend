import Booking from "../bookings/models/bookingModel.js";
import Payment from "./models/paymentModel.js";
import stripe from "../../config/stripe.js";
import { AppError } from "../../utils/AppError.js";
import { ROLES } from "../../constants/roles.js";
import { BOOKING_STATUS } from "../../constants/bookingConstants.js";
import { PAYMENT_STATUS, PAYMENT_DEFAULTS } from "../../constants/paymentConstants.js";
import { markCouponAsUsed } from "../bookings/bookingHelper.js";

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

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError("Booking not found", 404);
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
