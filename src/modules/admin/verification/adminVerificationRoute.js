import { Router } from "express";
import { authMiddleware } from "../../auth/authMiddleware.js";
import {
  getPendingGuideVerifications,
  getGuideVerificationDetails,
  approveGuideDocuments,
  rejectGuideDocuments,
  getPendingTouristVerifications,
  getTouristVerificationDetails,
  approveTouristPassport,
  rejectTouristPassport,
} from "./adminVerificationController.js";
import {
  guideIdValidation,
  touristIdValidation,
  rejectGuideValidation,
  rejectTouristValidation,
  paginationValidation,
  handleValidation,
} from "./adminVerificationValidation.js";

const router = Router();

router.get(
  "/guides/verifications",
  authMiddleware,
  paginationValidation,
  handleValidation,
  getPendingGuideVerifications,
);

router.get(
  "/guides/verifications/:guideId",
  authMiddleware,
  guideIdValidation,
  handleValidation,
  getGuideVerificationDetails,
);

router.patch(
  "/guides/verifications/:guideId/approve",
  authMiddleware,
  guideIdValidation,
  handleValidation,
  approveGuideDocuments,
);

router.patch(
  "/guides/verifications/:guideId/reject",
  authMiddleware,
  rejectGuideValidation,
  handleValidation,
  rejectGuideDocuments,
);

router.get(
  "/tourists/verifications",
  authMiddleware,
  paginationValidation,
  handleValidation,
  getPendingTouristVerifications,
);

router.get(
  "/tourists/verifications/:touristId",
  authMiddleware,
  touristIdValidation,
  handleValidation,
  getTouristVerificationDetails,
);

router.patch(
  "/tourists/verifications/:touristId/approve",
  authMiddleware,
  touristIdValidation,
  handleValidation,
  approveTouristPassport,
);

router.patch(
  "/tourists/verifications/:touristId/reject",
  authMiddleware,
  rejectTouristValidation,
  handleValidation,
  rejectTouristPassport,
);

export default router;