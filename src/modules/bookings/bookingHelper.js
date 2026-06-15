import crypto from "crypto";
import Tour from "../tours/models/tourModel.js";
import GuideProfile from "../guides/models/guideProfileModel.js";
import Coupon from "./models/couponModel.js";
import {
  BOOKING_LIMITS,
  BOOKING_STATUS,
  COUPON_STATUS,
} from "../../constants/bookingConstants.js";
import { SUPPORTED_GROUP_TYPES } from "../../constants/tourConstants.js";
import { AppError } from "../../utils/AppError.js";
import logger from "../../utils/logger.js";

export const deriveGroupType = (groupSize) => {
  if (groupSize === 1) return SUPPORTED_GROUP_TYPES.PRIVATE;
  if (groupSize >= 2 && groupSize <= 4) return SUPPORTED_GROUP_TYPES.SMALL_GROUP;
  if (groupSize >= 5 && groupSize <= 8) return SUPPORTED_GROUP_TYPES.LARGE_GROUP;
  throw new AppError(`Group size must be between ${BOOKING_LIMITS.MIN_GROUP_SIZE} and ${BOOKING_LIMITS.MAX_GROUP_SIZE}`, 400);
};

export const combineDateAndTime = (date, timeString) => {
  const combined = new Date(date);
  const [hours, minutes] = timeString.split(":").map(Number);
  combined.setHours(hours, minutes, 0, 0);
  return combined;
};

export const getHoursUntilTour = (slotDate, startTime) => {
  const tourStart = combineDateAndTime(slotDate, startTime);
  const diffMs = tourStart.getTime() - Date.now();
  return diffMs / (1000 * 60 * 60);
};

export const lockTourSlot = async (tourId, slotId) => {
  const tour = await Tour.findOneAndUpdate(
    {
      _id: tourId,
      "slots._id": slotId,
      "slots.isBooked": false,
    },
    { $set: { "slots.$.isBooked": true } },
    { new: true },
  );

  if (!tour) {
    throw new AppError("This slot is no longer available", 409);
  }

  const slot = tour.slots.id(slotId);
  return { tour, slot };
};

export const releaseTourSlot = async (tourId, slotId) => {
  await Tour.findOneAndUpdate(
    { _id: tourId, "slots._id": slotId },
    { $set: { "slots.$.isBooked": false } },
  );
};

export const buildSelectedActivities = (tourActivities, groupType, deselectedActivityIds = []) => {
  const deselectedSet = new Set(deselectedActivityIds.map((id) => id.toString()));

  for (const activity of tourActivities) {
    if (!activity.removable && deselectedSet.has(activity._id.toString())) {
      throw new AppError(`Activity "${activity.name}" cannot be deselected`, 400);
    }
  }

  const keptActivities = tourActivities.filter(
    (activity) => activity.removable === false || !deselectedSet.has(activity._id.toString()),
  );

  return keptActivities.map((activity) => ({
    name: activity.name,
    pricePerGroup: activity.pricing[groupType],
  }));
};

export const calculatePricing = (tour, groupType, selectedActivities, discountPercentage = 0) => {
  const tourBasePrice = tour.pricing[groupType];
  const activitiesTotal = selectedActivities.reduce((sum, activity) => sum + activity.pricePerGroup, 0);
  const subtotal = tourBasePrice + activitiesTotal;
  const discountAmount = subtotal * (discountPercentage / 100);
  const totalPrice = subtotal - discountAmount;

  return {
    tourBasePrice,
    activitiesTotal,
    subtotal,
    discountPercentage,
    discountAmount,
    totalPrice,
  };
};

export const generateCouponCode = () => {
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `GUIDE-CXL-${suffix}`;
};

export const parseBookingSort = (sortParam) => {
  if (!sortParam || sortParam === "-createdAt") {
    return { createdAt: -1 };
  }

  if (sortParam === "createdAt") {
    return { createdAt: 1 };
  }

  if (sortParam === "-slot.date") {
    return { "slot.date": -1 };
  }

  if (sortParam === "slot.date") {
    return { "slot.date": 1 };
  }

  throw new AppError("Invalid sort value. Use -createdAt, createdAt, slot.date, or -slot.date", 400);
};

export const buildBookingListFilter = (baseFilter, { status, search, dateFrom, dateTo }) => {
  const filter = { ...baseFilter };

  if (status) {
    filter.status = status;
  }

  if (search) {
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { tourTitle: { $regex: escapedSearch, $options: "i" } },
      { destination: { $regex: escapedSearch, $options: "i" } },
    ];
  }

  if (dateFrom || dateTo) {
    filter["slot.date"] = {};
    if (dateFrom) filter["slot.date"].$gte = new Date(dateFrom);
    if (dateTo) filter["slot.date"].$lte = new Date(dateTo);
  }

  return filter;
};

export const releaseCouponReservation = async (couponId) => {
  if (!couponId) return;

  await Coupon.findOneAndUpdate(
    { _id: couponId, status: COUPON_STATUS.RESERVED },
    { status: COUPON_STATUS.AVAILABLE, appliedBookingId: null },
  );
};

export const markCouponAsUsed = async (couponId) => {
  if (!couponId) return;

  await Coupon.findOneAndUpdate(
    { _id: couponId, status: COUPON_STATUS.RESERVED },
    { status: COUPON_STATUS.USED },
  );
};

export const decreaseGuideRating = async (guideId) => {
  const profile = await GuideProfile.findOne({ user: guideId });
  if (!profile) {
    logger.warn(`Guide profile not found for rating penalty: ${guideId}`);
    return;
  }

  const currentRating = profile.rating ?? BOOKING_LIMITS.DEFAULT_RATING;
  profile.rating = Math.max(
    BOOKING_LIMITS.MIN_RATING,
    currentRating - BOOKING_LIMITS.GUIDE_RATING_PENALTY,
  );
  await profile.save();
};

export const expireBooking = async (booking) => {
  if (booking.status !== BOOKING_STATUS.PENDING_PAYMENT) return;

  booking.status = BOOKING_STATUS.EXPIRED;
  await booking.save();
  await releaseTourSlot(booking.tourId, booking.slot.slotId);
  await releaseCouponReservation(booking.appliedCouponId);
};

export const completeBookingIfPast = async (booking) => {
  if (booking.status !== BOOKING_STATUS.ACTIVE) return;

  const tourEnd = combineDateAndTime(booking.slot.date, booking.slot.endTime);
  if (tourEnd >= new Date()) return;

  booking.status = BOOKING_STATUS.COMPLETED;
  await booking.save();
};
