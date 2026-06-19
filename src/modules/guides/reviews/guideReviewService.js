import mongoose from "mongoose";
import GuideReview from "../models/guideReviewModel.js";
import Booking from "../../bookings/models/bookingModel.js";
import User from "../../users/userModel.js";
import { AppError } from "../../../utils/AppError.js";
import { BOOKING_STATUS } from "../../../constants/bookingConstants.js";
import { REVIEW_DEFAULTS } from "../../../constants/reviewConstants.js";
import {
  parseReviewSort,
  recalculateGuideRating,
  sanitizeReview,
} from "./guideReviewHelper.js";

const getReviewOrThrow = async (reviewId) => {
  const review = await GuideReview.findById(reviewId);
  if (!review) {
    throw new AppError("Review not found", 404);
  }
  return review;
};

const ensureReviewOwner = (review, touristId) => {
  if (review.touristId.toString() !== touristId.toString()) {
    throw new AppError("You are not authorized to manage this review", 403);
  }
};

const ensureCompletedBooking = async (bookingId, touristId) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError("Booking not found", 404);
  }

  if (booking.touristId.toString() !== touristId.toString()) {
    throw new AppError("You can only review your own bookings", 403);
  }

  if (booking.status !== BOOKING_STATUS.COMPLETED) {
    throw new AppError("You can only review completed tours", 400);
  }

  return booking;
};

const populateTouristsForReviews = async (reviews) => {
  if (!reviews.length) return reviews;

  const touristIds = [...new Set(reviews.map((review) => review.touristId.toString()))];
  const tourists = await User.find({ _id: { $in: touristIds } }).select("fullName profilePicture");
  const touristMap = new Map(tourists.map((tourist) => [tourist._id.toString(), tourist]));

  return reviews.map((review) =>
    sanitizeReview(review, touristMap.get(review.touristId.toString())),
  );
};

export const createReview = async (touristId, { bookingId, rating, comment }) => {
  const booking = await ensureCompletedBooking(bookingId, touristId);

  const existingReview = await GuideReview.findOne({ bookingId });
  if (existingReview) {
    throw new AppError("You have already reviewed this booking", 409);
  }

  const review = await GuideReview.create({
    bookingId: booking._id,
    touristId,
    guideId: booking.guideId,
    tourId: booking.tourId,
    rating,
    comment: comment ?? "",
  });

  const guideRating = await recalculateGuideRating(booking.guideId);

  return {
    review: sanitizeReview(review),
    guideRating,
  };
};

export const getReviewById = async (reviewId) => {
  const review = await getReviewOrThrow(reviewId);
  const [sanitized] = await populateTouristsForReviews([review]);
  return sanitized;
};

export const getReviewsByGuide = async (guideId, { page, limit, sort, minRating, maxRating }) => {
  const guide = await User.findOne({ _id: guideId, role: "GUIDE" });
  if (!guide) {
    throw new AppError("Guide not found", 404);
  }

  const filter = { guideId };
  if (minRating !== undefined || maxRating !== undefined) {
    filter.rating = {};
    if (minRating !== undefined) filter.rating.$gte = Number(minRating);
    if (maxRating !== undefined) filter.rating.$lte = Number(maxRating);
  }

  const skip = (page - 1) * limit;
  const sortQuery = parseReviewSort(sort);

  const [reviews, total] = await Promise.all([
    GuideReview.find(filter).sort(sortQuery).skip(skip).limit(limit),
    GuideReview.countDocuments(filter),
  ]);

  const results = await populateTouristsForReviews(reviews);

  return {
    results,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const getMyReviews = async (touristId, { page, limit, sort }) => {
  const filter = { touristId };
  const skip = (page - 1) * limit;
  const sortQuery = parseReviewSort(sort);

  const [reviews, total] = await Promise.all([
    GuideReview.find(filter).sort(sortQuery).skip(skip).limit(limit),
    GuideReview.countDocuments(filter),
  ]);

  return {
    results: reviews.map((review) => sanitizeReview(review)),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const getReceivedReviews = async (guideId, { page, limit, sort }) => {
  return getReviewsByGuide(guideId, { page, limit, sort });
};

export const updateReview = async (touristId, reviewId, { rating, comment }) => {
  const review = await getReviewOrThrow(reviewId);
  ensureReviewOwner(review, touristId);

  if (rating !== undefined) {
    review.rating = rating;
  }

  if (comment !== undefined) {
    review.comment = comment;
  }

  await review.save();
  const guideRating = await recalculateGuideRating(review.guideId);

  return {
    review: sanitizeReview(review),
    guideRating,
  };
};

export const deleteReview = async (touristId, reviewId) => {
  const review = await getReviewOrThrow(reviewId);
  ensureReviewOwner(review, touristId);

  const guideId = review.guideId;
  await review.deleteOne();
  const guideRating = await recalculateGuideRating(guideId);

  return { guideRating };
};

export const buildReviewListQuery = (query) => ({
  page: parseInt(query.page) || REVIEW_DEFAULTS.DEFAULT_PAGE,
  limit: parseInt(query.limit) || REVIEW_DEFAULTS.DEFAULT_LIMIT,
  sort: query.sort || REVIEW_DEFAULTS.DEFAULT_SORT,
  minRating: query.minRating,
  maxRating: query.maxRating,
});
