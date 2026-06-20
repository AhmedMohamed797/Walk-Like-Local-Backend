import { AppError } from "../../../utils/AppError.js";

const HF_API_URL = "https://router.huggingface.co/hf-inference/models";
const DEFAULT_EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2";

const getApiKey = () => process.env.HUGGINGFACE_API_KEY || process.env.HF_API_KEY;

const cleanEnvValue = (value) => String(value || "").trim().replace(/^['"]|['"]$/g, "");

export const getEmbeddingModel = () =>
  cleanEnvValue(
    process.env.HUGGINGFACE_EMBEDDING_MODEL ||
      process.env.HF_EMBEDDING_MODEL ||
      DEFAULT_EMBEDDING_MODEL,
  );

const meanPool = (tokens) => {
  if (!Array.isArray(tokens) || !tokens.length) return [];
  if (typeof tokens[0] === "number") return tokens;

  const dimensions = tokens[0]?.length || 0;
  if (!dimensions) return [];

  const pooled = Array(dimensions).fill(0);
  for (const token of tokens) {
    for (let i = 0; i < dimensions; i += 1) {
      pooled[i] += Number(token[i]) || 0;
    }
  }

  return pooled.map((value) => value / tokens.length);
};

const isNumberVector = (value) => Array.isArray(value) && typeof value[0] === "number";

const normalizeEmbeddingResponse = (payload, expectedCount) => {
  if (!Array.isArray(payload)) return [];

  if (expectedCount === 1) {
    if (isNumberVector(payload)) return [payload];
    if (payload.length === 1 && Array.isArray(payload[0])) return [meanPool(payload[0])];
    return [meanPool(payload)];
  }

  return payload.map(meanPool);
};

export const createEmbeddings = async (texts) => {
  const inputs = Array.isArray(texts) ? texts : [texts];
  const apiKey = getApiKey();
  const model = getEmbeddingModel();
  const endpoint =
    process.env.HUGGINGFACE_EMBEDDING_URL ||
    `${HF_API_URL}/${model}/pipeline/feature-extraction`;

  if (!apiKey) {
    throw new AppError("Hugging Face API key is not configured", 503);
  }

  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs,
        options: { wait_for_model: true },
      }),
    });
  } catch (error) {
    throw new AppError(`Hugging Face embedding fetch failed: ${error.message}`, 503);
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.error || response.statusText || "Hugging Face embedding request failed";
    throw new AppError(message, response.status);
  }

  const embeddings = normalizeEmbeddingResponse(payload, inputs.length);
  if (embeddings.length !== inputs.length || embeddings.some((item) => !item.length)) {
    throw new AppError("Unexpected Hugging Face embedding response format", 502);
  }

  return embeddings;
};

export const createEmbedding = async (text) => {
  const [embedding] = await createEmbeddings([text]);
  return embedding;
};
