import * as adminVerificationService from "./adminVerificationService.js";
import { asyncHandler } from "../../../middlewares/error.middleware.js";
import { ROLES } from "../../../constants/roles.js";

export const getPendingGuideVerifications = asyncHandler(async (req, res) => {
  if (req.user.role !== ROLES.ADMIN) {
    return res.status(403).json({
      success: false,
      message: "Only admins can access this endpoint",
    });
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const { results, pagination } = await adminVerificationService.getPendingGuideVerifications(page, limit);

  return res.json({
    success: true,
    data: results,
    pagination,
  });
});

export const getGuideVerificationDetails = asyncHandler(async (req, res) => {
  if (req.user.role !== ROLES.ADMIN) {
    return res.status(403).json({
      success: false,
      message: "Only admins can access this endpoint",
    });
  }

  const guideProfile = await adminVerificationService.getGuideVerificationDetails(req.params.guideId);

  return res.json({
    success: true,
    data: {
      user: {
        id: guideProfile.user._id,
        fullName: guideProfile.user.fullName,
        email: guideProfile.user.email,
      },
      nationality: guideProfile.nationality,
      nationalId: guideProfile.nationalId,
      profilePhoto: guideProfile.profilePhoto,
      tourismLicense: guideProfile.tourismLicense,
      introductionVideo: guideProfile.introductionVideo,
      documentVerificationStatus: guideProfile.documentVerificationStatus,
      languageTests: guideProfile.languageTests,
      accountVerificationStatus: guideProfile.accountVerificationStatus,
      verifiedLanguages: guideProfile.verifiedLanguages,
      rejectionReason: guideProfile.rejectionReason,
      verificationReview: guideProfile.verificationReview,
      verifiedAt: guideProfile.verifiedAt,
    },
  });
});

export const approveGuideDocuments = asyncHandler(async (req, res) => {
  if (req.user.role !== ROLES.ADMIN) {
    return res.status(403).json({
      success: false,
      message: "Only admins can access this endpoint",
    });
  }

  await adminVerificationService.approveGuideDocuments(req.params.guideId, req.user._id);

  return res.json({
    success: true,
    message: "Guide documents approved successfully",
  });
});

export const rejectGuideDocuments = asyncHandler(async (req, res) => {
  if (req.user.role !== ROLES.ADMIN) {
    return res.status(403).json({
      success: false,
      message: "Only admins can access this endpoint",
    });
  }

  await adminVerificationService.rejectGuideDocuments(req.params.guideId, req.body.reason, req.body.rejectedFields, req.user._id);

  return res.json({
    success: true,
    message: "Guide documents rejected successfully",
  });
});

export const getPendingTouristVerifications = asyncHandler(async (req, res) => {
  if (req.user.role !== ROLES.ADMIN) {
    return res.status(403).json({
      success: false,
      message: "Only admins can access this endpoint",
    });
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const { results, pagination } = await adminVerificationService.getPendingTouristVerifications(page, limit);

  return res.json({
    success: true,
    data: results,
    pagination,
  });
});

export const getTouristVerificationDetails = asyncHandler(async (req, res) => {
  if (req.user.role !== ROLES.ADMIN) {
    return res.status(403).json({
      success: false,
      message: "Only admins can access this endpoint",
    });
  }

  const touristProfile = await adminVerificationService.getTouristVerificationDetails(req.params.touristId);

  return res.json({
    success: true,
    data: {
      user: {
        id: touristProfile.user._id,
        fullName: touristProfile.user.fullName,
        email: touristProfile.user.email,
      },
      nationality: touristProfile.nationality,
      profilePhoto: touristProfile.profilePhoto,
      passport: touristProfile.passport,
      passportVerificationStatus: touristProfile.passportVerificationStatus,
      verificationRejectionReason: touristProfile.verificationRejectionReason,
      passportVerifiedAt: touristProfile.passportVerifiedAt,
    },
  });
});

export const approveTouristPassport = asyncHandler(async (req, res) => {
  if (req.user.role !== ROLES.ADMIN) {
    return res.status(403).json({
      success: false,
      message: "Only admins can access this endpoint",
    });
  }

  await adminVerificationService.approveTouristPassport(req.params.touristId);

  return res.json({
    success: true,
    message: "Tourist passport approved successfully",
  });
});

export const rejectTouristPassport = asyncHandler(async (req, res) => {
  if (req.user.role !== ROLES.ADMIN) {
    return res.status(403).json({
      success: false,
      message: "Only admins can access this endpoint",
    });
  }

  await adminVerificationService.rejectTouristPassport(req.params.touristId, req.body.reason);

  return res.json({
    success: true,
    message: "Tourist passport rejected successfully",
  });
});