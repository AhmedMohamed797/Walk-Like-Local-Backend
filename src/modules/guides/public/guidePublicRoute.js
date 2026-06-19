import { Router } from "express";
import { listGuides, getGuidePublicProfile } from "./guidePublicController.js";
import {
  getGuidePublicProfileValidation,
  handleValidation,
  listGuidesValidation,
} from "./guidePublicValidation.js";

const router = Router();

router.get("/", listGuidesValidation, handleValidation, listGuides);

router.get(
  "/:guideId",
  getGuidePublicProfileValidation,
  handleValidation,
  getGuidePublicProfile,
);

export default router;
