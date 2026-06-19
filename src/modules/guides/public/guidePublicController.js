import * as guidePublicService from "./guidePublicService.js";
import { asyncHandler } from "../../../middlewares/error.middleware.js";
import { GUIDE_LIST_DEFAULTS } from "../../../constants/reviewConstants.js";

export const listGuides = asyncHandler(async (req, res) => {
  const { results, pagination } = await guidePublicService.listGuides({
    page: parseInt(req.query.page) || GUIDE_LIST_DEFAULTS.DEFAULT_PAGE,
    limit: parseInt(req.query.limit) || GUIDE_LIST_DEFAULTS.DEFAULT_LIMIT,
    sortBy: req.query.sortBy,
    sortOrder: req.query.sortOrder,
    minRating: req.query.minRating,
    maxRating: req.query.maxRating,
    minReviewCount: req.query.minReviewCount,
    language: req.query.language,
    search: req.query.search,
  });

  return res.json({
    success: true,
    data: results,
    pagination,
  });
});

export const getGuidePublicProfile = asyncHandler(async (req, res) => {
  const profile = await guidePublicService.getGuidePublicProfile(req.params.guideId);

  return res.json({
    success: true,
    data: profile,
  });
});
