import mongoose from "mongoose";
import { REVIEW_LIMITS } from "../../../constants/reviewConstants.js";

const guideReviewSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      unique: true,
      index: true,
    },
    touristId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    guideId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tourId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tour",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: REVIEW_LIMITS.MIN_RATING,
      max: REVIEW_LIMITS.MAX_RATING,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: REVIEW_LIMITS.MAX_COMMENT_LENGTH,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

guideReviewSchema.index({ guideId: 1, createdAt: -1 });
guideReviewSchema.index({ touristId: 1, createdAt: -1 });

const GuideReview = mongoose.model("GuideReview", guideReviewSchema);

export default GuideReview;
