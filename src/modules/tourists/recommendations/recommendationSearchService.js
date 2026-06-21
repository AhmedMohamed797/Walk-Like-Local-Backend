import GuideProfile from "../../guides/models/guideProfileModel.js";
import ProfileChunk from "./profileChunkModel.js";
import { createEmbedding } from "./recommendationEmbeddingService.js";
import { buildGuideProfileText } from "./recommendationProfileText.js";
import { ACCOUNT_VERIFICATION_STATUS } from "../../../constants/verificationStatus.js";

const cosineSimilarity = (a, b) => {
  if (!Array.isArray(a) || !Array.isArray(b) || !a.length || a.length !== b.length) {
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dot / denominator;
};

const normalize = (value) => String(value || "").toLowerCase().trim();

const tokenize = (items) =>
  (Array.isArray(items) ? items : [items])
    .flatMap((item) => normalize(item).split(/[^a-z0-9\u0600-\u06ff]+/i))
    .filter((token) => token.length >= 2);

const tokenOverlap = (leftTokens, rightTokens) => {
  let matches = 0;

  for (const left of leftTokens) {
    if (rightTokens.some((right) => left === right || left.includes(right) || right.includes(left))) {
      matches += 1;
    }
  }

  return matches;
};

const aggregateChunkScores = (chunks) => {
  const byGuide = new Map();

  for (const chunk of chunks) {
    const id = chunk.profileId.toString();
    const existing = byGuide.get(id);

    if (!existing || chunk.score > existing.score) {
      byGuide.set(id, {
        profileId: chunk.profileId,
        score: chunk.score,
        matchedText: chunk.text,
      });
    }
  }

  return [...byGuide.values()].sort((a, b) => b.score - a.score);
};

const searchGuideChunksInMemory = async (queryEmbedding, limit) => {
  const chunks = await ProfileChunk.find({ profileType: "guide" })
    .select("profileId text embedding")
    .lean();

  return chunks
    .map((chunk) => ({
      profileId: chunk.profileId,
      text: chunk.text,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }))
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};

export const searchGuideChunks = async (queryText, limit = 20) => {
  const queryEmbedding = await createEmbedding(queryText);
  const pipeline = [
    {
      $vectorSearch: {
        index: "profile_vector_index",
        path: "embedding",
        queryVector: queryEmbedding,
        numCandidates: Math.max(limit * 10, 100),
        limit,
        filter: { profileType: { $eq: "guide" } },
      },
    },
    {
      $project: {
        profileId: 1,
        text: 1,
        score: { $meta: "vectorSearchScore" },
      },
    },
  ];

  try {
    const atlasResults = await ProfileChunk.aggregate(pipeline);
    if (atlasResults.length) {
      return { method: "atlas-vector", chunks: atlasResults };
    }
  } catch (error) {
    console.warn("Atlas vector search unavailable, using in-memory fallback:", error.message);
  }

  const memoryResults = await searchGuideChunksInMemory(queryEmbedding, limit);
  return { method: memoryResults.length ? "memory-vector" : "none", chunks: memoryResults };
};

export const searchGuidesByRules = async (touristProfile, limit = 10) => {
  const guides = await GuideProfile.find({
    accountVerificationStatus: ACCOUNT_VERIFICATION_STATUS.VERIFIED,
  })
    .populate("user", "fullName")
    .lean();

  const touristLanguages = tokenize(touristProfile.preferredLanguages);
  const touristInterests = tokenize(touristProfile.interests);
  const touristPreferences = tokenize(touristProfile.travelPreferences);
  const touristNationality = tokenize(touristProfile.nationality);
  const maxPossible =
    touristLanguages.length * 3 +
    touristInterests.length * 2 +
    touristPreferences.length * 2 +
    touristNationality.length;

  return guides
    .map((guide) => {
      const guideLanguages = tokenize([...(guide.languages || []), ...(guide.verifiedLanguages || [])]);
      const guideInterests = tokenize(guide.interests);
      const guideBio = tokenize(guide.bio);
      const guideNationality = tokenize(guide.nationality);

      let points = 0;
      points += tokenOverlap(touristLanguages, guideLanguages) * 3;
      points += tokenOverlap(touristInterests, [...guideInterests, ...guideBio]) * 2;
      points += tokenOverlap(touristPreferences, [...guideInterests, ...guideBio]) * 2;
      points += tokenOverlap(touristNationality, guideNationality);

      const score = maxPossible > 0 ? points / maxPossible : 0;
      return {
        profileId: guide._id,
        guide,
        matchedText: buildGuideProfileText(guide),
        score: Math.min(score, 1),
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};

export const resolveRankedGuideProfiles = async (ranked, limit) => {
  const guideIds = ranked.map((item) => item.profileId);
  const guides = await GuideProfile.find({
    _id: { $in: guideIds },
    accountVerificationStatus: ACCOUNT_VERIFICATION_STATUS.VERIFIED,
  })
    .populate("user", "fullName email")
    .lean();
  const guideMap = new Map(guides.map((guide) => [guide._id.toString(), guide]));

  return ranked
    .map((item) => {
      const guide = guideMap.get(item.profileId.toString());
      if (!guide) return null;

      return {
        guide,
        score: item.score,
        matchedText: item.matchedText,
      };
    })
    .filter(Boolean)
    .slice(0, limit);
};

export const rankGuideChunks = aggregateChunkScores;
