import cloudinary from "../../../config/cloudinary.js";
import { LANGUAGE_TEST_STATUS } from "../../../constants/verificationStatus.js";
import {
  LANGUAGE_ISO_CODES,
  LANGUAGE_TEST_CONFIG,
  QUESTION_TYPE,
} from "../../../constants/languageTestConstants.js";
import { AppError } from "../../../utils/AppError.js";

const GPT_SYSTEM_JSON_ONLY = "Return strict JSON only.";
const { ANSWER_AUDIO_CLOUDINARY_FOLDER, TTS_AUDIO_CLOUDINARY_FOLDER } = LANGUAGE_TEST_CONFIG;

export const normalizeLanguageKey = (language) =>
  String(language || "").trim().toLowerCase();

export const languagesMatch = (left, right) =>
  normalizeLanguageKey(left) === normalizeLanguageKey(right);

export const buildCaseInsensitiveLanguageRegex = (language) =>
  new RegExp(`^${String(language).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");

export const toIsoLanguageCode = (language) => {
  const key = normalizeLanguageKey(language);
  return LANGUAGE_ISO_CODES[key] || key.slice(0, 2);
};

export const parseJsonResponse = (rawContent) => {
  const trimmed = String(rawContent || "").trim();
  const jsonText = trimmed.startsWith("```")
    ? trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
    : trimmed;

  return JSON.parse(jsonText);
};

export const getSessionExpiryDate = () => {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + LANGUAGE_TEST_CONFIG.SESSION_EXPIRY_HOURS);
  return expiresAt;
};

export const isSessionExpired = (session) =>
  session.expiresAt && session.expiresAt.getTime() < Date.now();

export const findLanguageTestRecord = (guideProfile, language) =>
  guideProfile.languageTests.find((record) => languagesMatch(record.language, language));

export const isLanguageOnProfile = (guideProfile, language) =>
  guideProfile.languages?.some((profileLanguage) => languagesMatch(profileLanguage, language));

export const findOrCreateLanguageTestRecord = (guideProfile, language) => {
  let record = findLanguageTestRecord(guideProfile, language);

  if (!record) {
    record = {
      language: String(language).trim(),
      status: LANGUAGE_TEST_STATUS.NOT_STARTED,
      score: null,
      attempts: 0,
      maxAttempts: LANGUAGE_TEST_CONFIG.MAX_ATTEMPTS_PER_LANGUAGE,
      lastTestDate: null,
      feedback: null,
    };
    guideProfile.languageTests.push(record);
  }

  return record;
};

export const buildAttemptsSummary = (languageRecord) => {
  const { maxAttempts, attempts: attemptsUsed } = languageRecord;

  return {
    attemptsUsed,
    attemptsRemaining: Math.max(maxAttempts - attemptsUsed, 0),
    maxAttempts,
  };
};

export const sanitizeLanguageTestRecord = (record) => ({
  language: record.language,
  status: record.status,
  score: record.score,
  feedback: record.feedback,
  lastTestDate: record.lastTestDate,
  ...buildAttemptsSummary(record),
});

export const hasPassedAllRequiredLanguageTests = (guideProfile) => {
  const requiredLanguages =
    guideProfile.languages?.length > 0
      ? guideProfile.languages
      : guideProfile.verifiedLanguages;

  if (!requiredLanguages?.length) {
    return false;
  }

  return requiredLanguages.every((language) =>
    guideProfile.verifiedLanguages.some((verified) => languagesMatch(verified, language)),
  );
};

export const buildResultPayload = (languageRecord, evaluation, extra = {}) => {
  const payload = {
    score: evaluation.overallScore,
    status: languageRecord.status,
    language: languageRecord.language,
    feedback: evaluation.feedback,
    pass: evaluation.pass,
    ...buildAttemptsSummary(languageRecord),
    ...extra,
  };

  if (languageRecord.status === LANGUAGE_TEST_STATUS.LOCKED) {
    payload.message = "Maximum language test attempts reached for this language.";
  }

  return payload;
};

export const sanitizeQuestion = (question, { includeAudio = false } = {}) => {
  const sanitized = {
    id: question.id,
    type: question.type,
    question: question.question,
  };

  if (question.type !== QUESTION_TYPE.SPOKEN) {
    return sanitized;
  }

  sanitized.requiresAudioResponse = true;
  sanitized.hasTtsAudio = Boolean(question.ttsAudioUrl);

  if (includeAudio && question.ttsAudioUrl) {
    sanitized.ttsAudioUrl = question.ttsAudioUrl;
    sanitized.ttsMimeType = question.ttsMimeType || "audio/mpeg";
  }

  return sanitized;
};

export const sanitizeSession = (session, options = {}) => ({
  sessionId: session._id,
  language: session.language,
  attemptNumber: session.attemptNumber,
  status: session.status,
  questions: session.questions.map((question) => sanitizeQuestion(question, options)),
  startedAt: session.startedAt,
  expiresAt: session.expiresAt,
  completedAt: session.completedAt,
  evaluation: session.evaluation
    ? {
        overallScore: session.evaluation.overallScore,
        pass: session.evaluation.pass,
        feedback: session.evaluation.feedback,
        integrityPassed: session.evaluation.integrityPassed,
        integrityFlags: session.evaluation.integrityFlags || [],
      }
    : null,
  integrityResult: session.integrityResult || null,
});

export const sanitizeHistorySession = (session) => ({
  sessionId: session._id,
  language: session.language,
  attemptNumber: session.attemptNumber,
  status: session.status,
  score: session.evaluation?.overallScore ?? null,
  pass: session.evaluation?.pass ?? null,
  feedback: session.evaluation?.feedback ?? null,
  startedAt: session.startedAt,
  completedAt: session.completedAt,
  createdAt: session.createdAt,
});

export const uploadTtsAudioToCloudinary = async (audioBuffer, { sessionId, questionId }) =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "video",
        folder: TTS_AUDIO_CLOUDINARY_FOLDER,
        public_id: `${sessionId}_${questionId}`,
        overwrite: true,
        format: "mp3",
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      },
    );

    uploadStream.end(audioBuffer);
  });

export const toTtsCloudinaryPayload = async (audioBuffer, { sessionId, questionId }) => {
  try {
    const result = await uploadTtsAudioToCloudinary(audioBuffer, { sessionId, questionId });
    return {
      ttsAudioUrl: result.secure_url,
      ttsAudioPublicId: result.public_id,
      ttsMimeType: "audio/mpeg",
    };
  } catch {
    throw new AppError("Failed to upload spoken question audio", 503);
  }
};

const getCloudinaryCloudName = () => process.env.CLOUDINARY_CLOUD_NAME || "";

export const isCloudinarySecureUrl = (url) => {
  const cloudName = getCloudinaryCloudName();
  if (!cloudName) {
    return false;
  }

  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "res.cloudinary.com" &&
      parsed.pathname.includes(`/${cloudName}/`)
    );
  } catch {
    return false;
  }
};

const spokenAnswerLabel = (questionId) => `"${questionId}"`;

export const isAnswerAudioCloudinaryUrl = (audioUrl) =>
  isCloudinarySecureUrl(audioUrl) && audioUrl.includes(`/${ANSWER_AUDIO_CLOUDINARY_FOLDER}/`);

export const assertClientCloudinaryAudio = (rawAnswer) => {
  const { questionId } = rawAnswer;
  const audioUrl = String(rawAnswer.audioUrl || "").trim();
  const audioPublicId = String(rawAnswer.audioPublicId || "").trim();
  const label = spokenAnswerLabel(questionId);

  if (!audioUrl || !audioPublicId) {
    throw new AppError(
      `Spoken question ${label} requires audioUrl and audioPublicId from a client-side Cloudinary upload`,
      400,
    );
  }

  if (!isCloudinarySecureUrl(audioUrl)) {
    throw new AppError(`audioUrl for ${label} must be a valid Cloudinary HTTPS URL`, 400);
  }

  if (!isAnswerAudioCloudinaryUrl(audioUrl)) {
    throw new AppError(
      `audioUrl for ${label} must point to an uploaded answer under "${ANSWER_AUDIO_CLOUDINARY_FOLDER}/"`,
      400,
    );
  }

  if (!audioPublicId.startsWith(`${ANSWER_AUDIO_CLOUDINARY_FOLDER}/`)) {
    throw new AppError(
      `audioPublicId for ${label} must be under "${ANSWER_AUDIO_CLOUDINARY_FOLDER}/"`,
      400,
    );
  }
};

export const inferMimeTypeFromUrl = (audioUrl) => {
  const normalized = String(audioUrl || "").toLowerCase();
  if (normalized.includes(".mp3")) return "audio/mpeg";
  if (normalized.includes(".mp4") || normalized.includes(".m4a")) return "audio/mp4";
  return null;
};

/** Prefer URL extension over client-supplied mimeType to avoid Whisper rejections. */
export const resolveAnswerAudioMimeType = (audioUrl, clientMimeType) =>
  inferMimeTypeFromUrl(audioUrl) || String(clientMimeType || "").trim() || "audio/webm";

export const fetchAudioBufferFromUrl = async (audioUrl) => {
  const response = await fetch(audioUrl);

  if (!response.ok) {
    throw new AppError("Could not download the spoken answer audio", 400);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

export const buildExpiredSessionEvaluation = () => ({
  overallScore: 0,
  pass: false,
  feedback: LANGUAGE_TEST_CONFIG.SESSION_EXPIRED_FEEDBACK,
  issues: ["Session expired without submission"],
  likelyAiGenerated: false,
  aiDetectionDetails: "",
  integrityPassed: true,
  integrityFlags: [],
  integrityViolations: [],
});

export const applyExpiredSessionToLanguageRecord = (languageRecord) => {
  if (languageRecord.status !== LANGUAGE_TEST_STATUS.IN_PROGRESS) {
    return false;
  }

  languageRecord.attempts += 1;
  languageRecord.lastTestDate = new Date();
  languageRecord.score = 0;
  languageRecord.feedback = LANGUAGE_TEST_CONFIG.SESSION_EXPIRED_FEEDBACK;
  languageRecord.status =
    languageRecord.attempts >= languageRecord.maxAttempts
      ? LANGUAGE_TEST_STATUS.LOCKED
      : LANGUAGE_TEST_STATUS.FAILED;

  return true;
};

export const assertAllQuestionsAnswered = (questions, rawAnswers) => {
  const expectedIds = new Set(questions.map((question) => question.id));
  const submittedIds = new Set(rawAnswers.map((answer) => answer.questionId));

  const allAnswered =
    expectedIds.size === submittedIds.size &&
    [...expectedIds].every((questionId) => submittedIds.has(questionId));

  if (!allAnswered) {
    throw new AppError("All questions must be answered before submission", 400);
  }
};

export const addVerifiedLanguage = (guideProfile, language) => {
  const alreadyVerified = guideProfile.verifiedLanguages.some((verified) =>
    languagesMatch(verified, language),
  );

  if (!alreadyVerified) {
    guideProfile.verifiedLanguages.push(language);
  }
};

export const buildGptMessages = (taskPrompt) => [
  { role: "system", content: GPT_SYSTEM_JSON_ONLY },
  { role: "user", content: taskPrompt },
];
