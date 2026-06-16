import mongoose from "mongoose";
import { COUPON_STATUS_VALUES } from "../../../constants/bookingConstants.js";

const couponSchema = new mongoose.Schema(
  {
    touristId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    discountPercentage: {
      type: Number,
      default: 10,
      min: 0,
      max: 100,
    },
    reason: {
      type: String,
      default: "GUIDE_CANCELLATION",
      trim: true,
    },
    sourceBookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    status: {
      type: String,
      enum: COUPON_STATUS_VALUES,
      default: "AVAILABLE",
      index: true,
    },
    appliedBookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

couponSchema.index({ touristId: 1, status: 1 });
couponSchema.index({ code: 1, touristId: 1 });

const Coupon = mongoose.model("Coupon", couponSchema);

export default Coupon;
