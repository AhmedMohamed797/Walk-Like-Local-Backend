import mongoose from "mongoose";
import { VERIFICATION_STATUS_VALUES } from "../../../constants/verificationStatus.js";
import {
  DOCUMENT_VERIFICATION_STATUS_VALUES,
  LANGUAGE_TEST_STATUS_VALUES,
  ACCOUNT_VERIFICATION_STATUS_VALUES,
} from "../../../constants/verificationStatus.js";
import { LANGUAGE_TEST_CONFIG } from "../../../constants/languageTestConstants.js";
import { GUIDE_DOCUMENT_FIELD_VALUES } from "../../../constants/verificationStatus.js";

const languageTestRecordSchema = new mongoose.Schema(
  {
    language: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: LANGUAGE_TEST_STATUS_VALUES,
      default: "NOT_STARTED",
    },
    score: {
      type: Number,
      default: null,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: LANGUAGE_TEST_CONFIG.MAX_ATTEMPTS_PER_LANGUAGE,
    },
    lastTestDate: {
      type: Date,
      default: null,
    },
    feedback: {
      type: String,
      default: null,
    },
  },
  { _id: true },
);

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

    languageTests: {
      type: [languageTestRecordSchema],
      default: [],
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

    verificationReview: {
      rejectedFields: {
        type: [String],
        enum: GUIDE_DOCUMENT_FIELD_VALUES,
        default: [],
      },
      rejectionReason: {
        type: String,
        default: null,
      },
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      reviewedAt: {
        type: Date,
        default: null,
      },
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

    experience: {
      year: {
        type: String,
        default: "",
        trim: true,
      },
      photo: {
        secureUrl: String,
        publicId: String,
      },
    },

    languages: [
      {
        type: String,
        trim: true,
      },
    ],

    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    payoutProfile: {
      stripeAccountId: {
        type: String,
        default: null,
      },
      isPayoutReady: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
  },
);

const GuideProfile = mongoose.model("GuideProfile", guideProfileSchema);

export default GuideProfile;