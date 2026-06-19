import { Router } from "express";
import { authMiddleware } from "../../auth/authMiddleware.js";
import {
  createReview,
  deleteReview,
  getMyReviews,
  getReceivedReviews,
  getReviewById,
  getReviewsByGuide,
  updateReview,
} from "./guideReviewController.js";
import {
  createReviewValidation,
  deleteReviewValidation,
  getReviewByIdValidation,
  getReviewsByGuideValidation,
  handleValidation,
  listMyReviewsValidation,
  updateReviewValidation,
} from "./guideReviewValidation.js";

const router = Router();

router.post(
  "/reviews",
  authMiddleware,
  createReviewValidation,
  handleValidation,
  createReview,
);

router.get(
  "/reviews/my",
  authMiddleware,
  listMyReviewsValidation,
  handleValidation,
  getMyReviews,
);

router.get(
  "/reviews/received",
  authMiddleware,
  listMyReviewsValidation,
  handleValidation,
  getReceivedReviews,
);

router.get(
  "/reviews/guide/:guideId",
  getReviewsByGuideValidation,
  handleValidation,
  getReviewsByGuide,
);

router.get(
  "/reviews/:reviewId",
  getReviewByIdValidation,
  handleValidation,
  getReviewById,
);

router.patch(
  "/reviews/:reviewId",
  authMiddleware,
  updateReviewValidation,
  handleValidation,
  updateReview,
);

router.delete(
  "/reviews/:reviewId",
  authMiddleware,
  deleteReviewValidation,
  handleValidation,
  deleteReview,
);

export default router;
