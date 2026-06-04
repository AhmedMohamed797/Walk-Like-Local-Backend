import { Router } from "express";
import authRoutes from "../modules/auth/authRoute.js";
import guideProfileRoutes from "../modules/guides/profile/guideProfileRoute.js";
import guideVerificationRoutes from "../modules/guides/verification/guideVerificationRoute.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/guides", guideProfileRoutes);
router.use("/guides", guideVerificationRoutes);

router.get("/health", (req, res) => {
  res.json({ success: true, message: "Server is running" });
});

export default router;
