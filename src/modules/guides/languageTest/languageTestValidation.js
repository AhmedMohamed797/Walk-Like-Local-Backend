import { body, param, query, validationResult } from "express-validator";
import {
  INTEGRITY_EVENT_TYPE_VALUES,
  LANGUAGE_TEST_CONFIG,
  SUPPORTED_LANGUAGE_CODES,
} from "../../../constants/languageTestConstants.js";

export const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
    });
  }
  next();
};

export const startLanguageTestValidation = [
  body("language")
    .trim()
    .notEmpty()
    .withMessage("Language code is required")
    .isLength({ max: LANGUAGE_TEST_CONFIG.MAX_LANGUAGE_CODE_LENGTH })
    .withMessage(
      `Language code must be at most ${LANGUAGE_TEST_CONFIG.MAX_LANGUAGE_CODE_LENGTH} characters`,
    )
    .custom((value) => {
      const code = String(value).trim().toLowerCase();

      if (!SUPPORTED_LANGUAGE_CODES.includes(code)) {
        throw new Error(
          `Unsupported language code: ${value}. Supported codes: ${SUPPORTED_LANGUAGE_CODES.join(", ")}`,
        );
      }

      return true;
    }),
];

export const submitLanguageTestValidation = [
  param("sessionId").isMongoId().withMessage("A valid session id is required"),

  body("answers").isArray({ min: 1 }).withMessage("Answers must be a non-empty array"),

  body("answers.*.questionId")
    .trim()
    .notEmpty()
    .withMessage("Each answer must include a questionId"),

  body("answers.*.answer")
    .optional()
    .isString()
    .isLength({ max: LANGUAGE_TEST_CONFIG.MAX_ANSWER_LENGTH })
    .withMessage(
      `Text answers must be at most ${LANGUAGE_TEST_CONFIG.MAX_ANSWER_LENGTH} characters`,
    ),

  body("answers.*.audioUrl")
    .optional()
    .trim()
    .isURL()
    .withMessage("audioUrl must be a valid URL"),

  body("answers.*.audioMimeType")
    .optional()
    .isString()
    .withMessage("audioMimeType must be a string"),
];

export const integrityEventsValidation = [
  param("sessionId").isMongoId().withMessage("A valid session id is required"),

  body("events")
    .isArray({ min: 1, max: LANGUAGE_TEST_CONFIG.MAX_INTEGRITY_EVENTS_PER_REQUEST })
    .withMessage("events must be a non-empty array"),

  body("events.*.type")
    .trim()
    .notEmpty()
    .withMessage("Each integrity event must include a type")
    .isIn(INTEGRITY_EVENT_TYPE_VALUES)
    .withMessage("Invalid integrity event type"),

  body("events.*.questionId")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("questionId must be a non-empty string when provided"),

  body("events.*.occurredAt")
    .optional()
    .isISO8601()
    .withMessage("occurredAt must be a valid ISO date"),
];

export const sessionIdValidation = [
  param("sessionId").isMongoId().withMessage("A valid session id is required"),
];

export const questionIdValidation = [
  ...sessionIdValidation,
  param("questionId").trim().notEmpty().withMessage("A valid question id is required"),
];

export const historyLanguageQueryValidation = [
  query("language")
    .optional()
    .trim()
    .custom((value) => {
      const code = String(value).trim().toLowerCase();

      if (!SUPPORTED_LANGUAGE_CODES.includes(code)) {
        throw new Error(
          `Unsupported language code: ${value}. Supported codes: ${SUPPORTED_LANGUAGE_CODES.join(", ")}`,
        );
      }

      return true;
    }),
];
