import * as guideReviewService from "./guideReviewService.js";
import { asyncHandler } from "../../../middlewares/error.middleware.js";
import { ROLES } from "../../../constants/roles.js";

const ensureTourist = (req, res) => {
  if (req.user.role !== ROLES.TOURIST) {
    res.status(403).json({
      success: false,
      message: "Only tourists can perform this action",
    });
    return false;
  }
  return true;
};

const ensureGuide = (req, res) => {
  if (req.user.role !== ROLES.GUIDE) {
    res.status(403).json({
      success: false,
      message: "Only guides can perform this action",
    });
    return false;
  }
  return true;
};

export const createReview = asyncHandler(async (req, res) => {
  if (!ensureTourist(req, res)) return;

  const { review, guideRating } = await guideReviewService.createReview(req.user._id, req.body);

  return res.status(201).json({
    success: true,
    message: "Review submitted successfully",
    data: review,
    guideRating,
  });
});

export const getReviewById = asyncHandler(async (req, res) => {
  const review = await guideReviewService.getReviewById(req.params.reviewId);

  return res.json({
    success: true,
    data: review,
  });
});

export const getReviewsByGuide = asyncHandler(async (req, res) => {
  const { results, pagination } = await guideReviewService.getReviewsByGuide(
    req.params.guideId,
    guideReviewService.buildReviewListQuery(req.query),
  );

  return res.json({
    success: true,
    data: results,
    pagination,
  });
});

export const getMyReviews = asyncHandler(async (req, res) => {
  if (!ensureTourist(req, res)) return;

  const { results, pagination } = await guideReviewService.getMyReviews(
    req.user._id,
    guideReviewService.buildReviewListQuery(req.query),
  );

  return res.json({
    success: true,
    data: results,
    pagination,
  });
});

export const getReceivedReviews = asyncHandler(async (req, res) => {
  if (!ensureGuide(req, res)) return;

  const { results, pagination } = await guideReviewService.getReceivedReviews(
    req.user._id,
    guideReviewService.buildReviewListQuery(req.query),
  );

  return res.json({
    success: true,
    data: results,
    pagination,
  });
});

export const updateReview = asyncHandler(async (req, res) => {
  if (!ensureTourist(req, res)) return;

  const { review, guideRating } = await guideReviewService.updateReview(
    req.user._id,
    req.params.reviewId,
    req.body,
  );

  return res.json({
    success: true,
    message: "Review updated successfully",
    data: review,
    guideRating,
  });
});

export const deleteReview = asyncHandler(async (req, res) => {
  if (!ensureTourist(req, res)) return;

  const { guideRating } = await guideReviewService.deleteReview(req.user._id, req.params.reviewId);

  return res.json({
    success: true,
    message: "Review deleted successfully",
    guideRating,
  });
});
