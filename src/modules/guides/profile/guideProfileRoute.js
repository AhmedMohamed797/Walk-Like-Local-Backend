import { Router } from "express";
import { authMiddleware } from "../../auth/authMiddleware.js";
import {
  getGuideProfile,
  setGuideLanguages,
  updateGuideProfile,
} from "./guideProfileController.js";
import {
  handleValidation,
  setGuideLanguagesValidation,
  updateGuideProfileValidation,
} from "./guideProfileValidation.js";

const router = Router();

router.get("/profile", authMiddleware, getGuideProfile);

router.patch(
  "/profile",
  authMiddleware,
  updateGuideProfileValidation,
  handleValidation,
  updateGuideProfile,
);

router.put(
  "/profile/languages",
  authMiddleware,
  setGuideLanguagesValidation,
  handleValidation,
  setGuideLanguages,
);

export default router;
