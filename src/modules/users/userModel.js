import mongoose from "mongoose";
import { AUTH_PROVIDER_VALUES } from "../../constants/authProviders.js";
import { ROLE_VALUES } from "../../constants/roles.js";
import { USER_STATUS_VALUES } from "../../constants/userStatus.js";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 25,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      minlength: 8,
      maxlength: 20,
    },

    role: {
      type: String,
      enum: ROLE_VALUES,
      required: true,
    },

    authProvider: {
      type: String,
      enum: AUTH_PROVIDER_VALUES,
      default: "LOCAL",
    },

    googleId: {
      type: String,
      default: null,
    },

    profilePicture: {
      type: String,
      default: null,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    emailVerificationToken: {
      type: String,
      default: null,
    },

    emailVerificationExpiresAt: {
      type: Date,
      default: null,
    },

    passwordResetCode: {
      type: String,
      default: null,
    },

    passwordResetCodeExpiresAt: {
      type: Date,
      default: null,
    },

    isResetCodeVerified: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: USER_STATUS_VALUES,
      default: "ACTIVE",
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.index({ email: 1 }, { unique: true });

const User = mongoose.model("User", userSchema);

export default User;
