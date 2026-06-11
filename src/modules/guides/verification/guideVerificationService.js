import GuideProfile from "../models/guideProfileModel.js";
import { AppError } from "../../../utils/AppError.js";
import { DOCUMENT_VERIFICATION_STATUS, GUIDE_DOCUMENT_FIELD_VALUES } from "../../../constants/verificationStatus.js";
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
    rejectedFields: guideProfile.verificationReview.rejectedFields,
    rejectionReason: guideProfile.verificationReview.rejectionReason,
    languages: guideProfile.languages,
    languageTests: guideProfile.languageTests.map((record) => ({
      language: record.language,
      status: record.status,
      score: record.score,
      attempts: record.attempts,
      maxAttempts: record.maxAttempts,
      lastTestDate: record.lastTestDate,
      feedback: record.feedback,
    })),
    accountVerificationStatus: guideProfile.accountVerificationStatus,
    verifiedLanguages: guideProfile.verifiedLanguages,
  };
};

export const resubmitVerificationDocuments = async (userId, verificationData) => {
  const guideProfile = await GuideProfile.findOne({ user: userId });
  if (!guideProfile) throw new AppError("Guide profile not found", 404);

  if (guideProfile.documentVerificationStatus !== DOCUMENT_VERIFICATION_STATUS.REJECTED) {
    throw new AppError("Documents can only be resubmitted after rejection", 400);
  }

  const rejectedFields = guideProfile.verificationReview.rejectedFields;

  if (!rejectedFields || rejectedFields.length === 0) {
    throw new AppError("No rejected fields found for resubmission", 400);
  }

  const submittedFields = GUIDE_DOCUMENT_FIELD_VALUES.filter(
    (field) => verificationData[field] !== undefined,
  );

  if (submittedFields.length === 0) {
    throw new AppError("At least one rejected document must be provided", 400);
  }

  const invalidFields = submittedFields.filter(
    (field) => !rejectedFields.includes(field),
  );

  if (invalidFields.length > 0) {
    throw new AppError(
      `Cannot resubmit approved documents: ${invalidFields.join(", ")}`,
      400,
    );
  }

  submittedFields.forEach((field) => {
    guideProfile[field] = {
      secureUrl: verificationData[field].secureUrl,
      publicId: verificationData[field].publicId,
    };
  });

  guideProfile.documentVerificationStatus = DOCUMENT_VERIFICATION_STATUS.PENDING;
  guideProfile.rejectionReason = null;
  guideProfile.verificationReview = {
    rejectedFields: [],
    rejectionReason: null,
    reviewedBy: null,
    reviewedAt: null,
  };

  updateGuideVerificationStatus(guideProfile);

  await guideProfile.save();

  return guideProfile;
};