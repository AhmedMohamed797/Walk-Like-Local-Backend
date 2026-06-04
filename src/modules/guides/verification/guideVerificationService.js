import GuideProfile from "../models/guideProfileModel.js";
import { AppError } from "../../../utils/AppError.js";
import { DOCUMENT_VERIFICATION_STATUS } from "../../../constants/verificationStatus.js";
import { updateGuideVerificationStatus } from "./guideVerificationHelper.js";

export const submitVerificationDocuments = async (userId, verificationData) => {
  const guideProfile = await GuideProfile.findOne({ user: userId });
  if (!guideProfile) throw new AppError("Guide profile not found", 404);

  guideProfile.nationalId = {
    secureUrl: verificationData.nationalId.secureUrl,
    publicId: verificationData.nationalId.publicId,
  };
  guideProfile.profilePhoto = {
    secureUrl: verificationData.profilePhoto.secureUrl,
    publicId: verificationData.profilePhoto.publicId,
  };
  guideProfile.tourismLicense = {
    secureUrl: verificationData.tourismLicense.secureUrl,
    publicId: verificationData.tourismLicense.publicId,
  };
  guideProfile.introductionVideo = {
    secureUrl: verificationData.introductionVideo.secureUrl,
    publicId: verificationData.introductionVideo.publicId,
  };
  guideProfile.nationality = verificationData.nationality;
  guideProfile.documentVerificationStatus = DOCUMENT_VERIFICATION_STATUS.PENDING;
  guideProfile.rejectionReason = null;

  updateGuideVerificationStatus(guideProfile);

  await guideProfile.save();

  return guideProfile;
};

export const getVerificationStatus = async (userId) => {
  const guideProfile = await GuideProfile.findOne({ user: userId });
  if (!guideProfile) throw new AppError("Guide profile not found", 404);

  return {
    documentVerificationStatus: guideProfile.documentVerificationStatus,
    languageTestStatus: guideProfile.languageTestStatus,
    accountVerificationStatus: guideProfile.accountVerificationStatus,
    verifiedLanguages: guideProfile.verifiedLanguages,
    rejectionReason: guideProfile.rejectionReason,
  };
};

export const resubmitVerificationDocuments = async (userId, verificationData) => {
  const guideProfile = await GuideProfile.findOne({ user: userId });
  if (!guideProfile) throw new AppError("Guide profile not found", 404);

  if (guideProfile.documentVerificationStatus !== DOCUMENT_VERIFICATION_STATUS.REJECTED) {
    throw new AppError("Documents can only be resubmitted after rejection", 400);
  }

  guideProfile.nationalId = {
    secureUrl: verificationData.nationalId.secureUrl,
    publicId: verificationData.nationalId.publicId,
  };
  guideProfile.profilePhoto = {
    secureUrl: verificationData.profilePhoto.secureUrl,
    publicId: verificationData.profilePhoto.publicId,
  };
  guideProfile.tourismLicense = {
    secureUrl: verificationData.tourismLicense.secureUrl,
    publicId: verificationData.tourismLicense.publicId,
  };
  guideProfile.introductionVideo = {
    secureUrl: verificationData.introductionVideo.secureUrl,
    publicId: verificationData.introductionVideo.publicId,
  };
  guideProfile.nationality = verificationData.nationality;
  guideProfile.documentVerificationStatus = DOCUMENT_VERIFICATION_STATUS.PENDING;
  guideProfile.rejectionReason = null;

  updateGuideVerificationStatus(guideProfile);

  await guideProfile.save();

  return guideProfile;
};