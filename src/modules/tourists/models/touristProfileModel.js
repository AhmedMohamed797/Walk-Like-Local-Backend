import mongoose from "mongoose";
import { PASSPORT_VERIFICATION_STATUS_VALUES } from "../../../constants/verificationStatus.js";

const touristProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    passport: {
      secureUrl: String,
      publicId: String,
    },

    passportVerificationStatus: {
      type: String,
      enum: PASSPORT_VERIFICATION_STATUS_VALUES,
      default: "NOT_SUBMITTED",
    },

    verificationRejectionReason: {
      type: String,
      default: null,
    },

    passportVerifiedAt: {
      type: Date,
      default: null,
    },

    interests: [
      {
        type: String,
      },
    ],

    preferredLanguages: [
      {
        type: String,
      },
    ],

    nationality: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

const TouristProfile = mongoose.model("TouristProfile", touristProfileSchema);

export default TouristProfile;