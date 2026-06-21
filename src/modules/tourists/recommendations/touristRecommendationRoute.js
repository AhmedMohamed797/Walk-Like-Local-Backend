import { Router } from "express";
import { authMiddleware } from "../../auth/authMiddleware.js";
import { getRecommendedGuides } from "./touristRecommendationController.js";
import {
  handleValidation,
  recommendationValidation,
} from "./touristRecommendationValidation.js";

const router = Router();

router.get(
  "/recommendations",
  authMiddleware,
  recommendationValidation,
  handleValidation,
  getRecommendedGuides,
);

export default router;
