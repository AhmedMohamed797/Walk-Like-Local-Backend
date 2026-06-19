import * as tourService from "./tourService.js";
import { asyncHandler } from "../../middlewares/error.middleware.js";
import { ROLES } from "../../constants/roles.js";
import { TOUR_DEFAULTS } from "../../constants/tourConstants.js";

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

export const createTour = asyncHandler(async (req, res) => {
  if (!ensureGuide(req, res)) return;

  const tour = await tourService.createTour(req.user._id, req.body);

  return res.status(201).json({
    success: true,
    message: "Tour created successfully",
    data: tour,
  });
});

export const getMyTours = asyncHandler(async (req, res) => {
  if (!ensureGuide(req, res)) return;

  const page = parseInt(req.query.page) || TOUR_DEFAULTS.DEFAULT_PAGE;
  const limit = parseInt(req.query.limit) || TOUR_DEFAULTS.DEFAULT_LIMIT;

  const { results, pagination } = await tourService.getMyTours(req.user._id, page, limit);

  return res.json({
    success: true,
    data: results,
    pagination,
  });
});

export const getActiveTours = asyncHandler(async (req, res) => {
  const { results, pagination } = await tourService.getActiveTours({
    search: req.query.search,
    destination: req.query.destination,
    activity: req.query.activity,
    groupType: req.query.groupType,
    minPrice: req.query.minPrice,
    maxPrice: req.query.maxPrice,
    sortBy: req.query.sortBy,
    sortOrder: req.query.sortOrder,
    page: parseInt(req.query.page) || TOUR_DEFAULTS.DEFAULT_PAGE,
    limit: parseInt(req.query.limit) || TOUR_DEFAULTS.DEFAULT_LIMIT,
  });

  return res.json({
    success: true,
    data: results,
    pagination,
  });
});

export const getTourDetails = asyncHandler(async (req, res) => {
  const tour = await tourService.getTourDetails(req.params.tourId);

  return res.json({
    success: true,
    data: tour,
  });
});

export const updateTour = asyncHandler(async (req, res) => {
  if (!ensureGuide(req, res)) return;

  const tour = await tourService.updateTour(req.user._id, req.params.tourId, req.body);

  return res.json({
    success: true,
    message: "Tour updated successfully",
    data: tour,
  });
});

export const activateTour = asyncHandler(async (req, res) => {
  if (!ensureGuide(req, res)) return;

  const tour = await tourService.activateTour(req.user._id, req.params.tourId);

  return res.json({
    success: true,
    message: "Tour activated successfully",
    data: { status: tour.status },
  });
});

export const deactivateTour = asyncHandler(async (req, res) => {
  if (!ensureGuide(req, res)) return;

  const tour = await tourService.deactivateTour(req.user._id, req.params.tourId);

  return res.json({
    success: true,
    message: "Tour deactivated successfully",
    data: { status: tour.status },
  });
});

export const addSlot = asyncHandler(async (req, res) => {
  if (!ensureGuide(req, res)) return;

  const tour = await tourService.addSlot(req.user._id, req.params.tourId, req.body);

  return res.json({
    success: true,
    message: "Slot added successfully",
    data: tour.slots,
  });
});

export const deleteSlot = asyncHandler(async (req, res) => {
  if (!ensureGuide(req, res)) return;

  const tour = await tourService.deleteSlot(req.user._id, req.params.tourId, req.params.slotId);

  return res.json({
    success: true,
    message: "Slot deleted successfully",
    data: tour.slots,
  });
});
