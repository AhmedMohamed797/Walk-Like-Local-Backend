import mongoose from "mongoose";
import {
  INTEGRITY_EVENT_TYPE_VALUES,
  QUESTION_TYPE_VALUES,
  SESSION_STATUS_VALUES,
  ANSWER_INPUT_MODE,
} from "../../../constants/languageTestConstants.js";

const answerSchema = new mongoose.Schema(
  {
    questionId: {
      type: String,
      required: true,
    },
    answer: {
      type: String,
      trim: true,
      default: "",
    },
    transcript: {
      type: String,
      trim: true,
      default: null,
    },
    inputMode: {
      type: String,
      enum: Object.values(ANSWER_INPUT_MODE),
      default: ANSWER_INPUT_MODE.TEXT,
    },
    audioUrl: {
      type: String,
      default: null,
    },
    audioPublicId: {
      type: String,
      default: null,
    },
    audioMimeType: {
      type: String,
      default: null,
    },
  },
  { _id: false },
);

const questionSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: QUESTION_TYPE_VALUES,
      required: true,
    },
    question: {
      type: String,
      required: true,
    },
    ttsAudioUrl: {
      type: String,
      default: null,
    },
    ttsAudioPublicId: {
      type: String,
      default: null,
    },
    ttsMimeType: {
      type: String,
      default: "audio/mpeg",
    },
  },
  { _id: false },
);

const evaluationSchema = new mongoose.Schema(
  {
    overallScore: Number,
    pass: Boolean,
    feedback: String,
    issues: [String],
    likelyAiGenerated: Boolean,
    aiDetectionDetails: String,
    integrityPassed: Boolean,
    integrityFlags: [String],
    integrityViolations: [String],
  },
  { _id: false },
);

const integrityEventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: INTEGRITY_EVENT_TYPE_VALUES,
      required: true,
    },
    questionId: {
      type: String,
      default: null,
    },
    occurredAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const questionTimingSchema = new mongoose.Schema(
  {
    questionId: {
      type: String,
      required: true,
    },
    secondsSpent: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false },
);

const integrityResultSchema = new mongoose.Schema(
  {
    passed: Boolean,
    flags: [String],
    violations: [String],
    tabSwitchCount: Number,
    focusLossCount: Number,
    pasteCount: Number,
    copyCount: Number,
    visibilityHiddenCount: Number,
    totalDurationSeconds: Number,
    questionTimings: {
      type: [questionTimingSchema],
      default: [],
    },
  },
  { _id: false },
);

const languageTestSessionSchema = new mongoose.Schema(
  {
    guide: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GuideProfile",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    language: {
      type: String,
      required: true,
      trim: true,
    },
    attemptNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: SESSION_STATUS_VALUES,
      default: "IN_PROGRESS",
    },
    questions: {
      type: [questionSchema],
      default: [],
    },
    answers: {
      type: [answerSchema],
      default: [],
    },
    evaluation: {
      type: evaluationSchema,
      default: null,
    },
    integrityEvents: {
      type: [integrityEventSchema],
      default: [],
    },
    integrityResult: {
      type: integrityResultSchema,
      default: null,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

languageTestSessionSchema.index({ user: 1, status: 1 });
languageTestSessionSchema.index({ user: 1, language: 1, createdAt: -1 });
languageTestSessionSchema.index({ guide: 1, createdAt: -1 });

const LanguageTestSession = mongoose.model(
  "LanguageTestSession",
  languageTestSessionSchema,
);

export default LanguageTestSession;
