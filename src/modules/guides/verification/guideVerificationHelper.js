import {
  DOCUMENT_VERIFICATION_STATUS,
  ACCOUNT_VERIFICATION_STATUS,
} from "../../../constants/verificationStatus.js";
import { hasPassedAllRequiredLanguageTests } from "../languageTest/languageTestHelper.js";

export const updateGuideVerificationStatus = (guideProfile) => {
  if (
    guideProfile.documentVerificationStatus === DOCUMENT_VERIFICATION_STATUS.VERIFIED &&
    hasPassedAllRequiredLanguageTests(guideProfile)
  ) {
    guideProfile.accountVerificationStatus = ACCOUNT_VERIFICATION_STATUS.VERIFIED;

    if (!guideProfile.verifiedAt) {
      guideProfile.verifiedAt = new Date();
    }
  } else {
    guideProfile.accountVerificationStatus = ACCOUNT_VERIFICATION_STATUS.PENDING;
  }
};
