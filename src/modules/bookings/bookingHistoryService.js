import Booking from "./models/bookingModel.js";
import Payment from "../payments/models/paymentModel.js";
import GuideProfile from "../guides/models/guideProfileModel.js";
import { AppError } from "../../utils/AppError.js";
import { BOOKING_DEFAULTS } from "../../constants/bookingConstants.js";

const USER_SAFE_SELECT = "fullName profilePicture role";
const TOUR_SAFE_SELECT = "title destination description coverImage galleryImages pricing activities meetingPoint status slots";
const GUIDE_PROFILE_SAFE_SELECT = "languages verifiedLanguages rating reviewCount bio";

const SORT_FIELD_MAP_TOURIST = {
  createdAt: "createdAt",
  tourTitle: "tourTitle",
  totalPrice: "pricing.totalPrice",
  bookingStatus: "status",
};

const SORT_FIELD_MAP_GUIDE = {
  createdAt: "createdAt",
  tourTitle: "tourTitle",
  totalPrice: "pricing.totalPrice",
  groupSize: "groupSize",
};

const buildSort = (sortBy, sortOrder, sortFieldMap) => {
  const order = sortOrder === "asc" ? 1 : -1;
  const field = sortFieldMap[sortBy] || "createdAt";
  return { [field]: order };
};

const buildFilter = async (baseFilter, { status, paymentStatus, groupType, search, from, to }) => {
  const filter = { ...baseFilter };

  if (status) {
    filter.status = status;
  }

  if (groupType) {
    filter.groupType = groupType;
  }

  if (search) {
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { tourTitle: { $regex: escapedSearch, $options: "i" } },
      { destination: { $regex: escapedSearch, $options: "i" } },
    ];
  }

  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  if (paymentStatus) {
    const paymentFilter = { status: paymentStatus };
    if (baseFilter.touristId) {
      paymentFilter.touristId = baseFilter.touristId;
    }
    const payments = await Payment.find(paymentFilter).select("bookingId");
    const bookingIds = payments.map((p) => p.bookingId);
    filter._id = { $in: bookingIds };
  }

  return filter;
};

const paginateBookings = async (filter, sort, page, limit) => {
  const skip = (page - 1) * limit;
  const totalItems = await Booking.countDocuments(filter);
  const results = await Booking.find(filter).sort(sort).skip(skip).limit(limit);
  const totalPages = Math.ceil(totalItems / limit);

  return {
    results,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
};

export const getTouristBookingHistory = async (touristId, queryOptions) => {
  const {
    status,
    paymentStatus,
    groupType,
    search,
    from,
    to,
    sortBy = "createdAt",
    sortOrder = "desc",
    page = BOOKING_DEFAULTS.DEFAULT_PAGE,
    limit = BOOKING_DEFAULTS.DEFAULT_LIMIT,
  } = queryOptions;

  const filter = await buildFilter(
    { touristId },
    { status, paymentStatus, groupType, search, from, to },
  );
  const sort = buildSort(sortBy, sortOrder, SORT_FIELD_MAP_TOURIST);

  return paginateBookings(filter, sort, page, limit);
};

export const getGuideBookingHistory = async (guideId, queryOptions) => {
  const {
    status,
    paymentStatus,
    groupType,
    search,
    from,
    to,
    sortBy = "createdAt",
    sortOrder = "desc",
    page = BOOKING_DEFAULTS.DEFAULT_PAGE,
    limit = BOOKING_DEFAULTS.DEFAULT_LIMIT,
  } = queryOptions;

  const filter = await buildFilter(
    { guideId },
    { status, paymentStatus, groupType, search, from, to },
  );
  const sort = buildSort(sortBy, sortOrder, SORT_FIELD_MAP_GUIDE);

  return paginateBookings(filter, sort, page, limit);
};

export const getTouristBookingDetails = async (touristId, bookingId) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError("Booking not found", 404);
  }

  if (booking.touristId.toString() !== touristId.toString()) {
    throw new AppError("You are not authorized to view this booking", 403);
  }

  await booking.populate("tourId", TOUR_SAFE_SELECT);
  await booking.populate("guideId", USER_SAFE_SELECT);
  await booking.populate("touristId", USER_SAFE_SELECT);

  const guideProfile = await GuideProfile.findOne({ user: booking.guideId })
    .select(GUIDE_PROFILE_SAFE_SELECT);

  let payment = null;
  if (booking.paymentId) {
    payment = await Payment.findById(booking.paymentId)
      .select("status amount currency paidAt refundedAt");
  }

  return {
    booking,
    guideProfile,
    payment,
  };
};

export const getGuideBookingDetails = async (guideId, bookingId) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError("Booking not found", 404);
  }

  if (booking.guideId.toString() !== guideId.toString()) {
    throw new AppError("You are not authorized to view this booking", 403);
  }

  await booking.populate("tourId", TOUR_SAFE_SELECT);
  await booking.populate("guideId", USER_SAFE_SELECT);
  await booking.populate("touristId", USER_SAFE_SELECT);

  let payment = null;
  if (booking.paymentId) {
    payment = await Payment.findById(booking.paymentId)
      .select("status amount currency paidAt refundedAt");
  }

  return {
    booking,
    payment,
  };
};
