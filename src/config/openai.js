import { AppError } from "../utils/AppError.js";

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_SPEECH_URL = "https://api.openai.com/v1/audio/speech";
const OPENAI_TRANSCRIPTION_URL = "https://api.openai.com/v1/audio/transcriptions";
const DEFAULT_MODEL = "gpt-4o-mini";

const getApiKey = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new AppError("OpenAI API key is not configured", 503);
  }
  return apiKey;
};

export const createChatCompletion = async ({
  messages,
  model = DEFAULT_MODEL,
  temperature = 0.6,
  responseFormat,
}) => {
  const body = {
    model,
    messages,
    temperature,
  };

  if (responseFormat) {
    body.response_format = responseFormat;
  }

  const response = await fetch(OPENAI_CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("[OpenAI Chat]", response.status, errorBody);
    throw new AppError("Language test evaluation is temporarily unavailable", 503);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new AppError("Invalid response from language evaluation service", 503);
  }

  return content;
};

export const createSpeech = async ({ text, voice = "nova" }) => {
  const response = await fetch(OPENAI_SPEECH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini-tts",
      input: text,
      voice,
      response_format: "mp3",
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("[OpenAI TTS]", response.status, errorBody);
    throw new AppError("Question audio generation is temporarily unavailable", 503);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

export const transcribeAudio = async ({ audioBuffer, languageCode, mimeType = "audio/webm" }) => {
  const extension = mimeType.includes("mp4") ? "mp4" : mimeType.includes("mpeg") ? "mp3" : "webm";
  const formData = new FormData();
  const blob = new Blob([audioBuffer], { type: mimeType });

  formData.append("file", blob, `recording.${extension}`);
  formData.append("model", "gpt-4o-mini-transcribe");

  if (languageCode) {
    formData.append("language", languageCode);
  }

  const response = await fetch(OPENAI_TRANSCRIPTION_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("[OpenAI Whisper]", response.status, errorBody);
    throw new AppError("Speech transcription is temporarily unavailable", 503);
  }

  const data = await response.json();
  const text = String(data.text || "").trim();

  if (!text) {
    throw new AppError("Could not transcribe the spoken answer", 400);
  }

  return text;
};
