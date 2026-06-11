import GuideProfile from "../../guides/models/guideProfileModel.js";
import TouristProfile from "../../tourists/models/touristProfileModel.js";
import { AppError } from "../../../utils/AppError.js";
import { DOCUMENT_VERIFICATION_STATUS, PASSPORT_VERIFICATION_STATUS } from "../../../constants/verificationStatus.js";
import { updateGuideVerificationStatus } from "../../guides/verification/guideVerificationHelper.js";
import { updateTouristVerificationStatus } from "../../tourists/verification/touristVerificationHelper.js";

export const getPendingGuideVerifications = async (page = 1, limit = 10) => {
  const skip = (page - 1) * limit;

  const filter = { documentVerificationStatus: DOCUMENT_VERIFICATION_STATUS.PENDING };

  const totalResults = await GuideProfile.countDocuments(filter);
  const guides = await GuideProfile.find(filter)
    .populate("user", "fullName email role")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return {
    results: guides,
    pagination: {
      totalResults,
      totalPages: Math.ceil(totalResults / limit),
      currentPage: page,
      resultsPerPage: limit,
    },
  };
};

export const getGuideVerificationDetails = async (guideId) => {
  const guideProfile = await GuideProfile.findOne({ user: guideId }).populate(
    "user",
    "fullName email role",
  );
  if (!guideProfile) throw new AppError("Guide profile not found", 404);

  return guideProfile;
};

export const approveGuideDocuments = async (guideId, adminId) => {
  const guideProfile = await GuideProfile.findOne({ user: guideId });
  if (!guideProfile) throw new AppError("Guide profile not found", 404);

  if (guideProfile.documentVerificationStatus !== DOCUMENT_VERIFICATION_STATUS.PENDING) {
    throw new AppError("Guide documents are not pending review", 400);
  }

  guideProfile.documentVerificationStatus = DOCUMENT_VERIFICATION_STATUS.VERIFIED;
  guideProfile.rejectionReason = null;
  guideProfile.verificationReview = {
    rejectedFields: [],
    rejectionReason: null,
    reviewedBy: adminId,
    reviewedAt: new Date(),
  };

  updateGuideVerificationStatus(guideProfile);

  await guideProfile.save();
  return guideProfile;
};

export const rejectGuideDocuments = async (guideId, reason, rejectedFields, adminId) => {
  const guideProfile = await GuideProfile.findOne({ user: guideId });
  if (!guideProfile) throw new AppError("Guide profile not found", 404);

  if (guideProfile.documentVerificationStatus !== DOCUMENT_VERIFICATION_STATUS.PENDING) {
    throw new AppError("Guide documents are not pending review", 400);
  }

  guideProfile.documentVerificationStatus = DOCUMENT_VERIFICATION_STATUS.REJECTED;
  guideProfile.rejectionReason = reason;
  guideProfile.verificationReview = {
    rejectedFields,
    rejectionReason: reason,
    reviewedBy: adminId,
    reviewedAt: new Date(),
  };

  updateGuideVerificationStatus(guideProfile);

  await guideProfile.save();
  return guideProfile;
};

export const getPendingTouristVerifications = async (page = 1, limit = 10) => {
  const skip = (page - 1) * limit;

  const filter = { passportVerificationStatus: PASSPORT_VERIFICATION_STATUS.PENDING };

  const totalResults = await TouristProfile.countDocuments(filter);
  const tourists = await TouristProfile.find(filter)
    .populate("user", "fullName email role")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return {
    results: tourists,
    pagination: {
      totalResults,
      totalPages: Math.ceil(totalResults / limit),
      currentPage: page,
      resultsPerPage: limit,
    },
  };
};

export const getTouristVerificationDetails = async (touristId) => {
  const touristProfile = await TouristProfile.findOne({ user: touristId }).populate(
    "user",
    "fullName email role",
  );
  if (!touristProfile) throw new AppError("Tourist profile not found", 404);

  return touristProfile;
};

export const approveTouristPassport = async (touristId) => {
  const touristProfile = await TouristProfile.findOne({ user: touristId });
  if (!touristProfile) throw new AppError("Tourist profile not found", 404);

  if (touristProfile.passportVerificationStatus !== PASSPORT_VERIFICATION_STATUS.PENDING) {
    throw new AppError("Tourist passport is not pending review", 400);
  }

  touristProfile.passportVerificationStatus = PASSPORT_VERIFICATION_STATUS.VERIFIED;
  touristProfile.verificationRejectionReason = null;

  updateTouristVerificationStatus(touristProfile);

  await touristProfile.save();
  return touristProfile;
};

export const rejectTouristPassport = async (touristId, reason) => {
  const touristProfile = await TouristProfile.findOne({ user: touristId });
  if (!touristProfile) throw new AppError("Tourist profile not found", 404);

  if (touristProfile.passportVerificationStatus !== PASSPORT_VERIFICATION_STATUS.PENDING) {
    throw new AppError("Tourist passport is not pending review", 400);
  }

  touristProfile.passportVerificationStatus = PASSPORT_VERIFICATION_STATUS.REJECTED;
  touristProfile.verificationRejectionReason = reason;

  await touristProfile.save();
  return touristProfile;
};