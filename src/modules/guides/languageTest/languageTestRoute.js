import { Router } from "express";
import { authMiddleware } from "../../auth/authMiddleware.js";
import {
  getLanguageTestHistory,
  getLanguageTestSession,
  getLanguageTestStatus,
  getQuestionTtsAudio,
  reportLanguageTestIntegrityEvents,
  startLanguageTest,
  submitLanguageTestAnswers,
} from "./languageTestController.js";
import {
  handleValidation,
  historyLanguageQueryValidation,
  integrityEventsValidation,
  questionIdValidation,
  sessionIdValidation,
  startLanguageTestValidation,
  submitLanguageTestValidation,
} from "./languageTestValidation.js";

const router = Router();

router.get("/language-test/status", authMiddleware, getLanguageTestStatus);

router.get(
  "/language-test/history",
  authMiddleware,
  historyLanguageQueryValidation,
  handleValidation,
  getLanguageTestHistory,
);

router.post(
  "/language-test/start",
  authMiddleware,
  startLanguageTestValidation,
  handleValidation,
  startLanguageTest,
);

router.get(
  "/language-test/:sessionId/questions/:questionId/audio",
  authMiddleware,
  questionIdValidation,
  handleValidation,
  getQuestionTtsAudio,
);

router.post(
  "/language-test/:sessionId/integrity-events",
  authMiddleware,
  integrityEventsValidation,
  handleValidation,
  reportLanguageTestIntegrityEvents,
);

router.post(
  "/language-test/:sessionId/submit",
  authMiddleware,
  submitLanguageTestValidation,
  handleValidation,
  submitLanguageTestAnswers,
);

router.get(
  "/language-test/:sessionId",
  authMiddleware,
  sessionIdValidation,
  handleValidation,
  getLanguageTestSession,
);

export default router;
