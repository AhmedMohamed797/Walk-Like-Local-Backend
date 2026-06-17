import mongoose from "mongoose";
import { BOOKING_STATUS_VALUES } from "../../../constants/bookingConstants.js";
import { SUPPORTED_GROUP_TYPE_VALUES } from "../../../constants/tourConstants.js";

const cloudinaryMediaSchema = new mongoose.Schema(
  {
    secureUrl: {
      type: String,
      required: true,
      trim: true,
    },
    publicId: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false },
);

const memberSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    idDocument: {
      type: cloudinaryMediaSchema,
      required: true,
    },
  },
  { _id: false },
);

const selectedActivitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    pricePerGroup: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false },
);

const pricingSnapshotSchema = new mongoose.Schema(
  {
    tourBasePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    activitiesTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discountPercentage: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    platformFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    guideEarnings: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false },
);

const cancellationSchema = new mongoose.Schema(
  {
    cancelledBy: {
      type: String,
      enum: ["TOURIST", "GUIDE"],
    },
    cancelledAt: Date,
    reason: {
      type: String,
      trim: true,
    },
    refundPercentage: {
      type: Number,
      min: 0,
      max: 100,
    },
    refundAmount: {
      type: Number,
      min: 0,
    },
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
    },
  },
  { _id: false },
);

const bookingSchema = new mongoose.Schema(
  {
    tourId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tour",
      required: true,
      index: true,
    },
    guideId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    touristId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tourTitle: {
      type: String,
      required: true,
      trim: true,
    },
    destination: {
      type: String,
      required: true,
      trim: true,
    },
    slot: {
      slotId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
      },
      date: {
        type: Date,
        required: true,
      },
      startTime: {
        type: String,
        required: true,
        trim: true,
      },
      endTime: {
        type: String,
        required: true,
        trim: true,
      },
    },
    groupType: {
      type: String,
      enum: SUPPORTED_GROUP_TYPE_VALUES,
      required: true,
    },
    groupSize: {
      type: Number,
      required: true,
      min: 1,
      max: 8,
    },
    members: {
      type: [memberSchema],
      default: [],
    },
    selectedActivities: {
      type: [selectedActivitySchema],
      default: [],
    },
    pricing: {
      type: pricingSnapshotSchema,
      required: true,
    },
    appliedCouponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      default: null,
    },
    status: {
      type: String,
      enum: BOOKING_STATUS_VALUES,
      default: "PENDING_PAYMENT",
      index: true,
    },
    paymentExpiresAt: {
      type: Date,
      required: true,
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    cancellation: {
      type: cancellationSchema,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

bookingSchema.index({ touristId: 1, status: 1 });
bookingSchema.index({ guideId: 1, status: 1 });
bookingSchema.index({ "slot.date": 1 });
bookingSchema.index({ status: 1, paymentExpiresAt: 1 });
bookingSchema.index({ tourTitle: "text", destination: "text" });

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;
