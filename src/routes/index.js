import { Router } from "express";
import authRoutes from "../modules/auth/authRoute.js";

const router = Router();

router.use("/auth", authRoutes);

router.get("/health", (req, res) => {
  res.json({ success: true, message: "Server is running" });
});

export default router;
