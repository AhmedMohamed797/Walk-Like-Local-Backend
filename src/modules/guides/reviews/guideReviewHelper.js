import mongoose from "mongoose";
import GuideProfile from "../models/guideProfileModel.js";
import GuideReview from "../models/guideReviewModel.js";
import { AppError } from "../../../utils/AppError.js";
import { REVIEW_SORT_FIELDS } from "../../../constants/reviewConstants.js";

export const sanitizeReview = (review, tourist = null) => ({
  _id: review._id,
  bookingId: review.bookingId,
  tourId: review.tourId,
  guideId: review.guideId,
  rating: review.rating,
  comment: review.comment,
  tourist: tourist
    ? {
        _id: tourist._id,
        fullName: tourist.fullName,
        profilePicture: tourist.profilePicture ?? null,
      }
    : undefined,
  createdAt: review.createdAt,
  updatedAt: review.updatedAt,
});

export const parseReviewSort = (sortParam) => {
  if (!sortParam || sortParam === "-createdAt") {
    return { createdAt: -1 };
  }

  if (sortParam === "createdAt") {
    return { createdAt: 1 };
  }

  if (sortParam === "-rating") {
    return { rating: -1 };
  }

  if (sortParam === "rating") {
    return { rating: 1 };
  }

  throw new AppError(
    `Invalid sort value. Use ${REVIEW_SORT_FIELDS.createdAt}, -${REVIEW_SORT_FIELDS.createdAt}, ${REVIEW_SORT_FIELDS.rating}, or -${REVIEW_SORT_FIELDS.rating}`,
    400,
  );
};

export const recalculateGuideRating = async (guideId) => {
  const guideObjectId = new mongoose.Types.ObjectId(guideId);

  const [stats] = await GuideReview.aggregate([
    { $match: { guideId: guideObjectId } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: "$rating" },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  const averageRating = stats ? Math.round(stats.averageRating * 10) / 10 : 0;
  const reviewCount = stats?.reviewCount ?? 0;

  await GuideProfile.findOneAndUpdate(
    { user: guideId },
    { rating: averageRating, reviewCount },
  );

  return { rating: averageRating, reviewCount };
};
