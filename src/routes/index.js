import { Router } from "express";

const router = Router();

router.get("/health", (req, res) => {
  res.json({ success: true, message: "Server is running" });
});

export default router;
