import { PASSPORT_VERIFICATION_STATUS } from "../../../constants/verificationStatus.js";
import { AppError } from "../../../utils/AppError.js";
import TouristProfile from "../models/touristProfileModel.js";
import { updateTouristVerificationStatus } from "./touristVerificationHelper.js";

export const submitTouristVerification = async (userId, verificationData) => {
  const touristProfile = await TouristProfile.findOne({ user: userId });
  if (!touristProfile) throw new AppError("Tourist profile not found", 404);

  touristProfile.passport = {
    secureUrl: verificationData.passport.secureUrl,
    publicId: verificationData.passport.publicId,
  };
  touristProfile.passportVerificationStatus =
    PASSPORT_VERIFICATION_STATUS.PENDING;
  touristProfile.verificationRejectionReason = null;

  updateTouristVerificationStatus(touristProfile);

  await touristProfile.save();

  return touristProfile;
};

export const getTouristVerificationStatus = async (userId) => {
  const touristProfile = await TouristProfile.findOne({ user: userId });
  if (!touristProfile) throw new AppError("Tourist profile not found", 404);

  return {
    passportVerificationStatus: touristProfile.passportVerificationStatus,
    verificationRejectionReason: touristProfile.verificationRejectionReason,
  };
};

export const resubmitTouristVerification = async (userId, verificationData) => {
  const touristProfile = await TouristProfile.findOne({ user: userId });
  if (!touristProfile) throw new AppError("Tourist profile not found", 404);

  if (
    touristProfile.passportVerificationStatus !==
    PASSPORT_VERIFICATION_STATUS.REJECTED
  ) {
    throw new AppError("Passport can only be resubmitted after rejection", 400);
  }

  touristProfile.passport = {
    secureUrl: verificationData.passport.secureUrl,
    publicId: verificationData.passport.publicId,
  };
  touristProfile.passportVerificationStatus =
    PASSPORT_VERIFICATION_STATUS.PENDING;
  touristProfile.verificationRejectionReason = null;

  updateTouristVerificationStatus(touristProfile);

  await touristProfile.save();

  return touristProfile;
};
