import mongoose from "mongoose";
import { TOUR_STATUS_VALUES } from "../../../constants/tourConstants.js";

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

const pricingSchema = new mongoose.Schema(
  {
    PRIVATE: {
      type: Number,
      required: true,
      min: 0,
    },
    SMALL_GROUP: {
      type: Number,
      required: true,
      min: 0,
    },
    LARGE_GROUP: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false },
);

const activityPricingSchema = new mongoose.Schema(
  {
    PRIVATE: {
      type: Number,
      required: true,
      min: 0,
    },
    SMALL_GROUP: {
      type: Number,
      required: true,
      min: 0,
    },
    LARGE_GROUP: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false },
);

const activitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    pricing: {
      type: activityPricingSchema,
      required: true,
    },
    removable: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true },
);

const slotSchema = new mongoose.Schema(
  {
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
    isBooked: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true },
);

const tourSchema = new mongoose.Schema(
  {
    guideId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    destination: {
      type: String,
      required: true,
      trim: true,
    },

    meetingPoint: {
      type: String,
      trim: true,
      default: "",
    },

    duration: {
      type: String,
      required: true,
      trim: true,
    },

    pricing: {
      type: pricingSchema,
      required: true,
    },

    activities: {
      type: [activitySchema],
      default: [],
    },

    slots: {
      type: [slotSchema],
      default: [],
    },

    coverImage: {
      type: cloudinaryMediaSchema,
      required: true,
    },

    galleryImages: {
      type: [cloudinaryMediaSchema],
      default: [],
    },

    status: {
      type: String,
      enum: TOUR_STATUS_VALUES,
      default: "INACTIVE",
    },
  },
  {
    timestamps: true,
  },
);

tourSchema.index({ status: 1 });
tourSchema.index({ destination: 1 });
tourSchema.index({ createdAt: -1 });
tourSchema.index({ guideId: 1 });
tourSchema.index({
  title: "text",
  description: "text",
  destination: "text",
  meetingPoint: "text",
});

const Tour = mongoose.model("Tour", tourSchema);

export default Tour;
