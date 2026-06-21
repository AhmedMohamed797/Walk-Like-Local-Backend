import GuideProfile from "../../guides/models/guideProfileModel.js";
import TouristProfile from "../models/touristProfileModel.js";
import { AppError } from "../../../utils/AppError.js";
import { ACCOUNT_VERIFICATION_STATUS } from "../../../constants/verificationStatus.js";
import { craftSearchQuery, explainGuideMatches } from "./recommendationAgentService.js";
import { indexTouristProfile } from "./recommendationIndexService.js";
import {
  rankGuideChunks,
  resolveRankedGuideProfiles,
  searchGuideChunks,
  searchGuidesByRules,
} from "./recommendationSearchService.js";

const toMatchPercent = (score) => Math.min(Math.max(Math.round((score || 0) * 100), 0), 99);

const formatGuideMatch = (match, index, reasoning) => ({
  rank: index + 1,
  guideProfileId: match.guide._id,
  guideId: match.guide.user?._id || match.guide.user,
  fullName: match.guide.user?.fullName || null,
  email: match.guide.user?.email || null,
  nationality: match.guide.nationality || null,
  bio: match.guide.bio || null,
  interests: match.guide.interests || [],
  experience: {
    year: match.guide.experience?.year || null,
  },
  languages: match.guide.languages || [],
  verifiedLanguages: match.guide.verifiedLanguages || [],
  rating: match.guide.rating ?? 0,
  reviewCount: match.guide.reviewCount ?? 0,
  score: Number((match.score || 0).toFixed(4)),
  matchPercent: toMatchPercent(match.score),
  matchedText: match.matchedText,
  reasoning:
    reasoning ||
    "Strong overlap with the tourist profile, language preferences, and guide specialties.",
});

export const getRecommendedGuidesForTourist = async (touristId, limit = 10) => {
  const touristProfile = await TouristProfile.findOne({ user: touristId })
    .populate("user", "fullName")
    .lean();

  if (!touristProfile) {
    throw new AppError("Tourist profile not found", 404);
  }

  const verifiedGuideCount = await GuideProfile.countDocuments({
    accountVerificationStatus: ACCOUNT_VERIFICATION_STATUS.VERIFIED,
  });

  if (!verifiedGuideCount) {
    return {
      agentQuery: null,
      matchMethod: "none",
      matches: [],
      agentInsights: {
        summary: "No verified guides are available yet.",
        recommendations: [],
      },
    };
  }

  try {
    await indexTouristProfile(touristId);
  } catch (error) {
    console.warn(
      "[recommendations] Tourist profile indexing failed, continuing with fallback search:",
      error.message,
    );
  }

  const agentQuery = await craftSearchQuery(touristProfile);
  let matches = [];
  let matchMethod = "none";

  try {
    const vectorSearch = await searchGuideChunks(agentQuery, Math.max(limit * 5, 20));
    const ranked = rankGuideChunks(vectorSearch.chunks);
    matches = await resolveRankedGuideProfiles(ranked, limit);
    matchMethod = matches.length ? vectorSearch.method : "none";
  } catch (error) {
    console.warn(
      "[recommendations] Vector search failed, continuing with rule fallback:",
      error.message,
    );
  }

  if (!matches.length) {
    const ranked = await searchGuidesByRules(touristProfile, limit);
    matches = ranked.map((item) => ({
      guide: item.guide,
      score: item.score,
      matchedText: item.matchedText,
    }));
    matchMethod = matches.length ? "rules" : "none";
  }

  const agentInsights = await explainGuideMatches(touristProfile, matches);
  const reasoningByRank = new Map(
    (agentInsights.recommendations || []).map((item) => [Number(item.rank), item.reasoning]),
  );

  return {
    agentQuery,
    matchMethod,
    matches: matches.map((match, index) =>
      formatGuideMatch(match, index, reasoningByRank.get(index + 1)),
    ),
    agentInsights,
  };
};
