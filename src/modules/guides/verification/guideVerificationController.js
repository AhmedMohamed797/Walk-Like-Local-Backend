import * as guideVerificationService from "./guideVerificationService.js";
import { asyncHandler } from "../../../middlewares/error.middleware.js";
import { ROLES } from "../../../constants/roles.js";

export const submitVerificationDocuments = asyncHandler(async (req, res) => {
  if (req.user.role !== ROLES.GUIDE) {
    return res.status(403).json({
      success: false,
      message: "Only guides can submit verification documents",
    });
  }

  const guideProfile = await guideVerificationService.submitVerificationDocuments(
    req.user._id,
    req.body,
  );

  return res.status(201).json({
    success: true,
    message: "Verification documents submitted successfully",
    data: {
      documentVerificationStatus: guideProfile.documentVerificationStatus,
      accountVerificationStatus: guideProfile.accountVerificationStatus,
    },
  });
});

export const getVerificationStatus = asyncHandler(async (req, res) => {
  if (req.user.role !== ROLES.GUIDE) {
    return res.status(403).json({
      success: false,
      message: "Only guides can view verification status",
    });
  }

  const data = await guideVerificationService.getVerificationStatus(req.user._id);

  return res.json({
    success: true,
    data,
  });
});

export const resubmitVerificationDocuments = asyncHandler(async (req, res) => {
  if (req.user.role !== ROLES.GUIDE) {
    return res.status(403).json({
      success: false,
      message: "Only guides can resubmit verification documents",
    });
  }

  const guideProfile = await guideVerificationService.resubmitVerificationDocuments(
    req.user._id,
    req.body,
  );

  return res.json({
    success: true,
    message: "Verification documents resubmitted successfully",
    data: {
      documentVerificationStatus: guideProfile.documentVerificationStatus,
      accountVerificationStatus: guideProfile.accountVerificationStatus,
    },
  });
});