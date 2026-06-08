import { LANGUAGE_TEST_STATUS } from "../../../constants/verificationStatus.js";
import {
  GUIDE_PROFILE_LIMITS,
  SUPPORTED_GUIDE_LANGUAGES,
} from "../../../constants/guideProfileConstants.js";
import { LANGUAGE_TEST_CONFIG } from "../../../constants/languageTestConstants.js";
import { languagesMatch } from "../languageTest/languageTestHelper.js";
import { AppError } from "../../../utils/AppError.js";

const supportedLanguageMap = new Map(
  SUPPORTED_GUIDE_LANGUAGES.map((language) => [language.toLowerCase(), language]),
);

export const resolveSupportedLanguage = (language) => {
  const canonical = supportedLanguageMap.get(String(language || "").trim().toLowerCase());

  if (!canonical) {
    throw new AppError(
      `Unsupported language: ${language}. Choose from: ${SUPPORTED_GUIDE_LANGUAGES.join(", ")}`,
      400,
    );
  }

  return canonical;
};

export const normalizeLanguageList = (languages) => {
  const seen = new Set();
  const normalized = [];

  for (const language of languages) {
    const canonical = resolveSupportedLanguage(language);
    const key = canonical.toLowerCase();

    if (!seen.has(key)) {
      seen.add(key);
      normalized.push(canonical);
    }
  }

  return normalized;
};

export const assertCanUpdateLanguages = (guideProfile, nextLanguages) => {
  const removedLanguages = guideProfile.languages.filter(
    (current) => !nextLanguages.some((next) => languagesMatch(current, next)),
  );

  for (const language of removedLanguages) {
    if (guideProfile.verifiedLanguages.some((verified) => languagesMatch(verified, language))) {
      throw new AppError(`Cannot remove verified language: ${language}`, 400);
    }

    const testRecord = guideProfile.languageTests.find((record) =>
      languagesMatch(record.language, language),
    );

    if (testRecord?.status === LANGUAGE_TEST_STATUS.IN_PROGRESS) {
      throw new AppError(`Cannot remove language with an active test: ${language}`, 400);
    }
  }
};

export const syncLanguageTestRecords = (guideProfile, nextLanguages) => {
  for (const language of nextLanguages) {
    const exists = guideProfile.languageTests.some((record) =>
      languagesMatch(record.language, language),
    );

    if (!exists) {
      guideProfile.languageTests.push({
        language,
        status: LANGUAGE_TEST_STATUS.NOT_STARTED,
        score: null,
        attempts: 0,
        maxAttempts: LANGUAGE_TEST_CONFIG.MAX_ATTEMPTS_PER_LANGUAGE,
        lastTestDate: null,
        feedback: null,
      });
    }
  }

  guideProfile.languageTests = guideProfile.languageTests.filter((record) =>
    nextLanguages.some((language) => languagesMatch(language, record.language)),
  );
};

export const buildProfileCompletion = (guideProfile) => {
  const hasBio = Boolean(guideProfile.bio?.trim());
  const hasInterests = guideProfile.interests?.length > 0;
  const hasLanguages = guideProfile.languages?.length >= GUIDE_PROFILE_LIMITS.MIN_LANGUAGES;

  const steps = {
    bio: hasBio,
    interests: hasInterests,
    languages: hasLanguages,
  };

  const completedSteps = Object.values(steps).filter(Boolean).length;

  return {
    steps,
    completedSteps,
    totalSteps: Object.keys(steps).length,
    isComplete: completedSteps === Object.keys(steps).length,
  };
};

export const sanitizeGuideProfile = (guideProfile) => ({
  bio: guideProfile.bio,
  interests: guideProfile.interests,
  languages: guideProfile.languages,
  verifiedLanguages: guideProfile.verifiedLanguages,
  languageTests: guideProfile.languageTests.map((record) => ({
    language: record.language,
    status: record.status,
    score: record.score,
    attempts: record.attempts,
    maxAttempts: record.maxAttempts,
    lastTestDate: record.lastTestDate,
    feedback: record.feedback,
  })),
  documentVerificationStatus: guideProfile.documentVerificationStatus,
  accountVerificationStatus: guideProfile.accountVerificationStatus,
  profileCompletion: buildProfileCompletion(guideProfile),
  supportedLanguages: SUPPORTED_GUIDE_LANGUAGES,
  createdAt: guideProfile.createdAt,
  updatedAt: guideProfile.updatedAt,
});
