import { Router } from "express";
import authRoutes from "../modules/auth/authRoute.js";
import guideProfileRoutes from "../modules/guides/profile/guideProfileRoute.js";
import guideVerificationRoutes from "../modules/guides/verification/guideVerificationRoute.js";
import touristProfileRoutes from "../modules/tourists/profile/touristProfileRoute.js";
import touristVerificationRoutes from "../modules/tourists/verification/touristVerificationRoute.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/guides", guideProfileRoutes);
router.use("/guides", guideVerificationRoutes);
router.use("/tourists", touristProfileRoutes);
router.use("/tourists", touristVerificationRoutes);

router.get("/health", (req, res) => {
  res.json({ success: true, message: "Server is running" });
});

export default router;
