import cloudinary from "../../../config/cloudinary.js";
import { LANGUAGE_TEST_STATUS } from "../../../constants/verificationStatus.js";
import {
  ANSWER_INPUT_MODE,
  LANGUAGE_TEST_CONFIG,
  QUESTION_TYPE,
  resolveSupportedLanguageCode,
} from "../../../constants/languageTestConstants.js";
import { AppError } from "../../../utils/AppError.js";

const GPT_SYSTEM_JSON_ONLY = "Return strict JSON only.";
const { TTS_AUDIO_CLOUDINARY_FOLDER } = LANGUAGE_TEST_CONFIG;

export const normalizeLanguageCode = (languageCode) => {
  try {
    return resolveSupportedLanguageCode(languageCode);
  } catch (error) {
    throw new AppError(error.message, 400);
  }
};

// --- GPT helpers ---

export const parseJsonResponse = (rawContent) => {
  const trimmed = String(rawContent || "").trim();
  const jsonText = trimmed.startsWith("```")
    ? trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
    : trimmed;

  return JSON.parse(jsonText);
};

export const buildGptMessages = (taskPrompt) => [
  { role: "system", content: GPT_SYSTEM_JSON_ONLY },
  { role: "user", content: taskPrompt },
];

// --- Session timing ---

export const getSessionExpiryDate = () => {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + LANGUAGE_TEST_CONFIG.SESSION_EXPIRY_HOURS);
  return expiresAt;
};

export const isSessionExpired = (session) =>
  session.expiresAt && session.expiresAt.getTime() < Date.now();

// --- Guide profile language test records ---

export const findLanguageTestRecord = (guideProfile, languageCode) =>
  guideProfile.languageTests.find((record) => record.language === languageCode);

export const isLanguageOnProfile = (guideProfile, languageCode) =>
  guideProfile.languages?.includes(languageCode);

export const findOrCreateLanguageTestRecord = (guideProfile, languageCode) => {
  const code = normalizeLanguageCode(languageCode);
  let record = findLanguageTestRecord(guideProfile, code);

  if (!record) {
    record = {
      language: code,
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

export const hasPassedAllRequiredLanguageTests = (guideProfile) => {
  const requiredLanguages =
    guideProfile.languages?.length > 0 ? guideProfile.languages : guideProfile.verifiedLanguages;

  if (!requiredLanguages?.length) {
    return false;
  }

  return requiredLanguages.every((language) => guideProfile.verifiedLanguages.includes(language));
};

export const addVerifiedLanguage = (guideProfile, languageCode) => {
  if (!guideProfile.verifiedLanguages.includes(languageCode)) {
    guideProfile.verifiedLanguages.push(languageCode);
  }
};

export const buildAttemptsSummary = (languageRecord) => {
  const { maxAttempts, attempts: attemptsUsed } = languageRecord;

  return {
    attemptsUsed,
    attemptsRemaining: Math.max(maxAttempts - attemptsUsed, 0),
    maxAttempts,
  };
};

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

export const buildExpiredSessionEvaluation = () => ({
  overallScore: 0,
  pass: false,
  feedback: LANGUAGE_TEST_CONFIG.SESSION_EXPIRED_FEEDBACK,
  issues: ["Session expired without submission"],
  likelyAiGenerated: false,
  aiDetectionDetails: "",
  integrityPassed: true,
  integrityIssues: [],
});

// --- API response shaping ---

export const sanitizeLanguageTestRecord = (record) => ({
  language: record.language,
  status: record.status,
  score: record.score,
  feedback: record.feedback,
  lastTestDate: record.lastTestDate,
  ...buildAttemptsSummary(record),
});

export const buildAnswerSummaries = (answers = []) =>
  answers.map((answer) => {
    if (answer.inputMode === ANSWER_INPUT_MODE.AUDIO) {
      return {
        questionId: answer.questionId,
        audioUrl: answer.audioUrl,
        transcribedAudio: answer.transcript,
      };
    }

    return {
      questionId: answer.questionId,
      answer: answer.answer,
    };
  });

export const buildResultPayload = (languageRecord, evaluation, extra = {}) => {
  const payload = {
    sessionId: extra.sessionId,
    language: languageRecord.language,
    pass: evaluation.pass,
    score: evaluation.overallScore,
    status: languageRecord.status,
    feedback: evaluation.feedback,
    issues: evaluation.issues || [],
    integrityPassed: evaluation.integrityPassed !== false,
    integrityIssues: evaluation.integrityIssues || [],
    answers: extra.answers || [],
    ...buildAttemptsSummary(languageRecord),
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
        score: session.evaluation.overallScore,
        pass: session.evaluation.pass,
        feedback: session.evaluation.feedback,
        integrityPassed: session.evaluation.integrityPassed !== false,
        integrityIssues: session.evaluation.integrityIssues || [],
      }
    : null,
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

// --- Submit validation ---

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

// --- TTS question audio ---

const uploadTtsAudioToCloudinary = (audioBuffer, { sessionId, questionId }) =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "video",
        folder: TTS_AUDIO_CLOUDINARY_FOLDER,
        public_id: `${sessionId}_${questionId}`,
        overwrite: true,
        format: "mp3",
      },
      (error, result) => (error ? reject(error) : resolve(result)),
    );

    uploadStream.end(audioBuffer);
  });

export const toTtsCloudinaryPayload = async (audioBuffer, { sessionId, questionId }) => {
  try {
    const result = await uploadTtsAudioToCloudinary(audioBuffer, { sessionId, questionId });
    return {
      ttsAudioUrl: result.secure_url,
      ttsMimeType: "audio/mpeg",
    };
  } catch {
    throw new AppError("Failed to upload spoken question audio", 503);
  }
};

// --- Guide answer audio ---

const getCloudinaryCloudName = () => process.env.CLOUDINARY_CLOUD_NAME || "";

const isCloudinarySecureUrl = (url) => {
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

export const validateSpokenAnswer = (rawAnswer) => {
  const label = `"${rawAnswer.questionId}"`;
  const audioUrl = String(rawAnswer.audioUrl || "").trim();

  if (String(rawAnswer.answer || "").trim()) {
    throw new AppError(
      `Spoken question ${label} must be answered with recorded audio, not typed text`,
      400,
    );
  }

  if (!audioUrl) {
    throw new AppError(
      `Spoken question ${label} requires audioUrl from a client-side Cloudinary upload`,
      400,
    );
  }

  if (!isCloudinarySecureUrl(audioUrl)) {
    throw new AppError(`audioUrl for ${label} must be a valid Cloudinary HTTPS URL`, 400);
  }

  if (audioUrl.includes(`/${TTS_AUDIO_CLOUDINARY_FOLDER}/`)) {
    throw new AppError(
      `audioUrl for ${label} must be a guide recording, not a question audio file`,
      400,
    );
  }
};

const inferMimeTypeFromUrl = (audioUrl) => {
  const normalized = String(audioUrl || "").toLowerCase();
  if (normalized.includes(".mp3")) return "audio/mpeg";
  if (normalized.includes(".mp4") || normalized.includes(".m4a")) return "audio/mp4";
  return null;
};

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

export const assertAudioMeetsMinimumSize = (questionId, audioBuffer) => {
  if (audioBuffer.length < LANGUAGE_TEST_CONFIG.MIN_AUDIO_BYTES) {
    throw new AppError(
      `Audio for "${questionId}" is too short. Please record a complete spoken answer`,
      400,
    );
  }
};
