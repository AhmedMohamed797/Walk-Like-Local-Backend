import * as recommendationService from "./touristRecommendationService.js";
import { asyncHandler } from "../../../middlewares/error.middleware.js";
import { ROLES } from "../../../constants/roles.js";

export const getRecommendedGuides = asyncHandler(async (req, res) => {
  if (req.user.role !== ROLES.TOURIST) {
    return res.status(403).json({
      success: false,
      message: "Only tourists can access guide recommendations",
    });
  }

  const limit = Number(req.query.limit) || 10;
  const data = await recommendationService.getRecommendedGuidesForTourist(
    req.user._id,
    limit,
  );

  return res.json({
    success: true,
    data,
  });
});
