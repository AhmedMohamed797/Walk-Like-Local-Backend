import { Router } from "express";
import { authMiddleware } from "../../auth/authMiddleware.js";
import {
  submitVerificationDocuments,
  getVerificationStatus,
  resubmitVerificationDocuments,
} from "./touristVerificationController.js";
import {
  submitVerificationValidation,
  resubmitVerificationValidation,
  handleValidation,
} from "./touristVerificationValidation.js";

const router = Router();

router.post(
  "/verification",
  authMiddleware,
  submitVerificationValidation,
  handleValidation,
  submitVerificationDocuments,
);

router.get(
  "/verification-status",
  authMiddleware,
  getVerificationStatus,
);

router.patch(
  "/verification/resubmit",
  authMiddleware,
  resubmitVerificationValidation,
  handleValidation,
  resubmitVerificationDocuments,
);

export default router;