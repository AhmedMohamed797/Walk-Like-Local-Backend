import { Router } from "express";
import { authMiddleware } from "../auth/authMiddleware.js";
import {
  getGuideEarningsSummary,
  getGuideEarningsHistory,
  getGuideEarningsAnalytics,
  getAdminRevenueSummary,
  getAdminRevenueAnalytics,
} from "./earningsController.js";
import {
  earningsSummaryValidation,
  earningsHistoryValidation,
  earningsAnalyticsValidation,
  revenueSummaryValidation,
  revenueAnalyticsValidation,
} from "./earningsValidation.js";

const guideEarningsRouter = Router();
const adminRevenueRouter = Router();

guideEarningsRouter.get(
  "/summary",
  authMiddleware,
  earningsSummaryValidation,
  getGuideEarningsSummary,
);

guideEarningsRouter.get(
  "/history",
  authMiddleware,
  earningsHistoryValidation,
  getGuideEarningsHistory,
);

guideEarningsRouter.get(
  "/analytics",
  authMiddleware,
  earningsAnalyticsValidation,
  getGuideEarningsAnalytics,
);

adminRevenueRouter.get(
  "/revenue/summary",
  authMiddleware,
  revenueSummaryValidation,
  getAdminRevenueSummary,
);

adminRevenueRouter.get(
  "/revenue/analytics",
  authMiddleware,
  revenueAnalyticsValidation,
  getAdminRevenueAnalytics,
);

export { guideEarningsRouter, adminRevenueRouter };
