import { Router } from "express";
import authRoutes from "../modules/auth/authRoute.js";
import guideProfileRoutes from "../modules/guides/profile/guideProfileRoute.js";
import guideVerificationRoutes from "../modules/guides/verification/guideVerificationRoute.js";
import languageTestRoutes from "../modules/guides/languageTest/languageTestRoute.js";
import touristProfileRoutes from "../modules/tourists/profile/touristProfileRoute.js";
import touristVerificationRoutes from "../modules/tourists/verification/touristVerificationRoute.js";
import touristRecommendationRoutes from "../modules/tourists/recommendations/touristRecommendationRoute.js";
import adminVerificationRoutes from "../modules/admin/verification/adminVerificationRoute.js";
import tourRoutes from "../modules/tours/tourRoute.js";
import touristBookingRoutes from "../modules/tourists/bookings/touristBookingRoute.js";
import guideBookingRoutes from "../modules/guides/bookings/guideBookingRoute.js";
import { touristBookingHistoryRouter, guideBookingHistoryRouter } from "../modules/bookings/bookingHistoryRoute.js";
import guideReviewRoutes from "../modules/guides/reviews/guideReviewRoute.js";
import guidePublicRoutes from "../modules/guides/public/guidePublicRoute.js";
import adminUserManagementRoutes from "../modules/admin/user-management/adminUserRoute.js";
import paymentRoutes from "../modules/payments/paymentRoute.js";
import { guideEarningsRouter, adminRevenueRouter } from "../modules/earnings/earningsRoute.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/guides/bookings", guideBookingHistoryRouter);
router.use("/guides/bookings", guideBookingRoutes);
router.use("/guides/earnings", guideEarningsRouter);
router.use("/guides", guideProfileRoutes);
router.use("/guides", guideVerificationRoutes);
router.use("/guides", languageTestRoutes);
router.use("/guides", guideReviewRoutes);
router.use("/guides", guidePublicRoutes);
router.use("/tourists/bookings", touristBookingHistoryRouter);
router.use("/tourists/bookings", touristBookingRoutes);
router.use("/tourists", touristProfileRoutes);
router.use("/tourists", touristRecommendationRoutes);
router.use("/tourists", touristVerificationRoutes);
router.use("/admin", adminVerificationRoutes);
router.use("/admin", adminUserManagementRoutes);
router.use("/admin", adminRevenueRouter);
router.use("/tours", tourRoutes);
router.use("/payments", paymentRoutes);

router.get("/health", (req, res) => {
  res.json({ success: true, message: "Server is running" });
});

export default router;
