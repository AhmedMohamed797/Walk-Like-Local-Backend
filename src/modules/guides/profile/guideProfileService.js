import GuideProfile from "../models/guideProfileModel.js";
import { AppError } from "../../../utils/AppError.js";
import { GUIDE_PROFILE_LIMITS } from "../../../constants/guideProfileConstants.js";
import { updateGuideVerificationStatus } from "../verification/guideVerificationHelper.js";
import {
  assertCanUpdateLanguages,
  normalizeLanguageCodeList,
  sanitizeGuideProfile,
  syncLanguageTestRecords,
} from "./guideProfileHelper.js";

const getGuideProfileOrThrow = async (userId) => {
  const guideProfile = await GuideProfile.findOne({ user: userId });

  if (!guideProfile) {
    throw new AppError("Guide profile not found", 404);
  }

  return guideProfile;
};

export const getGuideProfile = async (userId) => {
  const guideProfile = await getGuideProfileOrThrow(userId);
  return sanitizeGuideProfile(guideProfile);
};

export const updateGuideProfile = async (userId, updates) => {
  const guideProfile = await getGuideProfileOrThrow(userId);

  if (updates.bio !== undefined) {
    guideProfile.bio = updates.bio;
  }

  if (updates.interests !== undefined) {
    guideProfile.interests = updates.interests;
  }

  await guideProfile.save();

  return sanitizeGuideProfile(guideProfile);
};

export const setGuideLanguages = async (userId, languages) => {
  const guideProfile = await getGuideProfileOrThrow(userId);
  const normalizedLanguages = normalizeLanguageCodeList(languages);

  if (normalizedLanguages.length < GUIDE_PROFILE_LIMITS.MIN_LANGUAGES) {
    throw new AppError(
      `At least ${GUIDE_PROFILE_LIMITS.MIN_LANGUAGES} language is required`,
      400,
    );
  }

  if (normalizedLanguages.length > GUIDE_PROFILE_LIMITS.MAX_LANGUAGES) {
    throw new AppError(
      `You can add at most ${GUIDE_PROFILE_LIMITS.MAX_LANGUAGES} languages`,
      400,
    );
  }

  assertCanUpdateLanguages(guideProfile, normalizedLanguages);

  guideProfile.languages = normalizedLanguages;
  syncLanguageTestRecords(guideProfile, normalizedLanguages);
  updateGuideVerificationStatus(guideProfile);

  await guideProfile.save();

  return sanitizeGuideProfile(guideProfile);
};
