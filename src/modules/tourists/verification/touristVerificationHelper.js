import { PASSPORT_VERIFICATION_STATUS } from "../../../constants/verificationStatus.js";

export const updateTouristVerificationStatus = (touristProfile) => {
  if (touristProfile.passportVerificationStatus === PASSPORT_VERIFICATION_STATUS.VERIFIED) {
    if (!touristProfile.passportVerifiedAt) {
      touristProfile.passportVerifiedAt = new Date();
    }
  }
};