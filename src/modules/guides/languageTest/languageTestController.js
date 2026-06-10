import * as languageTestService from "./languageTestService.js";
import { asyncHandler } from "../../../middlewares/error.middleware.js";
import { LANGUAGE_TEST_STATUS } from "../../../constants/verificationStatus.js";
import { ROLES } from "../../../constants/roles.js";
import { getLanguageDisplayName } from "../../../constants/languageTestConstants.js";

const ensureGuide = (req, res) => {
  if (req.user.role !== ROLES.GUIDE) {
    res.status(403).json({
      success: false,
      message: "Only guides can access the language test",
    });
    return false;
  }
  return true;
};

const buildSubmitMessage = (data) => {
  const languageLabel = getLanguageDisplayName(data.language);

  if (data.pass) {
    return `Language test passed for ${languageLabel}`;
  }

  if (data.integrityPassed === false) {
    return `Language test failed integrity checks for ${languageLabel}`;
  }

  if (data.status === LANGUAGE_TEST_STATUS.LOCKED) {
    return `Maximum attempts reached for ${languageLabel}`;
  }

  return `Language test failed for ${languageLabel}`;
};

export const startLanguageTest = asyncHandler(async (req, res) => {
  if (!ensureGuide(req, res)) return;

  const data = await languageTestService.startLanguageTest(req.user._id, req.body.language);

  return res.status(201).json({
    success: true,
    message: data.resumed
      ? `Existing ${getLanguageDisplayName(data.language)} test session resumed`
      : `${getLanguageDisplayName(data.language)} language test started successfully`,
    data,
  });
});

export const submitLanguageTestAnswers = asyncHandler(async (req, res) => {
  if (!ensureGuide(req, res)) return;

  const data = await languageTestService.submitLanguageTestAnswers(
    req.user._id,
    req.params.sessionId,
    req.body.answers,
  );

  return res.json({
    success: true,
    message: buildSubmitMessage(data),
    data,
  });
});

export const getLanguageTestStatus = asyncHandler(async (req, res) => {
  if (!ensureGuide(req, res)) return;

  const data = await languageTestService.getLanguageTestStatus(req.user._id);
  return res.json({ success: true, data });
});

export const getLanguageTestHistory = asyncHandler(async (req, res) => {
  if (!ensureGuide(req, res)) return;

  const data = await languageTestService.getLanguageTestHistory(
    req.user._id,
    req.query.language,
  );

  return res.json({ success: true, data });
});

export const getLanguageTestSession = asyncHandler(async (req, res) => {
  if (!ensureGuide(req, res)) return;

  const data = await languageTestService.getLanguageTestSession(
    req.user._id,
    req.params.sessionId,
  );

  return res.json({ success: true, data });
});

export const reportLanguageTestIntegrityEvents = asyncHandler(async (req, res) => {
  if (!ensureGuide(req, res)) return;

  const data = await languageTestService.reportLanguageTestIntegrityEvents(
    req.user._id,
    req.params.sessionId,
    req.body.events,
  );

  return res.json({
    success: true,
    message:
      data.warnings.length > 0
        ? "Integrity events recorded with warnings"
        : "Integrity events recorded",
    data,
  });
});

export const getQuestionTtsAudio = asyncHandler(async (req, res) => {
  if (!ensureGuide(req, res)) return;

  const data = await languageTestService.getQuestionTtsAudio(
    req.user._id,
    req.params.sessionId,
    req.params.questionId,
  );

  return res.json({ success: true, data });
});
