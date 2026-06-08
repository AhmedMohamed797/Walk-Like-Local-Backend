export const LANGUAGE_TEST_CONFIG = {
  PASS_SCORE: 70,
  QUESTIONS_COUNT: 5,
  WRITTEN_QUESTIONS_COUNT: 3,
  SPOKEN_QUESTIONS_COUNT: 2,
  MAX_ATTEMPTS_PER_LANGUAGE: 3,
  MAX_ANSWER_LENGTH: 200,
  MAX_LANGUAGE_LENGTH: 50,
  MIN_AUDIO_BYTES: 2_000,
  ANSWER_AUDIO_CLOUDINARY_FOLDER: "language-test/answers",
  TTS_AUDIO_CLOUDINARY_FOLDER: "language-test/tts",
  SESSION_EXPIRED_FEEDBACK:
    "The test session expired before all answers were submitted. This counts as a failed attempt.",
  SESSION_EXPIRY_HOURS: 2,
  TTS_VOICE: "nova",
  MIN_SESSION_DURATION_SECONDS: 90,
  MIN_WRITTEN_QUESTION_SECONDS: 8,
  MAX_TAB_SWITCHES: 2,
  MAX_FOCUS_LOSS_EVENTS: 8,
  MAX_PASTE_EVENTS: 0,
  MAX_INTEGRITY_EVENTS_PER_REQUEST: 50,
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

export const LANGUAGE_ISO_CODES = {
  english: "en",
  spanish: "es",
  french: "fr",
  german: "de",
  italian: "it",
  portuguese: "pt",
  arabic: "ar",
  chinese: "zh",
  japanese: "ja",
  korean: "ko",
  russian: "ru",
  turkish: "tr",
  dutch: "nl",
  hindi: "hi",
};
