import Booking from "./models/bookingModel.js";
import Coupon from "./models/couponModel.js";
import Tour from "../tours/models/tourModel.js";
import User from "../users/userModel.js";
import TouristProfile from "../tourists/models/touristProfileModel.js";
import { AppError } from "../../utils/AppError.js";
import { ROLES } from "../../constants/roles.js";
import { PASSPORT_VERIFICATION_STATUS } from "../../constants/verificationStatus.js";
import { TOUR_STATUS } from "../../constants/tourConstants.js";
import {
  BOOKING_STATUS,
  BOOKING_LIMITS,
  BOOKING_DEFAULTS,
  BOOKING_STATUS_VALUES,
  COUPON_STATUS,
} from "../../constants/bookingConstants.js";
import {
  deriveGroupType,
  lockTourSlot,
  releaseTourSlot,
  buildSelectedActivities,
  calculatePricing,
  generateCouponCode,
  parseBookingSort,
  buildBookingListFilter,
  getHoursUntilTour,
  releaseCouponReservation,
  decreaseGuideRating,
  expireBooking,
} from "./bookingHelper.js";
import { processRefund } from "../payments/paymentService.js";
import {
  sendTouristCancellationEmail,
  sendGuideCancellationEmail,
  sendBookingExpiredEmail,
  sendBookingCompletedEmail,
} from "../payments/emailService.js";

const getBookingOrThrow = async (bookingId) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError("Booking not found", 404);
  }
  return booking;
};

const ensureActiveBooking = (booking) => {
  if (booking.status !== BOOKING_STATUS.ACTIVE) {
    throw new AppError("Only active bookings can be cancelled", 400);
  }
};

const ensureBookingAccess = (booking, user) => {
  const isOwner = booking.touristId.toString() === user._id.toString();
  const isGuide = booking.guideId.toString() === user._id.toString();
  const isAdmin = user.role === ROLES.ADMIN;

  if (!isOwner && !isGuide && !isAdmin) {
    throw new AppError("You are not authorized to view this booking", 403);
  }
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

export const createBooking = async (touristId, bookingData) => {
  const { tourId, slotId, groupSize, members = [], deselectedActivityIds = [], couponCode } = bookingData;

  const touristProfile = await TouristProfile.findOne({ user: touristId });
  if (!touristProfile || touristProfile.passportVerificationStatus !== PASSPORT_VERIFICATION_STATUS.VERIFIED) {
    throw new AppError("Only verified tourists can make bookings", 403);
  }

  const tour = await Tour.findById(tourId);
  if (!tour) {
    throw new AppError("Tour not found", 404);
  }

  if (tour.status !== TOUR_STATUS.ACTIVE) {
    throw new AppError("Bookings can only be made on active tours", 400);
  }

  const slot = tour.slots.id(slotId);
  if (!slot) {
    throw new AppError("Slot not found on this tour", 404);
  }

  if (slot.isBooked) {
    throw new AppError("This slot is no longer available", 409);
  }

  const groupType = deriveGroupType(groupSize);
  const expectedMembersCount = groupSize - 1;

  if (members.length !== expectedMembersCount) {
    throw new AppError(
      `Expected ${expectedMembersCount} additional member(s) for group size ${groupSize}`,
      400,
    );
  }

  const selectedActivities = buildSelectedActivities(
    tour.activities,
    groupType,
    deselectedActivityIds,
  );

  let coupon = null;
  let discountPercentage = 0;

  if (couponCode) {
    coupon = await Coupon.findOne({
      code: couponCode.toUpperCase(),
      touristId,
      status: COUPON_STATUS.AVAILABLE,
      expiresAt: { $gt: new Date() },
    });

    if (!coupon) {
      throw new AppError("Invalid, expired, or already used coupon", 400);
    }

    discountPercentage = coupon.discountPercentage;
  }

  const pricing = calculatePricing(tour, groupType, selectedActivities, discountPercentage);
  const paymentExpiresAt = new Date(Date.now() + BOOKING_LIMITS.PAYMENT_WINDOW_MINUTES * 60 * 1000);

  let lockedSlot;
  try {
    const lockResult = await lockTourSlot(tourId, slotId);
    lockedSlot = lockResult.slot;

    const booking = await Booking.create({
      tourId: tour._id,
      guideId: tour.guideId,
      touristId,
      tourTitle: tour.title,
      destination: tour.destination,
      slot: {
        slotId: lockedSlot._id,
        date: lockedSlot.date,
        startTime: lockedSlot.startTime,
        endTime: lockedSlot.endTime,
      },
      groupType,
      groupSize,
      members,
      selectedActivities,
      pricing,
      appliedCouponId: coupon?._id ?? null,
      status: BOOKING_STATUS.PENDING_PAYMENT,
      paymentExpiresAt,
    });

    if (coupon) {
      const reserved = await Coupon.findOneAndUpdate(
        {
          _id: coupon._id,
          status: COUPON_STATUS.AVAILABLE,
        },
        {
          status: COUPON_STATUS.RESERVED,
          appliedBookingId: booking._id,
        },
        { new: true },
      );

      if (!reserved) {
        await Booking.findByIdAndDelete(booking._id);
        await releaseTourSlot(tourId, slotId);
        throw new AppError("Coupon is no longer available", 409);
      }
    }

    return {
      bookingId: booking._id,
      totalPrice: booking.pricing.totalPrice,
      paymentExpiresAt: booking.paymentExpiresAt,
      status: booking.status,
    };
  } catch (error) {
    if (lockedSlot) {
      await releaseTourSlot(tourId, slotId);
    }
    throw error;
  }
};

export const getBookingById = async (bookingId, user) => {
  const booking = await getBookingOrThrow(bookingId);
  ensureBookingAccess(booking, user);
  return booking;
};

export const getMyBookings = async (touristId, queryOptions) => {
  const {
    status,
    search,
    dateFrom,
    dateTo,
    page = BOOKING_DEFAULTS.DEFAULT_PAGE,
    limit = BOOKING_DEFAULTS.DEFAULT_LIMIT,
    sort = BOOKING_DEFAULTS.DEFAULT_SORT,
  } = queryOptions;

  if (status && !BOOKING_STATUS_VALUES.includes(status)) {
    throw new AppError(`Invalid status. Must be one of: ${BOOKING_STATUS_VALUES.join(", ")}`, 400);
  }

  const filter = buildBookingListFilter({ touristId }, { status, search, dateFrom, dateTo });
  const sortObj = parseBookingSort(sort);

  return paginateBookings(filter, sortObj, page, limit);
};

export const getGuideBookings = async (guideId, queryOptions) => {
  const {
    status,
    search,
    dateFrom,
    dateTo,
    page = BOOKING_DEFAULTS.DEFAULT_PAGE,
    limit = BOOKING_DEFAULTS.DEFAULT_LIMIT,
    sort = BOOKING_DEFAULTS.DEFAULT_SORT,
  } = queryOptions;

  if (status && !BOOKING_STATUS_VALUES.includes(status)) {
    throw new AppError(`Invalid status. Must be one of: ${BOOKING_STATUS_VALUES.join(", ")}`, 400);
  }

  const filter = buildBookingListFilter({ guideId }, { status, search, dateFrom, dateTo });
  const sortObj = parseBookingSort(sort);

  return paginateBookings(filter, sortObj, page, limit);
};

export const cancelBookingByTourist = async (touristId, bookingId, reason) => {
  const booking = await getBookingOrThrow(bookingId);

  if (booking.touristId.toString() !== touristId.toString()) {
    throw new AppError("You can only cancel your own bookings", 403);
  }

  ensureActiveBooking(booking);

  const hoursUntilTour = getHoursUntilTour(booking.slot.date, booking.slot.startTime);
  const refundPercentage =
    hoursUntilTour > BOOKING_LIMITS.TOURIST_REFUND_HOURS_THRESHOLD
      ? BOOKING_LIMITS.TOURIST_REFUND_PERCENTAGE
      : 0;
  const refundAmount = booking.pricing.totalPrice * (refundPercentage / 100);

  booking.status = BOOKING_STATUS.CANCELLED_BY_TOURIST;
  booking.cancellation = {
    cancelledBy: "TOURIST",
    cancelledAt: new Date(),
    reason: reason || "",
    refundPercentage,
    refundAmount,
  };

  await booking.save();
  await releaseTourSlot(booking.tourId, booking.slot.slotId);

  let refundResult = null;
  if (refundAmount > 0) {
    refundResult = await processRefund(bookingId, refundAmount, false);
  }

  const tourist = await User.findById(booking.touristId);
  if (tourist) {
    await sendTouristCancellationEmail(tourist.email, booking, refundPercentage, refundAmount);
  }

  return { booking, refundResult };
};

export const cancelBookingByGuide = async (guideId, bookingId, reason) => {
  const booking = await getBookingOrThrow(bookingId);

  if (booking.guideId.toString() !== guideId.toString()) {
    throw new AppError("You can only cancel bookings on your own tours", 403);
  }

  ensureActiveBooking(booking);

  const refundAmount = booking.pricing.totalPrice;

  const coupon = await Coupon.create({
    touristId: booking.touristId,
    code: generateCouponCode(),
    discountPercentage: BOOKING_LIMITS.COUPON_DISCOUNT_PERCENTAGE,
    reason: "GUIDE_CANCELLATION",
    sourceBookingId: booking._id,
    status: COUPON_STATUS.AVAILABLE,
    expiresAt: new Date(Date.now() + BOOKING_LIMITS.COUPON_VALIDITY_DAYS * 24 * 60 * 60 * 1000),
  });

  booking.status = BOOKING_STATUS.CANCELLED_BY_GUIDE;
  booking.cancellation = {
    cancelledBy: "GUIDE",
    cancelledAt: new Date(),
    reason: reason || "",
    refundPercentage: BOOKING_LIMITS.GUIDE_REFUND_PERCENTAGE,
    refundAmount,
    couponId: coupon._id,
  };

  await booking.save();
  await releaseTourSlot(booking.tourId, booking.slot.slotId);
  await decreaseGuideRating(guideId);

  const refundResult = await processRefund(bookingId, refundAmount, true);

  const tourist = await User.findById(booking.touristId);
  if (tourist) {
    await sendGuideCancellationEmail(tourist.email, booking, coupon);
  }

  return { booking, coupon, refundResult };
};

export const processExpiredBookings = async () => {
  const expiredBookings = await Booking.find({
    status: BOOKING_STATUS.PENDING_PAYMENT,
    paymentExpiresAt: { $lt: new Date() },
  });

  for (const booking of expiredBookings) {
    await expireBooking(booking);

    const tourist = await User.findById(booking.touristId);
    if (tourist) {
      await sendBookingExpiredEmail(tourist.email, booking);
    }
  }

  return expiredBookings.length;
};

export const processCompletedBookings = async () => {
  const activeBookings = await Booking.find({ status: BOOKING_STATUS.ACTIVE });
  let completedCount = 0;

  for (const booking of activeBookings) {
    const tourEnd = new Date(booking.slot.date);
    const [hours, minutes] = booking.slot.endTime.split(":").map(Number);
    tourEnd.setHours(hours, minutes, 0, 0);

    if (tourEnd < new Date()) {
      booking.status = BOOKING_STATUS.COMPLETED;
      await booking.save();
      completedCount += 1;

      const tourist = await User.findById(booking.touristId);
      if (tourist) {
        await sendBookingCompletedEmail(tourist.email, booking);
      }
    }
  }

  return completedCount;
};
