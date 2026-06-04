import mongoose from "mongoose";
import { VERIFICATION_STATUS_VALUES } from "../../../constants/verificationStatus.js";
import { DOCUMENT_VERIFICATION_STATUS_VALUES, LANGUAGE_TEST_STATUS_VALUES, ACCOUNT_VERIFICATION_STATUS_VALUES } from "../../../constants/verificationStatus.js";

const guideProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
      unique: true,
    },

    verificationStatus: {
      type: String,
      enum: VERIFICATION_STATUS_VALUES,
      default: "PENDING",
    },

    documentVerificationStatus: {
      type: String,
      enum: DOCUMENT_VERIFICATION_STATUS_VALUES,
      default: "NOT_SUBMITTED",
    },

    languageTestStatus: {
      type: String,
      enum: LANGUAGE_TEST_STATUS_VALUES,
      default: "NOT_STARTED",
    },

    accountVerificationStatus: {
      type: String,
      enum: ACCOUNT_VERIFICATION_STATUS_VALUES,
      default: "PENDING",
    },

    verifiedLanguages: [
      {
        type: String,
        trim: true,
      },
    ],

    rejectionReason: {
      type: String,
      default: null,
    },

    verifiedAt: {
      type: Date,
      default: null,
    },

    nationality: {
      type: String,
      trim: true,
    },

    nationalId: {
      secureUrl: String,
      publicId: String,
    },

    profilePhoto: {
      secureUrl: String,
      publicId: String,
    },

    tourismLicense: {
      secureUrl: String,
      publicId: String,
    },

    introductionVideo: {
      secureUrl: String,
      publicId: String,
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

const GuideProfile = mongoose.model("GuideProfile", guideProfileSchema);

export default GuideProfile;