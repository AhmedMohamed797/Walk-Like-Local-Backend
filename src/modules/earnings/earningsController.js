import * as earningsService from "./earningsService.js";
import { asyncHandler } from "../../middlewares/error.middleware.js";
import { ROLES } from "../../constants/roles.js";

const ensureGuide = (req, res) => {
  if (req.user.role !== ROLES.GUIDE) {
    res.status(403).json({
      success: false,
      message: "Only guides can access this endpoint",
    });
    return false;
  }
  return true;
};

const requireAdmin = (req, res) => {
  if (req.user.role !== ROLES.ADMIN) {
    return res.status(403).json({
      success: false,
      message: "Only admins can access this endpoint",
    });
  }
  return null;
};

export const getGuideEarningsSummary = asyncHandler(async (req, res) => {
  if (!ensureGuide(req, res)) return;

  const data = await earningsService.getGuideEarningsSummary(req.user._id);

  return res.json({
    success: true,
    data,
  });
});

export const getGuideEarningsHistory = asyncHandler(async (req, res) => {
  if (!ensureGuide(req, res)) return;

  const { results, pagination } = await earningsService.getGuideEarningsHistory(
    req.user._id,
    {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      sortBy: req.query.sortBy || "createdAt",
      sortOrder: req.query.sortOrder || "desc",
      from: req.query.from,
      to: req.query.to,
    },
  );

  return res.json({
    success: true,
    data: results,
    pagination,
  });
});

export const getGuideEarningsAnalytics = asyncHandler(async (req, res) => {
  if (!ensureGuide(req, res)) return;

  const data = await earningsService.getGuideEarningsAnalytics(req.user._id);

  return res.json({
    success: true,
    data,
  });
});

export const getAdminRevenueSummary = asyncHandler(async (req, res) => {
  const adminCheck = requireAdmin(req, res);
  if (adminCheck) return adminCheck;

  const data = await earningsService.getAdminRevenueSummary();

  return res.json({
    success: true,
    data,
  });
});

export const getAdminRevenueAnalytics = asyncHandler(async (req, res) => {
  const adminCheck = requireAdmin(req, res);
  if (adminCheck) return adminCheck;

  const year = parseInt(req.query.year) || new Date().getFullYear();
  const data = await earningsService.getAdminRevenueAnalytics(year);

  return res.json({
    success: true,
    data,
  });
});
