import { Router } from "express";
import { authMiddleware } from "../../auth/authMiddleware.js";
import {
  getMyProfile,
  updateMyProfile,
  updateMyProfilePhoto,
} from "./touristProfileController.js";
import {
  updateProfileValidation,
  updateProfilePhotoValidation,
  handleValidation,
} from "./touristProfileValidation.js";

const router = Router();

router.get("/profile", authMiddleware, getMyProfile);
router.patch("/profile", authMiddleware, updateProfileValidation, handleValidation, updateMyProfile);
router.patch("/profile/photo", authMiddleware, updateProfilePhotoValidation, handleValidation, updateMyProfilePhoto);

export default router;