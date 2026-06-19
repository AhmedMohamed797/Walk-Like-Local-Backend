import Tour from "./models/tourModel.js";
import GuideProfile from "../guides/models/guideProfileModel.js";
import Booking from "../bookings/models/bookingModel.js";
import { AppError } from "../../utils/AppError.js";
import { ACCOUNT_VERIFICATION_STATUS } from "../../constants/verificationStatus.js";
import { TOUR_STATUS, TOUR_SORT_FIELDS, TOUR_DEFAULTS, SUPPORTED_GROUP_TYPE_VALUES } from "../../constants/tourConstants.js";
import { BOOKING_STATUS } from "../../constants/bookingConstants.js";

const getTourOrThrow = async (tourId) => {
  const tour = await Tour.findById(tourId);
  if (!tour) {
    throw new AppError("Tour not found", 404);
  }
  return tour;
};

const ensureGuideOwnership = (tour, userId) => {
  if (tour.guideId.toString() !== userId.toString()) {
    throw new AppError("You are not authorized to manage this tour", 403);
  }
};

const ensureGuideVerified = async (userId) => {
  const guideProfile = await GuideProfile.findOne({ user: userId });
  if (!guideProfile) {
    throw new AppError("Guide profile not found", 404);
  }

  if (guideProfile.accountVerificationStatus !== ACCOUNT_VERIFICATION_STATUS.VERIFIED) {
    throw new AppError("Only verified guides can perform this action", 403);
  }

  return guideProfile;
};

const hasActiveBookings = (tourId) => Booking.exists({
  tourId,
  status: BOOKING_STATUS.ACTIVE,
});

const hasPendingBookingOnSlot = (tourId, slotId) => Booking.exists({
  tourId,
  "slot.slotId": slotId,
  status: BOOKING_STATUS.PENDING_PAYMENT,
});

const removesExistingActivities = (tour, nextActivities) => {
  if (!Array.isArray(nextActivities)) return false;

  const nextActivityIds = new Set(
    nextActivities
      .map((activity) => activity._id?.toString())
      .filter(Boolean),
  );

  return tour.activities.some((activity) => !nextActivityIds.has(activity._id.toString()));
};

const GUIDE_POPULATE_SELECT = "fullName";

const buildGuideInfo = (userDoc, guideProfileDoc) => {
  if (!userDoc || !guideProfileDoc) return null;

  return {
    _id: userDoc._id,
    fullName: userDoc.fullName,
    languages: guideProfileDoc.languages,
    verifiedLanguages: guideProfileDoc.verifiedLanguages,
  };
};

const populateGuideData = async (tours) => {
  if (!tours.length) return tours;

  const guideIds = [...new Set(tours.map((t) => t.guideId.toString()))];

  const guideProfiles = await GuideProfile.find({
    user: { $in: guideIds },
  });

  const guideProfileMap = new Map();
  for (const gp of guideProfiles) {
    guideProfileMap.set(gp.user.toString(), gp);
  }

  await Tour.populate(tours, {
    path: "guideId",
    select: GUIDE_POPULATE_SELECT,
  });

  for (const tour of tours) {
    const userDoc = tour.guideId;
    const guideProfileDoc = guideProfileMap.get(tour.guideId?._id?.toString() || tour.guideId?.toString());

    tour._doc = tour._doc || {};
    tour._doc.guide = buildGuideInfo(userDoc, guideProfileDoc);
  }

  return tours;
};

export const searchTours = (filter, search) => {
  if (!search) return filter;

  const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  filter.$or = [
    { title: { $regex: escapedSearch, $options: "i" } },
    { description: { $regex: escapedSearch, $options: "i" } },
    { destination: { $regex: escapedSearch, $options: "i" } },
    { meetingPoint: { $regex: escapedSearch, $options: "i" } },
  ];

  return filter;
};

export const filterTours = (filter, { destination, activity, groupType, minPrice, maxPrice }) => {
  if (destination) {
    filter.destination = { $regex: destination.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  }

  if (activity) {
    filter["activities.name"] = { $regex: activity.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  }

  if (groupType) {
    const groupTypeKey = groupType.toUpperCase();
    if (!SUPPORTED_GROUP_TYPE_VALUES.includes(groupTypeKey)) {
      throw new AppError(`Invalid group type. Must be one of: ${SUPPORTED_GROUP_TYPE_VALUES.join(", ")}`, 400);
    }

    filter[`pricing.${groupTypeKey}`] = { $exists: true, $ne: null };

    if (minPrice !== undefined || maxPrice !== undefined) {
      const priceFilter = {};
      if (minPrice !== undefined) priceFilter.$gte = Number(minPrice);
      if (maxPrice !== undefined) priceFilter.$lte = Number(maxPrice);

      filter[`pricing.${groupTypeKey}`] = {
        ...filter[`pricing.${groupTypeKey}`],
        ...priceFilter,
      };
    }
  }

  return filter;
};

export const sortTours = (sortBy, sortOrder, groupType) => {
  const sort = {};

  if (!sortBy) {
    sort.createdAt = -1;
    return sort;
  }

  const order = sortOrder === "asc" ? 1 : -1;

  if (sortBy === TOUR_SORT_FIELDS.createdAt) {
    sort.createdAt = order;
  } else if (sortBy === TOUR_SORT_FIELDS.title) {
    sort.title = order;
  } else if (sortBy === TOUR_SORT_FIELDS.price) {
    if (!groupType) {
      throw new AppError("groupType is required when sorting by price", 400);
    }

    const groupTypeKey = groupType.toUpperCase();
    if (!SUPPORTED_GROUP_TYPE_VALUES.includes(groupTypeKey)) {
      throw new AppError(`Invalid group type for price sorting. Must be one of: ${SUPPORTED_GROUP_TYPE_VALUES.join(", ")}`, 400);
    }

    sort[`pricing.${groupTypeKey}`] = order;
  }

  return sort;
};

export const paginateTours = async (filter, sort, page, limit) => {
  const skip = (page - 1) * limit;

  const totalItems = await Tour.countDocuments(filter);
  const tours = await Tour.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit);

  const totalPages = Math.ceil(totalItems / limit);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  return {
    results: tours,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage,
      hasPreviousPage,
    },
  };
};

export const createTour = async (userId, tourData) => {
  await ensureGuideVerified(userId);

  const tour = await Tour.create({
    guideId: userId,
    title: tourData.title,
    description: tourData.description,
    destination: tourData.destination,
    meetingPoint: tourData.meetingPoint || "",
    pricing: tourData.pricing,
    activities: tourData.activities || [],
    slots: tourData.slots,
    coverImage: tourData.coverImage,
    galleryImages: tourData.galleryImages || [],
    status: TOUR_STATUS.INACTIVE,
  });

  return tour;
};

export const getMyTours = async (userId, page = 1, limit = 10) => {
  const filter = { guideId: userId };
  const sort = { createdAt: -1 };
  return paginateTours(filter, sort, page, limit);
};

export const getActiveTours = async (queryOptions) => {
  const {
    search,
    destination,
    activity,
    groupType,
    minPrice,
    maxPrice,
    sortBy,
    sortOrder,
    page = TOUR_DEFAULTS.DEFAULT_PAGE,
    limit = TOUR_DEFAULTS.DEFAULT_LIMIT,
  } = queryOptions;

  let filter = { status: TOUR_STATUS.ACTIVE };

  filter = searchTours(filter, search);
  filter = filterTours(filter, { destination, activity, groupType, minPrice, maxPrice });
  const sort = sortTours(sortBy, sortOrder, groupType);

  const { results, pagination } = await paginateTours(filter, sort, page, limit);
  const populatedResults = await populateGuideData(results);

  return { results: populatedResults, pagination };
};

export const getTourDetails = async (tourId) => {
  const tour = await getTourOrThrow(tourId);
  return tour;
};

export const updateTour = async (userId, tourId, updates) => {
  await ensureGuideVerified(userId);

  const tour = await getTourOrThrow(tourId);
  ensureGuideOwnership(tour, userId);

  const updatableFields = [
    "title", "description", "destination", "meetingPoint",
    "pricing", "coverImage", "galleryImages",
    "activities",
  ];

  if (
    (updates.pricing !== undefined || removesExistingActivities(tour, updates.activities)) &&
    await hasActiveBookings(tour._id)
  ) {
    throw new AppError("Cannot update pricing or remove activities while this tour has active bookings", 400);
  }

  for (const field of updatableFields) {
    if (updates[field] !== undefined) {
      tour[field] = updates[field];
    }
  }

  await tour.save();
  return tour;
};

export const activateTour = async (userId, tourId) => {
  await ensureGuideVerified(userId);

  const tour = await getTourOrThrow(tourId);
  ensureGuideOwnership(tour, userId);

  if (!tour.coverImage || !tour.coverImage.secureUrl) {
    throw new AppError("Tour must have a cover image to be activated", 400);
  }

  if (!tour.pricing || tour.pricing.PRIVATE === undefined || tour.pricing.SMALL_GROUP === undefined || tour.pricing.LARGE_GROUP === undefined) {
    throw new AppError("Tour must have complete pricing to be activated", 400);
  }

  if (!tour.slots || tour.slots.length === 0) {
    throw new AppError("Tour must have at least one slot to be activated", 400);
  }

  tour.status = TOUR_STATUS.ACTIVE;
  await tour.save();
  return tour;
};

export const deactivateTour = async (userId, tourId) => {
  const tour = await getTourOrThrow(tourId);
  ensureGuideOwnership(tour, userId);

  tour.status = TOUR_STATUS.INACTIVE;
  await tour.save();
  return tour;
};

export const addSlot = async (userId, tourId, slotData) => {
  const tour = await getTourOrThrow(tourId);
  ensureGuideOwnership(tour, userId);

  tour.slots.push({
    date: slotData.date,
    startTime: slotData.startTime,
    endTime: slotData.endTime,
    isBooked: false,
  });

  await tour.save();
  return tour;
};

export const deleteSlot = async (userId, tourId, slotId) => {
  const tour = await getTourOrThrow(tourId);
  ensureGuideOwnership(tour, userId);

  const slot = tour.slots.find((s) => s._id.toString() === slotId.toString());
  if (!slot) {
    throw new AppError("Slot not found", 404);
  }

  if (slot.isBooked) {
    throw new AppError("Cannot delete a booked slot", 400);
  }

  if (await hasPendingBookingOnSlot(tour._id, slot._id)) {
    throw new AppError("Cannot delete a slot with a pending booking", 400);
  }

  tour.slots = tour.slots.filter((s) => s._id.toString() !== slotId.toString());
  await tour.save();
  return tour;
};
