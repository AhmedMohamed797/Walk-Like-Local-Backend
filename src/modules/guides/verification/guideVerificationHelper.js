import { DOCUMENT_VERIFICATION_STATUS, LANGUAGE_TEST_STATUS, ACCOUNT_VERIFICATION_STATUS } from "../../../constants/verificationStatus.js";

export const updateGuideVerificationStatus = (guideProfile) => {
  if (
    guideProfile.documentVerificationStatus === DOCUMENT_VERIFICATION_STATUS.VERIFIED &&
    guideProfile.languageTestStatus === LANGUAGE_TEST_STATUS.PASSED
  ) {
    guideProfile.accountVerificationStatus = ACCOUNT_VERIFICATION_STATUS.VERIFIED;

    if (!guideProfile.verifiedAt) {
      guideProfile.verifiedAt = new Date();
    }
  } else {
    guideProfile.accountVerificationStatus = ACCOUNT_VERIFICATION_STATUS.PENDING;
  }
};