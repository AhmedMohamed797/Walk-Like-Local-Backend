import {
  INTEGRITY_EVENT_TYPE,
  LANGUAGE_TEST_CONFIG,
  QUESTION_TYPE,
} from "../../../constants/languageTestConstants.js";

const VALID_EVENT_TYPES = new Set(Object.values(INTEGRITY_EVENT_TYPE));

const countIntegrityEvents = (events = []) => {
  const counts = {
    tabSwitchCount: 0,
    focusLossCount: 0,
    pasteCount: 0,
  };

  for (const { type } of events) {
    if (type === INTEGRITY_EVENT_TYPE.TAB_SWITCH) counts.tabSwitchCount += 1;
    else if (type === INTEGRITY_EVENT_TYPE.FOCUS_LOSS) counts.focusLossCount += 1;
    else if (type === INTEGRITY_EVENT_TYPE.PASTE) counts.pasteCount += 1;
  }

  return counts;
};

const normalizeIntegrityEvents = (events = []) =>
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

const hasPasteViolation = (events, writtenQuestionIds) =>
  events.some(
    (event) =>
      event.type === INTEGRITY_EVENT_TYPE.PASTE &&
      (!event.questionId || writtenQuestionIds.has(event.questionId)),
  );

export const evaluateIntegrity = ({ session, questions, evaluation = null }) => {
  const issues = [];
  const events = session.integrityEvents || [];
  const counts = countIntegrityEvents(events);
  const writtenQuestionIds = new Set(
    questions.filter((q) => q.type === QUESTION_TYPE.WRITTEN).map((q) => q.id),
  );

  const totalDurationSeconds = Math.floor(
    (Date.now() - new Date(session.startedAt).getTime()) / 1000,
  );

  if (totalDurationSeconds < LANGUAGE_TEST_CONFIG.MIN_SESSION_DURATION_SECONDS) {
    issues.push(
      `Test completed too quickly (${totalDurationSeconds}s; minimum ${LANGUAGE_TEST_CONFIG.MIN_SESSION_DURATION_SECONDS}s)`,
    );
  }

  if (hasPasteViolation(events, writtenQuestionIds)) {
    issues.push("Copy-paste is not allowed on written answers");
  }

  if (counts.tabSwitchCount > LANGUAGE_TEST_CONFIG.MAX_TAB_SWITCHES) {
    issues.push(`Too many tab switches (${counts.tabSwitchCount})`);
  }

  if (counts.focusLossCount > LANGUAGE_TEST_CONFIG.MAX_FOCUS_LOSS_EVENTS) {
    issues.push(`Too many focus-loss events (${counts.focusLossCount})`);
  }

  if (evaluation?.likelyAiGenerated) {
    issues.push(
      evaluation.aiDetectionDetails ||
        "Answers appear to be AI-generated rather than original guide responses",
    );
  }

  return {
    passed: issues.length === 0,
    issues,
    totalDurationSeconds,
  };
};

export const applyIntegrityToEvaluation = (evaluation, integrityResult) => {
  if (integrityResult.passed) {
    return {
      ...evaluation,
      integrityPassed: true,
      integrityIssues: [],
    };
  }

  const primaryIssue = integrityResult.issues[0] || "Suspicious test behavior detected";

  return {
    ...evaluation,
    pass: false,
    overallScore: Math.min(evaluation.overallScore, LANGUAGE_TEST_CONFIG.PASS_SCORE - 1),
    integrityPassed: false,
    integrityIssues: integrityResult.issues,
    feedback: `Integrity check failed: ${primaryIssue}. ${evaluation.feedback}`,
    issues: [...integrityResult.issues, ...(evaluation.issues || [])],
  };
};

export const buildIntegrityWarnings = (counts) => {
  const warnings = [];

  if (counts.pasteCount > LANGUAGE_TEST_CONFIG.MAX_PASTE_EVENTS) {
    warnings.push("Copy-paste is not allowed during the language test");
  }

  if (counts.tabSwitchCount > LANGUAGE_TEST_CONFIG.MAX_TAB_SWITCHES) {
    warnings.push("Tab switching limit exceeded");
  }

  if (counts.focusLossCount > LANGUAGE_TEST_CONFIG.MAX_FOCUS_LOSS_EVENTS) {
    warnings.push("Focus-loss limit exceeded");
  }

  return warnings;
};

export const toStoredIntegrityResult = (integrityResult) => ({
  passed: integrityResult.passed,
  issues: integrityResult.issues,
  totalDurationSeconds: integrityResult.totalDurationSeconds,
});
