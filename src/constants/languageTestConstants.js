export const LANGUAGE_TEST_CONFIG = {
  PASS_SCORE: 60,
  QUESTIONS_COUNT: 5,
  WRITTEN_QUESTIONS_COUNT: 3,
  SPOKEN_QUESTIONS_COUNT: 2,
  MAX_ATTEMPTS_PER_LANGUAGE: 3,
  MAX_ANSWER_LENGTH: 200,
  MAX_LANGUAGE_CODE_LENGTH: 10,
  MIN_AUDIO_BYTES: 2_000,
  ANSWER_AUDIO_CLOUDINARY_FOLDER: "language-test/answers",
  TTS_AUDIO_CLOUDINARY_FOLDER: "language-test/tts",
  SESSION_EXPIRED_FEEDBACK:
    "The test session expired before all answers were submitted. This counts as a failed attempt.",
  SESSION_EXPIRY_HOURS: 2,
  TTS_VOICE: "nova",
  MIN_SESSION_DURATION_SECONDS: 90,
  MAX_TAB_SWITCHES: 2,
  MAX_FOCUS_LOSS_EVENTS: 8,
  MAX_PASTE_EVENTS: 0,
  MAX_INTEGRITY_EVENTS_PER_REQUEST: 50,
};

export const SUPPORTED_LANGUAGES = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  ar: "Arabic",
  zh: "Chinese",
  ja: "Japanese",
  ko: "Korean",
  ru: "Russian",
  tr: "Turkish",
  nl: "Dutch",
  hi: "Hindi",
};

export const SUPPORTED_LANGUAGE_CODES = Object.keys(SUPPORTED_LANGUAGES);

export const getLanguageDisplayName = (code) =>
  SUPPORTED_LANGUAGES[String(code || "").trim().toLowerCase()] || code;

export const resolveSupportedLanguageCode = (languageCode) => {
  const code = String(languageCode || "").trim().toLowerCase();

  if (!SUPPORTED_LANGUAGE_CODES.includes(code)) {
    throw new Error(
      `Unsupported language code: ${languageCode}. Supported codes: ${SUPPORTED_LANGUAGE_CODES.join(", ")}`,
    );
  }

  return code;
};

export const INTEGRITY_EVENT_TYPE = {
  TAB_SWITCH: "TAB_SWITCH",
  FOCUS_LOSS: "FOCUS_LOSS",
  PASTE: "PASTE",
  COPY: "COPY",
  VISIBILITY_HIDDEN: "VISIBILITY_HIDDEN",
};

export const INTEGRITY_EVENT_TYPE_VALUES = Object.values(INTEGRITY_EVENT_TYPE);

export const QUESTION_TYPE = {
  WRITTEN: "written",
  SPOKEN: "spoken",
};

export const QUESTION_TYPE_VALUES = Object.values(QUESTION_TYPE);

export const ANSWER_INPUT_MODE = {
  TEXT: "text",
  AUDIO: "audio",
};

export const SESSION_STATUS = {
  IN_PROGRESS: "IN_PROGRESS",
  PASSED: "PASSED",
  FAILED: "FAILED",
  LOCKED: "LOCKED",
  EXPIRED: "EXPIRED",
};

export const SESSION_STATUS_VALUES = Object.values(SESSION_STATUS);
