import { AppError } from "../../../utils/AppError.js";
import {
  INTEGRITY_EVENT_TYPE,
  LANGUAGE_TEST_CONFIG,
  QUESTION_TYPE,
} from "../../../constants/languageTestConstants.js";

const INTEGRITY_FLAG = {
  PASTE_DETECTED: "PASTE_DETECTED",
  TAB_SWITCH_LIMIT: "TAB_SWITCH_LIMIT",
  FOCUS_LOSS_LIMIT: "FOCUS_LOSS_LIMIT",
  SESSION_TOO_FAST: "SESSION_TOO_FAST",
  WRITTEN_ANSWER_TOO_FAST: "WRITTEN_ANSWER_TOO_FAST",
  AI_GENERATED_CONTENT: "AI_GENERATED_CONTENT",
};

const VALID_EVENT_TYPES = new Set(Object.values(INTEGRITY_EVENT_TYPE));

export const getIntegrityPolicy = () => ({
  spokenRequiresAudio: true,
  spokenAnswerUsesCloudinary: true,
  answerAudioCloudinaryFolder: LANGUAGE_TEST_CONFIG.ANSWER_AUDIO_CLOUDINARY_FOLDER,
  rejectTextOnSpokenQuestions: true,
  minAudioBytes: LANGUAGE_TEST_CONFIG.MIN_AUDIO_BYTES,
  minSessionDurationSeconds: LANGUAGE_TEST_CONFIG.MIN_SESSION_DURATION_SECONDS,
  minWrittenQuestionSeconds: LANGUAGE_TEST_CONFIG.MIN_WRITTEN_QUESTION_SECONDS,
  maxTabSwitches: LANGUAGE_TEST_CONFIG.MAX_TAB_SWITCHES,
  maxFocusLossEvents: LANGUAGE_TEST_CONFIG.MAX_FOCUS_LOSS_EVENTS,
  maxPasteEvents: LANGUAGE_TEST_CONFIG.MAX_PASTE_EVENTS,
  reportableEventTypes: [...VALID_EVENT_TYPES],
});

const countIntegrityEvents = (events = []) => {
  const counts = {
    tabSwitchCount: 0,
    focusLossCount: 0,
    pasteCount: 0,
    copyCount: 0,
    visibilityHiddenCount: 0,
  };

  for (const { type } of events) {
    if (type === INTEGRITY_EVENT_TYPE.TAB_SWITCH) counts.tabSwitchCount += 1;
    else if (type === INTEGRITY_EVENT_TYPE.FOCUS_LOSS) counts.focusLossCount += 1;
    else if (type === INTEGRITY_EVENT_TYPE.PASTE) counts.pasteCount += 1;
    else if (type === INTEGRITY_EVENT_TYPE.COPY) counts.copyCount += 1;
    else if (type === INTEGRITY_EVENT_TYPE.VISIBILITY_HIDDEN) counts.visibilityHiddenCount += 1;
  }

  return counts;
};

export const normalizeIntegrityEvents = (events = []) =>
  events.map((event) => ({
    type: String(event.type || "").trim().toUpperCase(),
    questionId: event.questionId ? String(event.questionId).trim() : null,
    occurredAt: event.occurredAt ? new Date(event.occurredAt) : new Date(),
  }));

export const appendIntegrityEvents = (session, incomingEvents = []) => {
  const normalized = normalizeIntegrityEvents(incomingEvents)
    .filter((event) => VALID_EVENT_TYPES.has(event.type))
    .slice(0, LANGUAGE_TEST_CONFIG.MAX_INTEGRITY_EVENTS_PER_REQUEST);

  if (normalized.length > 0) {
    session.integrityEvents.push(...normalized);
  }

  return countIntegrityEvents(session.integrityEvents);
};

export const assertSpokenAnswerUsesAudio = (rawAnswer) => {
  if (String(rawAnswer.answer || "").trim()) {
    throw new AppError(
      `Spoken question "${rawAnswer.questionId}" must be answered with recorded audio, not typed text`,
      400,
    );
  }
};

export const assertAudioMeetsMinimumSize = (questionId, audioBuffer) => {
  if (audioBuffer.length < LANGUAGE_TEST_CONFIG.MIN_AUDIO_BYTES) {
    throw new AppError(
      `Audio for "${questionId}" is too short. Please record a complete spoken answer`,
      400,
    );
  }
};

export const normalizeQuestionTimings = (questionTimings = []) =>
  questionTimings
    .map((timing) => ({
      questionId: String(timing.questionId || "").trim(),
      secondsSpent: Number(timing.secondsSpent),
    }))
    .filter(
      (timing) =>
        timing.questionId &&
        Number.isFinite(timing.secondsSpent) &&
        timing.secondsSpent >= 0,
    );

const hasPasteViolation = (events, writtenQuestionIds) =>
  events.some(
    (event) =>
      event.type === INTEGRITY_EVENT_TYPE.PASTE &&
      (!event.questionId || writtenQuestionIds.has(event.questionId)),
  );

export const evaluateIntegrity = ({
  session,
  questions,
  questionTimings = [],
  evaluation = null,
}) => {
  const flags = [];
  const violations = [];
  const events = session.integrityEvents || [];
  const counts = countIntegrityEvents(events);
  const writtenQuestionIds = new Set(
    questions.filter((q) => q.type === QUESTION_TYPE.WRITTEN).map((q) => q.id),
  );

  const totalDurationSeconds = Math.floor(
    (Date.now() - new Date(session.startedAt).getTime()) / 1000,
  );

  if (totalDurationSeconds < LANGUAGE_TEST_CONFIG.MIN_SESSION_DURATION_SECONDS) {
    flags.push(INTEGRITY_FLAG.SESSION_TOO_FAST);
    violations.push(
      `Test completed in ${totalDurationSeconds}s; minimum is ${LANGUAGE_TEST_CONFIG.MIN_SESSION_DURATION_SECONDS}s`,
    );
  }

  if (hasPasteViolation(events, writtenQuestionIds)) {
    flags.push(INTEGRITY_FLAG.PASTE_DETECTED);
    violations.push("Copy-paste is not allowed on written answers");
  }

  if (counts.tabSwitchCount > LANGUAGE_TEST_CONFIG.MAX_TAB_SWITCHES) {
    flags.push(INTEGRITY_FLAG.TAB_SWITCH_LIMIT);
    violations.push(
      `Too many tab switches (${counts.tabSwitchCount}/${LANGUAGE_TEST_CONFIG.MAX_TAB_SWITCHES})`,
    );
  }

  if (counts.focusLossCount > LANGUAGE_TEST_CONFIG.MAX_FOCUS_LOSS_EVENTS) {
    flags.push(INTEGRITY_FLAG.FOCUS_LOSS_LIMIT);
    violations.push(
      `Too many focus-loss events (${counts.focusLossCount}/${LANGUAGE_TEST_CONFIG.MAX_FOCUS_LOSS_EVENTS})`,
    );
  }

  const rushedWrittenAnswer = questionTimings.find((timing) => {
    const question = questions.find((item) => item.id === timing.questionId);
    return (
      question?.type === QUESTION_TYPE.WRITTEN &&
      timing.secondsSpent < LANGUAGE_TEST_CONFIG.MIN_WRITTEN_QUESTION_SECONDS
    );
  });

  if (rushedWrittenAnswer) {
    flags.push(INTEGRITY_FLAG.WRITTEN_ANSWER_TOO_FAST);
    violations.push(
      `Written question "${rushedWrittenAnswer.questionId}" was answered too quickly (${rushedWrittenAnswer.secondsSpent}s)`,
    );
  }

  if (evaluation?.likelyAiGenerated) {
    flags.push(INTEGRITY_FLAG.AI_GENERATED_CONTENT);
    violations.push(
      evaluation.aiDetectionDetails ||
        "Answers appear to be AI-generated rather than original guide responses",
    );
  }

  return {
    passed: flags.length === 0,
    flags,
    violations,
    counts: { ...counts, totalDurationSeconds },
    questionTimings,
  };
};

export const applyIntegrityToEvaluation = (evaluation, integrityResult) => {
  if (integrityResult.passed) {
    return {
      ...evaluation,
      integrityPassed: true,
      integrityFlags: [],
      integrityViolations: [],
    };
  }

  const primaryViolation =
    integrityResult.violations[0] || "Suspicious test behavior detected";

  return {
    ...evaluation,
    pass: false,
    overallScore: Math.min(evaluation.overallScore, LANGUAGE_TEST_CONFIG.PASS_SCORE - 1),
    integrityPassed: false,
    integrityFlags: integrityResult.flags,
    integrityViolations: integrityResult.violations,
    feedback: `Integrity check failed: ${primaryViolation}. ${evaluation.feedback}`,
    issues: [...integrityResult.violations, ...(evaluation.issues || [])],
  };
};

export const buildIntegrityWarnings = (counts, policy) => {
  const warnings = [];

  if (counts.pasteCount > policy.maxPasteEvents) {
    warnings.push("Copy-paste is not allowed during the language test");
  }

  if (counts.tabSwitchCount > policy.maxTabSwitches) {
    warnings.push("Tab switching limit exceeded");
  }

  if (counts.focusLossCount > policy.maxFocusLossEvents) {
    warnings.push("Focus-loss limit exceeded");
  }

  return warnings;
};

export const toStoredIntegrityResult = (integrityResult) => ({
  passed: integrityResult.passed,
  flags: integrityResult.flags,
  violations: integrityResult.violations,
  tabSwitchCount: integrityResult.counts.tabSwitchCount,
  focusLossCount: integrityResult.counts.focusLossCount,
  pasteCount: integrityResult.counts.pasteCount,
  copyCount: integrityResult.counts.copyCount,
  visibilityHiddenCount: integrityResult.counts.visibilityHiddenCount,
  totalDurationSeconds: integrityResult.counts.totalDurationSeconds,
  questionTimings: integrityResult.questionTimings,
});

export const sanitizeIntegritySummary = (integrityResult) => ({
  passed: integrityResult.passed,
  flags: integrityResult.flags,
  violations: integrityResult.violations,
  counts: integrityResult.counts,
  questionTimings: integrityResult.questionTimings,
});
