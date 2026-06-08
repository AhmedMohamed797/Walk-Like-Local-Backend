import GuideProfile from "../models/guideProfileModel.js";
import LanguageTestSession from "../models/languageTestSessionModel.js";
import {
  createChatCompletion,
  createSpeech,
  transcribeAudio,
} from "../../../config/openai.js";
import { AppError } from "../../../utils/AppError.js";
import { LANGUAGE_TEST_STATUS } from "../../../constants/verificationStatus.js";
import { updateGuideVerificationStatus } from "../verification/guideVerificationHelper.js";
import {
  ANSWER_INPUT_MODE,
  LANGUAGE_TEST_CONFIG,
  QUESTION_TYPE,
  SESSION_STATUS,
} from "../../../constants/languageTestConstants.js";
import {
  buildEvaluationPrompt,
  buildQuestionGenerationPrompt,
} from "./languageTestPrompts.js";
import {
  appendIntegrityEvents,
  applyIntegrityToEvaluation,
  assertAudioMeetsMinimumSize,
  assertSpokenAnswerUsesAudio,
  buildIntegrityWarnings,
  evaluateIntegrity,
  getIntegrityPolicy,
  normalizeQuestionTimings,
  sanitizeIntegritySummary,
  toStoredIntegrityResult,
} from "./languageTestIntegrity.js";
import {
  addVerifiedLanguage,
  applyExpiredSessionToLanguageRecord,
  assertAllQuestionsAnswered,
  assertClientCloudinaryAudio,
  buildAttemptsSummary,
  buildCaseInsensitiveLanguageRegex,
  buildExpiredSessionEvaluation,
  buildGptMessages,
  buildResultPayload,
  fetchAudioBufferFromUrl,
  findLanguageTestRecord,
  findOrCreateLanguageTestRecord,
  getSessionExpiryDate,
  isLanguageOnProfile,
  isSessionExpired,
  parseJsonResponse,
  resolveAnswerAudioMimeType,
  sanitizeHistorySession,
  sanitizeLanguageTestRecord,
  sanitizeSession,
  toIsoLanguageCode,
  toTtsCloudinaryPayload,
} from "./languageTestHelper.js";

const SESSION_INCLUDE_AUDIO = { includeAudio: true };

const TERMINAL_SESSION_STATUSES = [
  SESSION_STATUS.EXPIRED,
  SESSION_STATUS.FAILED,
  SESSION_STATUS.PASSED,
  SESSION_STATUS.LOCKED,
];

const getGuideProfileOrThrow = async (userId) => {
  const guideProfile = await GuideProfile.findOne({ user: userId });
  if (!guideProfile) {
    throw new AppError("Guide profile not found", 404);
  }
  return guideProfile;
};

const findOwnedSession = (userId, sessionId) =>
  LanguageTestSession.findOne({ _id: sessionId, user: userId });

const assertCanStartLanguageTest = (languageRecord, language) => {
  if (languageRecord.status === LANGUAGE_TEST_STATUS.PASSED) {
    throw new AppError(`Language test already passed for ${language}`, 400);
  }

  if (
    languageRecord.status === LANGUAGE_TEST_STATUS.LOCKED ||
    languageRecord.attempts >= languageRecord.maxAttempts
  ) {
    throw new AppError(`Maximum language test attempts reached for ${language}`, 403);
  }
};

const callGptJson = async (userPrompt) => {
  const rawContent = await createChatCompletion({
    messages: buildGptMessages(userPrompt),
    responseFormat: { type: "json_object" },
  });
  return parseJsonResponse(rawContent);
};

const normalizeGeneratedQuestions = (questions) => {
  const normalized = questions.map((question, index) => ({
    id: question.id || `q${index + 1}`,
    type:
      question.type === QUESTION_TYPE.SPOKEN ? QUESTION_TYPE.SPOKEN : QUESTION_TYPE.WRITTEN,
    question: String(question.question || "").trim(),
  }));

  if (normalized.length !== LANGUAGE_TEST_CONFIG.QUESTIONS_COUNT) {
    throw new AppError("Failed to generate the required number of language test questions", 503);
  }

  const spokenCount = normalized.filter((q) => q.type === QUESTION_TYPE.SPOKEN).length;
  if (spokenCount !== LANGUAGE_TEST_CONFIG.SPOKEN_QUESTIONS_COUNT) {
    normalized.forEach((question, index) => {
      question.type =
        index >= LANGUAGE_TEST_CONFIG.WRITTEN_QUESTIONS_COUNT
          ? QUESTION_TYPE.SPOKEN
          : QUESTION_TYPE.WRITTEN;
    });
  }

  return normalized;
};

const generateTtsForQuestion = async (sessionId, question) => {
  if (question.ttsAudioUrl) {
    return question;
  }

  const audioBuffer = await createSpeech({
    text: question.question,
    voice: LANGUAGE_TEST_CONFIG.TTS_VOICE,
  });

  return {
    ...question,
    ...(await toTtsCloudinaryPayload(audioBuffer, {
      sessionId,
      questionId: question.id,
    })),
  };
};

const attachTtsAudioToSpokenQuestions = async (sessionId, questions) =>
  Promise.all(
    questions.map(async (question) => {
      if (question.type !== QUESTION_TYPE.SPOKEN) {
        return question;
      }
      return generateTtsForQuestion(sessionId, question);
    }),
  );

const generateQuestionTexts = async (language) => {
  const parsed = await callGptJson(buildQuestionGenerationPrompt(language));
  const questions = Array.isArray(parsed.questions) ? parsed.questions : [];

  if (questions.length === 0) {
    throw new AppError("Failed to generate language test questions", 503);
  }

  return normalizeGeneratedQuestions(questions);
};

const processSpokenAnswer = async (session, rawAnswer) => {
  assertSpokenAnswerUsesAudio(rawAnswer);
  assertClientCloudinaryAudio(rawAnswer);

  const audioUrl = String(rawAnswer.audioUrl).trim();
  const audioPublicId = String(rawAnswer.audioPublicId).trim();
  const mimeType = resolveAnswerAudioMimeType(audioUrl, rawAnswer.audioMimeType);

  const audioBuffer = await fetchAudioBufferFromUrl(audioUrl);
  assertAudioMeetsMinimumSize(rawAnswer.questionId, audioBuffer);

  const transcript = await transcribeAudio({
    audioBuffer,
    languageCode: toIsoLanguageCode(session.language),
    mimeType,
  });

  return {
    questionId: rawAnswer.questionId,
    answer: transcript,
    transcript,
    inputMode: ANSWER_INPUT_MODE.AUDIO,
    audioUrl,
    audioPublicId,
    audioMimeType: mimeType,
  };
};

const processWrittenAnswer = (rawAnswer) => {
  const answer = String(rawAnswer.answer || "").trim();

  if (!answer) {
    throw new AppError(`Written question "${rawAnswer.questionId}" requires answer text`, 400);
  }

  if (answer.length > LANGUAGE_TEST_CONFIG.MAX_ANSWER_LENGTH) {
    throw new AppError(
      `Answer for "${rawAnswer.questionId}" exceeds the maximum length`,
      400,
    );
  }

  return {
    questionId: rawAnswer.questionId,
    answer,
    transcript: null,
    inputMode: ANSWER_INPUT_MODE.TEXT,
    audioMimeType: null,
  };
};

const processSubmittedAnswers = async (session, rawAnswers) => {
  const questionMap = new Map(session.questions.map((question) => [question.id, question]));

  return Promise.all(
    rawAnswers.map(async (rawAnswer) => {
      const question = questionMap.get(rawAnswer.questionId);
      if (!question) {
        throw new AppError(`Unknown question id: ${rawAnswer.questionId}`, 400);
      }

      return question.type === QUESTION_TYPE.SPOKEN
        ? processSpokenAnswer(session, rawAnswer)
        : processWrittenAnswer(rawAnswer);
    }),
  );
};

const evaluateAnswersWithGpt = async (language, questions, answers) => {
  const parsed = await callGptJson(buildEvaluationPrompt(language, questions, answers));
  const overallScore = Number(parsed.overallScore);
  const normalizedScore = Number.isFinite(overallScore) ? Math.round(overallScore) : 0;

  return {
    overallScore: normalizedScore,
    pass: normalizedScore >= LANGUAGE_TEST_CONFIG.PASS_SCORE,
    feedback: String(parsed.feedback || "No feedback provided."),
    issues: Array.isArray(parsed.issues) ? parsed.issues.map(String) : [],
    likelyAiGenerated: Boolean(parsed.likelyAiGenerated),
    aiDetectionDetails: String(parsed.aiDetectionDetails || ""),
  };
};

const applyEvaluationToLanguageRecord = async (guideProfile, languageRecord, result) => {
  languageRecord.score = result.overallScore;
  languageRecord.feedback = result.feedback;
  languageRecord.lastTestDate = new Date();

  if (result.pass) {
    languageRecord.status = LANGUAGE_TEST_STATUS.PASSED;
    addVerifiedLanguage(guideProfile, languageRecord.language);
    updateGuideVerificationStatus(guideProfile);
    await guideProfile.save();
    return;
  }

  languageRecord.attempts += 1;
  languageRecord.status =
    languageRecord.attempts >= languageRecord.maxAttempts
      ? LANGUAGE_TEST_STATUS.LOCKED
      : LANGUAGE_TEST_STATUS.FAILED;

  await guideProfile.save();
};

const syncLanguageRecordWithSessionHistory = async (guideProfile, userId, language) => {
  const languageRecord = findLanguageTestRecord(guideProfile, language);
  if (!languageRecord) {
    return;
  }

  const terminalSessionCount = await LanguageTestSession.countDocuments({
    user: userId,
    language: buildCaseInsensitiveLanguageRegex(language),
    status: { $in: TERMINAL_SESSION_STATUSES },
  });

  if (terminalSessionCount <= languageRecord.attempts) {
    return;
  }

  languageRecord.attempts = terminalSessionCount;

  if (languageRecord.status !== LANGUAGE_TEST_STATUS.PASSED) {
    languageRecord.status =
      languageRecord.attempts >= languageRecord.maxAttempts
        ? LANGUAGE_TEST_STATUS.LOCKED
        : LANGUAGE_TEST_STATUS.FAILED;
  }

  await guideProfile.save();
};

const expireActiveSessionIfNeeded = async (guideProfile, session, userId) => {
  if (session.status !== SESSION_STATUS.IN_PROGRESS || !isSessionExpired(session)) {
    return false;
  }

  session.status = SESSION_STATUS.EXPIRED;
  session.completedAt = new Date();
  session.evaluation = buildExpiredSessionEvaluation();
  await session.save();

  const languageRecord = findLanguageTestRecord(guideProfile, session.language);
  if (languageRecord) {
    applyExpiredSessionToLanguageRecord(languageRecord);
    await guideProfile.save();
  }

  if (userId) {
    await syncLanguageRecordWithSessionHistory(guideProfile, userId, session.language);
  }

  return true;
};

const reconcileLanguageTestState = async (guideProfile, userId, language) => {
  const languageRegex = buildCaseInsensitiveLanguageRegex(language);

  const staleSessions = await LanguageTestSession.find({
    user: userId,
    language: languageRegex,
    status: SESSION_STATUS.IN_PROGRESS,
    expiresAt: { $lte: new Date() },
  });

  for (const session of staleSessions) {
    await expireActiveSessionIfNeeded(guideProfile, session, userId);
  }

  await syncLanguageRecordWithSessionHistory(guideProfile, userId, language);

  const languageRecord = findLanguageTestRecord(guideProfile, language);
  if (!languageRecord) {
    return;
  }

  const hasActiveSession = await LanguageTestSession.exists({
    user: userId,
    language: languageRegex,
    status: SESSION_STATUS.IN_PROGRESS,
    expiresAt: { $gt: new Date() },
  });

  if (languageRecord.status === LANGUAGE_TEST_STATUS.IN_PROGRESS && !hasActiveSession) {
    if (applyExpiredSessionToLanguageRecord(languageRecord)) {
      await guideProfile.save();
    }
  }
};

const buildStartPayload = (resumed, languageRecord, session) => ({
  resumed,
  language: languageRecord.language,
  session: sanitizeSession(session, SESSION_INCLUDE_AUDIO),
  integrityPolicy: getIntegrityPolicy(),
  ...buildAttemptsSummary(languageRecord),
});

const getActiveSessionOrThrow = async (userId, sessionId) => {
  const session = await findOwnedSession(userId, sessionId);

  if (!session) {
    throw new AppError("Language test session not found", 404);
  }

  if (session.status !== SESSION_STATUS.IN_PROGRESS) {
    throw new AppError("This language test session is no longer active", 400);
  }

  if (isSessionExpired(session)) {
    const guideProfile = await getGuideProfileOrThrow(userId);
    await expireActiveSessionIfNeeded(guideProfile, session);
    throw new AppError(
      "Language test session expired without submission. This attempt counts as failed. Start a new test when ready.",
      400,
    );
  }

  return session;
};

const resolveSessionStatus = (evaluation, languageRecord) => {
  if (evaluation.pass) {
    return SESSION_STATUS.PASSED;
  }

  return languageRecord.attempts + 1 >= languageRecord.maxAttempts
    ? SESSION_STATUS.LOCKED
    : SESSION_STATUS.FAILED;
};

export const startLanguageTest = async (userId, language) => {
  const guideProfile = await getGuideProfileOrThrow(userId);

  if (!isLanguageOnProfile(guideProfile, language)) {
    throw new AppError(
      `Language "${language}" is not on your profile. Add it via PUT /guides/profile/languages first.`,
      400,
    );
  }

  const languageRecord = findOrCreateLanguageTestRecord(guideProfile, language);

  await reconcileLanguageTestState(guideProfile, userId, languageRecord.language);

  assertCanStartLanguageTest(languageRecord, language);

  const languageRegex = buildCaseInsensitiveLanguageRegex(languageRecord.language);
  const existingSession = await LanguageTestSession.findOne({
    user: userId,
    language: languageRegex,
    status: SESSION_STATUS.IN_PROGRESS,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  if (existingSession) {
    const needsTtsUpload = existingSession.questions.some(
      (question) => question.type === QUESTION_TYPE.SPOKEN && !question.ttsAudioUrl,
    );

    if (needsTtsUpload) {
      existingSession.questions = await attachTtsAudioToSpokenQuestions(
        existingSession._id,
        existingSession.questions,
      );
      await existingSession.save();
    }

    return buildStartPayload(true, languageRecord, existingSession);
  }

  const session = await LanguageTestSession.create({
    guide: guideProfile._id,
    user: userId,
    language: languageRecord.language,
    attemptNumber: languageRecord.attempts + 1,
    status: SESSION_STATUS.IN_PROGRESS,
    questions: await generateQuestionTexts(languageRecord.language),
    expiresAt: getSessionExpiryDate(),
  });

  session.questions = await attachTtsAudioToSpokenQuestions(session._id, session.questions);
  await session.save();

  languageRecord.status = LANGUAGE_TEST_STATUS.IN_PROGRESS;
  await guideProfile.save();

  return buildStartPayload(false, languageRecord, session);
};

export const reportLanguageTestIntegrityEvents = async (userId, sessionId, events) => {
  const session = await getActiveSessionOrThrow(userId, sessionId);
  const counts = appendIntegrityEvents(session, events);
  await session.save();

  const policy = getIntegrityPolicy();
  return {
    sessionId: session._id,
    counts,
    warnings: buildIntegrityWarnings(counts, policy),
    integrityPolicy: policy,
  };
};

export const submitLanguageTestAnswers = async (
  userId,
  sessionId,
  rawAnswers,
  integrityPayload = {},
) => {
  const guideProfile = await getGuideProfileOrThrow(userId);
  const session = await getActiveSessionOrThrow(userId, sessionId);

  const languageRecord = findLanguageTestRecord(guideProfile, session.language);
  if (!languageRecord) {
    throw new AppError("Language test record not found for this session", 404);
  }

  assertAllQuestionsAnswered(session.questions, rawAnswers);

  const answers = await processSubmittedAnswers(session, rawAnswers);
  let evaluation = await evaluateAnswersWithGpt(session.language, session.questions, answers);

  const questionTimings = normalizeQuestionTimings(integrityPayload.questionTimings);
  const integrityResult = evaluateIntegrity({
    session,
    questions: session.questions,
    questionTimings,
    evaluation,
  });

  evaluation = applyIntegrityToEvaluation(evaluation, integrityResult);

  session.answers = answers;
  session.evaluation = evaluation;
  session.integrityResult = toStoredIntegrityResult(integrityResult);
  session.completedAt = new Date();
  session.status = resolveSessionStatus(evaluation, languageRecord);

  await session.save();
  await applyEvaluationToLanguageRecord(guideProfile, languageRecord, evaluation);

  return buildResultPayload(languageRecord, evaluation, {
    sessionId: session._id,
    attemptNumber: session.attemptNumber,
    issues: evaluation.issues,
    spokenQuestionsCount: LANGUAGE_TEST_CONFIG.SPOKEN_QUESTIONS_COUNT,
    writtenQuestionsCount: LANGUAGE_TEST_CONFIG.WRITTEN_QUESTIONS_COUNT,
    integrity: sanitizeIntegritySummary(integrityResult),
    likelyAiGenerated: evaluation.likelyAiGenerated,
  });
};

export const getLanguageTestStatus = async (userId) => {
  const guideProfile = await getGuideProfileOrThrow(userId);

  for (const record of guideProfile.languageTests) {
    await reconcileLanguageTestState(guideProfile, userId, record.language);
  }

  const activeSession = await LanguageTestSession.findOne({
    user: userId,
    status: SESSION_STATUS.IN_PROGRESS,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  return {
    languages: guideProfile.languages,
    verifiedLanguages: guideProfile.verifiedLanguages,
    languageTests: guideProfile.languageTests.map(sanitizeLanguageTestRecord),
    activeSession: activeSession
      ? sanitizeSession(activeSession, SESSION_INCLUDE_AUDIO)
      : null,
    integrityPolicy: getIntegrityPolicy(),
  };
};

export const getLanguageTestHistory = async (userId, language) => {
  await getGuideProfileOrThrow(userId);

  const filter = { user: userId };
  if (language) {
    filter.language = buildCaseInsensitiveLanguageRegex(language);
  }

  const sessions = await LanguageTestSession.find(filter)
    .sort({ createdAt: -1 })
    .select("-answers");

  return sessions.map(sanitizeHistorySession);
};

export const getLanguageTestSession = async (userId, sessionId) => {
  const guideProfile = await getGuideProfileOrThrow(userId);
  const session = await findOwnedSession(userId, sessionId);
  if (!session) {
    throw new AppError("Language test session not found", 404);
  }

  if (session.status === SESSION_STATUS.IN_PROGRESS && isSessionExpired(session)) {
    await expireActiveSessionIfNeeded(guideProfile, session, userId);
  }

  return {
    ...sanitizeSession(session, SESSION_INCLUDE_AUDIO),
    integrityPolicy: getIntegrityPolicy(),
  };
};

export const getQuestionTtsAudio = async (userId, sessionId, questionId) => {
  const session = await findOwnedSession(userId, sessionId);
  if (!session) {
    throw new AppError("Language test session not found", 404);
  }

  const question = session.questions.find((item) => item.id === questionId);
  if (!question) {
    throw new AppError("Question not found in this session", 404);
  }

  if (question.type !== QUESTION_TYPE.SPOKEN) {
    throw new AppError("TTS audio is only available for spoken questions", 400);
  }

  if (!question.ttsAudioUrl) {
    const updatedQuestion = await generateTtsForQuestion(sessionId, question);
    Object.assign(question, updatedQuestion);
    await session.save();
  }

  return {
    questionId: question.id,
    language: session.language,
    ttsAudioUrl: question.ttsAudioUrl,
    ttsMimeType: question.ttsMimeType,
  };
};
