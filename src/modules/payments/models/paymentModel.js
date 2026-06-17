import mongoose from "mongoose";
import { PAYMENT_STATUS_VALUES } from "../../../constants/paymentConstants.js";

const paymentSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },
    touristId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "usd",
      trim: true,
    },
    stripeSessionId: {
      type: String,
      default: null,
    },
    stripePaymentIntentId: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: PAYMENT_STATUS_VALUES,
      default: "PENDING",
      index: true,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    refundedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

paymentSchema.index({ touristId: 1, status: 1 });
paymentSchema.index({ stripeSessionId: 1 });

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
