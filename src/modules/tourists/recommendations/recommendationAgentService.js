import { AppError } from "../../../utils/AppError.js";
import { buildGuideProfileText, buildTouristProfileText } from "./recommendationProfileText.js";

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

const getGeminiApiKey = () => process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
const getGeminiModel = () => process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;

const parseJsonObject = (value, fallback) => {
  try {
    const match = value?.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : fallback;
  } catch {
    return fallback;
  }
};

export const generateGeminiText = async (systemInstruction, userText, maxOutputTokens = 512) => {
  const apiKey = getGeminiApiKey();
  const model = getGeminiModel();

  if (!apiKey) {
    throw new AppError("Gemini API key is not configured", 503);
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: userText }],
          },
        ],
        generationConfig: {
          temperature: 0.25,
          maxOutputTokens,
        },
      }),
    },
  );

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload?.error?.message || response.statusText || "Gemini recommendation request failed";
    throw new AppError(message, response.status);
  }

  return (
    payload?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text)
      .filter(Boolean)
      .join("")
      .trim() || ""
  );
};

export const craftSearchQuery = async (touristProfile) => {
  const profileText = buildTouristProfileText(touristProfile);
  const systemPrompt = `You are a travel matching assistant. Convert a tourist profile into one dense semantic search paragraph.
Capture nationality, preferred languages, interests, travel style, and the kind of local guide who would be a strong fit.
Output only the paragraph.`;

  try {
    const query = await generateGeminiText(systemPrompt, profileText, 180);
    return query || profileText;
  } catch {
    return profileText;
  }
};

export const explainGuideMatches = async (touristProfile, matches) => {
  if (!matches.length) {
    return { summary: "No matching guides were found.", recommendations: [] };
  }

  const touristText = buildTouristProfileText(touristProfile);
  const guideContext = matches
    .map(
      (match, index) => `Candidate ${index + 1}
Score: ${(match.score * 100).toFixed(0)}%
Matched excerpt: ${match.matchedText}
${buildGuideProfileText(match.guide)}`,
    )
    .join("\n\n");

  const systemPrompt = `You are a concise travel concierge. Explain why each recommended guide fits the tourist.
Return valid JSON only in this shape:
{
  "summary": "one short overall sentence",
  "recommendations": [
    { "rank": 1, "guideId": "...", "reasoning": "2 short sentences" }
  ]
}`;

  const fallback = {
    summary: "Guides were ranked by profile similarity, language fit, and shared interests.",
    recommendations: [],
  };

  try {
    const raw = await generateGeminiText(
      systemPrompt,
      `Tourist profile:\n${touristText}\n\nRanked guide candidates:\n${guideContext}`,
      700,
    );
    return parseJsonObject(raw, { ...fallback, summary: raw || fallback.summary });
  } catch {
    return fallback;
  }
};
