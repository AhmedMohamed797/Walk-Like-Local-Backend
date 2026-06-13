import { Router } from "express";
import authRoutes from "../modules/auth/authRoute.js";
import guideProfileRoutes from "../modules/guides/profile/guideProfileRoute.js";
import guideVerificationRoutes from "../modules/guides/verification/guideVerificationRoute.js";
import languageTestRoutes from "../modules/guides/languageTest/languageTestRoute.js";
import touristProfileRoutes from "../modules/tourists/profile/touristProfileRoute.js";
import touristVerificationRoutes from "../modules/tourists/verification/touristVerificationRoute.js";
import adminVerificationRoutes from "../modules/admin/verification/adminVerificationRoute.js";
import tourRoutes from "../modules/tours/tourRoute.js";
import adminUserManagementRoutes from "../modules/admin/user-management/adminUserRoute.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/guides", guideProfileRoutes);
router.use("/guides", guideVerificationRoutes);
router.use("/guides", languageTestRoutes);
router.use("/tourists", touristProfileRoutes);
router.use("/tourists", touristVerificationRoutes);
router.use("/admin", adminVerificationRoutes);
router.use("/tours", tourRoutes);
router.use("/admin", adminUserManagementRoutes);

router.get("/health", (req, res) => {
  res.json({ success: true, message: "Server is running" });
});

export default router;
