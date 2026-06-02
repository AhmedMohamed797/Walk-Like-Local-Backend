import mongoose from "mongoose";
import { VERIFICATION_STATUS_VALUES } from "../../constants/verificationStatus.js";

const guideProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    verificationStatus: {
      type: String,
      enum: VERIFICATION_STATUS_VALUES,
      default: "PENDING",
    },

    bio: {
      type: String,
      default: "",
    },

    interests: [
      {
        type: String,
      },
    ],

    languages: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
  },
);

guideProfileSchema.index({ user: 1 }, { unique: true });

const GuideProfile = mongoose.model("GuideProfile", guideProfileSchema);

export default GuideProfile;
