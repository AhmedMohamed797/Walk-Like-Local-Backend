import * as bookingHistoryService from "./bookingHistoryService.js";
import { asyncHandler } from "../../middlewares/error.middleware.js";
import { ROLES } from "../../constants/roles.js";
import { BOOKING_DEFAULTS } from "../../constants/bookingConstants.js";

const ensureTourist = (req, res) => {
  if (req.user.role !== ROLES.TOURIST) {
    res.status(403).json({
      success: false,
      message: "Only tourists can perform this action",
    });
    return false;
  }
  return true;
};

const ensureGuide = (req, res) => {
  if (req.user.role !== ROLES.GUIDE) {
    res.status(403).json({
      success: false,
      message: "Only guides can perform this action",
    });
    return false;
  }
  return true;
};

export const getTouristBookingHistory = asyncHandler(async (req, res) => {
  if (!ensureTourist(req, res)) return;

  const { results, pagination } = await bookingHistoryService.getTouristBookingHistory(
    req.user._id,
    {
      status: req.query.status,
      paymentStatus: req.query.paymentStatus,
      groupType: req.query.groupType,
      search: req.query.search,
      from: req.query.from,
      to: req.query.to,
      sortBy: req.query.sortBy || "createdAt",
      sortOrder: req.query.sortOrder || "desc",
      page: parseInt(req.query.page) || BOOKING_DEFAULTS.DEFAULT_PAGE,
      limit: parseInt(req.query.limit) || BOOKING_DEFAULTS.DEFAULT_LIMIT,
    },
  );

  return res.json({
    success: true,
    data: results,
    pagination,
  });
});

export const getTouristBookingDetails = asyncHandler(async (req, res) => {
  if (!ensureTourist(req, res)) return;

  const { booking, guideProfile, payment } = await bookingHistoryService.getTouristBookingDetails(
    req.user._id,
    req.params.bookingId,
  );

  const data = {
    ...booking.toObject(),
    guideProfile,
    payment,
  };

  return res.json({
    success: true,
    data,
  });
});

export const getGuideBookingHistory = asyncHandler(async (req, res) => {
  if (!ensureGuide(req, res)) return;

  const { results, pagination } = await bookingHistoryService.getGuideBookingHistory(
    req.user._id,
    {
      status: req.query.status,
      paymentStatus: req.query.paymentStatus,
      groupType: req.query.groupType,
      search: req.query.search,
      from: req.query.from,
      to: req.query.to,
      sortBy: req.query.sortBy || "createdAt",
      sortOrder: req.query.sortOrder || "desc",
      page: parseInt(req.query.page) || BOOKING_DEFAULTS.DEFAULT_PAGE,
      limit: parseInt(req.query.limit) || BOOKING_DEFAULTS.DEFAULT_LIMIT,
    },
  );

  return res.json({
    success: true,
    data: results,
    pagination,
  });
});

export const getGuideBookingDetails = asyncHandler(async (req, res) => {
  if (!ensureGuide(req, res)) return;

  const { booking, payment } = await bookingHistoryService.getGuideBookingDetails(
    req.user._id,
    req.params.bookingId,
  );

  const data = {
    ...booking.toObject(),
    payment,
  };

  return res.json({
    success: true,
    data,
  });
});
