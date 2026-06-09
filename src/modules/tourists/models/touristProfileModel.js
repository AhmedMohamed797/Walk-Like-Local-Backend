import mongoose from "mongoose";
import { PASSPORT_VERIFICATION_STATUS_VALUES } from "../../../constants/verificationStatus.js";

const touristProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    profilePhoto: {
      secureUrl: {
        type: String,
        default: null,
      },
      publicId: {
        type: String,
        default: null,
      },
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

    nationality: {
      type: String,
      default: "",
    },

    preferredLanguages: [
      {
        type: String,
      },
    ],

    interests: [
      {
        type: String,
      },
    ],

    travelPreferences: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
  },
);

const TouristProfile = mongoose.model("TouristProfile", touristProfileSchema);

export default TouristProfile;