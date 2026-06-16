import * as bookingService from "./bookingService.js";
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

export const createBooking = asyncHandler(async (req, res) => {
  if (!ensureTourist(req, res)) return;

  const result = await bookingService.createBooking(req.user._id, req.body);

  return res.status(201).json({
    success: true,
    message: "Booking created successfully",
    data: result,
  });
});

export const getBookingById = asyncHandler(async (req, res) => {
  const booking = await bookingService.getBookingById(req.params.id, req.user);

  return res.json({
    success: true,
    data: booking,
  });
});

export const getMyBookings = asyncHandler(async (req, res) => {
  if (!ensureTourist(req, res)) return;

  const { results, pagination } = await bookingService.getMyBookings(req.user._id, {
    status: req.query.status,
    search: req.query.search,
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo,
    page: parseInt(req.query.page) || BOOKING_DEFAULTS.DEFAULT_PAGE,
    limit: parseInt(req.query.limit) || BOOKING_DEFAULTS.DEFAULT_LIMIT,
    sort: req.query.sort || BOOKING_DEFAULTS.DEFAULT_SORT,
  });

  return res.json({
    success: true,
    data: results,
    pagination,
  });
});

export const cancelBookingByTourist = asyncHandler(async (req, res) => {
  if (!ensureTourist(req, res)) return;

  const booking = await bookingService.cancelBookingByTourist(
    req.user._id,
    req.params.id,
    req.body.reason,
  );

  return res.json({
    success: true,
    message: "Booking cancelled successfully",
    data: booking,
  });
});

export const getGuideBookings = asyncHandler(async (req, res) => {
  if (!ensureGuide(req, res)) return;

  const { results, pagination } = await bookingService.getGuideBookings(req.user._id, {
    status: req.query.status,
    search: req.query.search,
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo,
    page: parseInt(req.query.page) || BOOKING_DEFAULTS.DEFAULT_PAGE,
    limit: parseInt(req.query.limit) || BOOKING_DEFAULTS.DEFAULT_LIMIT,
    sort: req.query.sort || BOOKING_DEFAULTS.DEFAULT_SORT,
  });

  return res.json({
    success: true,
    data: results,
    pagination,
  });
});

export const cancelBookingByGuide = asyncHandler(async (req, res) => {
  if (!ensureGuide(req, res)) return;

  const { booking, coupon } = await bookingService.cancelBookingByGuide(
    req.user._id,
    req.params.id,
    req.body.reason,
  );

  return res.json({
    success: true,
    message: "Booking cancelled. Coupon issued to tourist.",
    data: { booking, coupon },
  });
});
