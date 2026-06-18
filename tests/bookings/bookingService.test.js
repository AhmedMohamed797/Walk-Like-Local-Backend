import { jest, describe, test, expect, beforeEach } from "@jest/globals";

jest.unstable_mockModule("../../src/modules/bookings/models/bookingModel.js", () => ({
  default: { findById: jest.fn(), find: jest.fn() },
}));
jest.unstable_mockModule("../../src/modules/bookings/models/couponModel.js", () => ({
  default: { create: jest.fn() },
}));
jest.unstable_mockModule("../../src/modules/users/userModel.js", () => ({
  default: { findById: jest.fn().mockResolvedValue({ _id: "tourist1", email: "tourist@test.com" }) },
}));
jest.unstable_mockModule("../../src/modules/payments/paymentService.js", () => ({
  processRefund: jest.fn(),
}));
jest.unstable_mockModule("../../src/modules/payments/emailService.js", () => ({
  sendTouristCancellationEmail: jest.fn(),
  sendGuideCancellationEmail: jest.fn(),
  sendBookingExpiredEmail: jest.fn(),
  sendBookingCompletedEmail: jest.fn(),
}));
jest.unstable_mockModule("../../src/modules/bookings/bookingHelper.js", () => ({
  releaseTourSlot: jest.fn(),
  decreaseGuideRating: jest.fn(),
  generateCouponCode: jest.fn().mockReturnValue("GUIDE-CXL-ABC"),
  getHoursUntilTour: jest.fn(),
  releaseCouponReservation: jest.fn(),
  expireBooking: jest.fn(),
  deriveGroupType: jest.fn(),
  lockTourSlot: jest.fn(),
  buildSelectedActivities: jest.fn(),
  calculatePricing: jest.fn(),
  parseBookingSort: jest.fn(),
  buildBookingListFilter: jest.fn(),
}));
jest.unstable_mockModule("../../src/modules/tours/models/tourModel.js", () => ({
  default: { findById: jest.fn() },
}));
jest.unstable_mockModule("../../src/utils/logger.js", () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const Booking = await import("../../src/modules/bookings/models/bookingModel.js");
const Coupon = await import("../../src/modules/bookings/models/couponModel.js");
const User = await import("../../src/modules/users/userModel.js");
const paymentService = await import("../../src/modules/payments/paymentService.js");
const emailService = await import("../../src/modules/payments/emailService.js");
const bookingHelper = await import("../../src/modules/bookings/bookingHelper.js");
const bookingService = await import("../../src/modules/bookings/bookingService.js");

describe("cancelBookingByTourist - with refund integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should process partial refund when > 24h before tour", async () => {
    const mockBooking = {
      _id: "booking1",
      touristId: "tourist1",
      tourId: "tour1",
      slot: { slotId: "slot1", date: new Date("2026-08-01"), startTime: "10:00" },
      pricing: { totalPrice: 50 },
      status: "ACTIVE",
      save: jest.fn().mockReturnThis(),
    };

    Booking.default.findById.mockResolvedValue(mockBooking);
    bookingHelper.getHoursUntilTour.mockReturnValue(48);
    paymentService.processRefund.mockResolvedValue({ refundProcessed: true });

    const result = await bookingService.cancelBookingByTourist("tourist1", "booking1", "Change of plans");

    expect(result.booking).toBeDefined();
    expect(result.refundResult).toBeDefined();
    expect(paymentService.processRefund).toHaveBeenCalledWith("booking1", 35, false);
    expect(emailService.sendTouristCancellationEmail).toHaveBeenCalledWith("tourist@test.com", mockBooking, 70, 35);
  });

  test("should skip refund when <= 24h before tour (0% refund)", async () => {
    const mockBooking = {
      _id: "booking1",
      touristId: "tourist1",
      tourId: "tour1",
      slot: { slotId: "slot1", date: new Date("2026-08-01"), startTime: "10:00" },
      pricing: { totalPrice: 50 },
      status: "ACTIVE",
      save: jest.fn().mockReturnThis(),
    };

    Booking.default.findById.mockResolvedValue(mockBooking);
    bookingHelper.getHoursUntilTour.mockReturnValue(12);

    const result = await bookingService.cancelBookingByTourist("tourist1", "booking1", "Emergency");

    expect(paymentService.processRefund).not.toHaveBeenCalled();
    expect(result.refundResult).toBeNull();
    expect(emailService.sendTouristCancellationEmail).toHaveBeenCalledWith("tourist@test.com", mockBooking, 0, 0);
  });

  test("should still complete cancellation even if refund fails", async () => {
    const mockBooking = {
      _id: "booking1",
      touristId: "tourist1",
      tourId: "tour1",
      slot: { slotId: "slot1", date: new Date("2026-08-01"), startTime: "10:00" },
      pricing: { totalPrice: 50 },
      status: "ACTIVE",
      save: jest.fn().mockReturnThis(),
    };

    Booking.default.findById.mockResolvedValue(mockBooking);
    bookingHelper.getHoursUntilTour.mockReturnValue(48);
    paymentService.processRefund.mockResolvedValue({
      refundProcessed: false,
      reason: "STRIPE_REFUND_FAILED",
    });

    const result = await bookingService.cancelBookingByTourist("tourist1", "booking1", "Change of plans");

    expect(result.booking).toBeDefined();
    expect(result.refundResult.refundProcessed).toBe(false);
    expect(mockBooking.status).toBe("CANCELLED_BY_TOURIST");
  });
});

describe("cancelBookingByGuide - with full refund integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should process full refund and send guide cancellation email", async () => {
    const mockBooking = {
      _id: "booking1",
      touristId: "tourist1",
      guideId: "guide1",
      tourId: "tour1",
      slot: { slotId: "slot1", date: new Date("2026-08-01"), startTime: "10:00" },
      pricing: { totalPrice: 50 },
      status: "ACTIVE",
      save: jest.fn().mockReturnThis(),
    };

    const mockCoupon = {
      _id: "coupon1",
      code: "GUIDE-CXL-ABC",
      discountPercentage: 10,
      expiresAt: new Date("2026-10-01"),
    };

    Booking.default.findById.mockResolvedValue(mockBooking);
    Coupon.default.create.mockResolvedValue(mockCoupon);
    paymentService.processRefund.mockResolvedValue({ refundProcessed: true });

    const result = await bookingService.cancelBookingByGuide("guide1", "booking1", "Unavailable");

    expect(result.booking).toBeDefined();
    expect(result.coupon).toBeDefined();
    expect(result.refundResult.refundProcessed).toBe(true);
    expect(paymentService.processRefund).toHaveBeenCalledWith("booking1", 50, true);
    expect(emailService.sendGuideCancellationEmail).toHaveBeenCalledWith("tourist@test.com", mockBooking, mockCoupon);
  });

  test("should still complete cancellation even if refund fails", async () => {
    const mockBooking = {
      _id: "booking1",
      touristId: "tourist1",
      guideId: "guide1",
      tourId: "tour1",
      slot: { slotId: "slot1", date: new Date("2026-08-01"), startTime: "10:00" },
      pricing: { totalPrice: 50 },
      status: "ACTIVE",
      save: jest.fn().mockReturnThis(),
    };

    const mockCoupon = {
      _id: "coupon1",
      code: "GUIDE-CXL-ABC",
      discountPercentage: 10,
      expiresAt: new Date("2026-10-01"),
    };

    Booking.default.findById.mockResolvedValue(mockBooking);
    Coupon.default.create.mockResolvedValue(mockCoupon);
    paymentService.processRefund.mockResolvedValue({
      refundProcessed: false,
      reason: "STRIPE_REFUND_FAILED",
    });

    const result = await bookingService.cancelBookingByGuide("guide1", "booking1", "Unavailable");

    expect(result.booking).toBeDefined();
    expect(result.coupon).toBeDefined();
    expect(result.refundResult.refundProcessed).toBe(false);
    expect(mockBooking.status).toBe("CANCELLED_BY_GUIDE");
  });
});

describe("processExpiredBookings - with expired email", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should send expired email for each expired booking", async () => {
    const mockBooking1 = {
      _id: "booking1",
      touristId: "tourist1",
      status: "PENDING_PAYMENT",
      paymentExpiresAt: new Date("2026-06-01"),
    };

    Booking.default.find.mockResolvedValue([mockBooking1]);

    const result = await bookingService.processExpiredBookings();

    expect(result).toBe(1);
    expect(bookingHelper.expireBooking).toHaveBeenCalledWith(mockBooking1);
    expect(emailService.sendBookingExpiredEmail).toHaveBeenCalledWith("tourist@test.com", mockBooking1);
  });

  test("should continue processing if tourist not found", async () => {
    const mockBooking1 = {
      _id: "booking1",
      touristId: "tourist1",
      status: "PENDING_PAYMENT",
      paymentExpiresAt: new Date("2026-06-01"),
    };

    Booking.default.find.mockResolvedValue([mockBooking1]);
    User.default.findById.mockResolvedValue(null);

    const result = await bookingService.processExpiredBookings();

    expect(result).toBe(1);
    expect(emailService.sendBookingExpiredEmail).not.toHaveBeenCalled();
  });
});

describe("processCompletedBookings - with completed email", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should send completed email for each completed booking", async () => {
    const pastDate = new Date("2026-01-01");
    const mockBooking = {
      _id: "booking1",
      touristId: "tourist1",
      status: "ACTIVE",
      slot: { date: pastDate, endTime: "14:00" },
      save: jest.fn().mockReturnThis(),
    };

    Booking.default.find.mockResolvedValue([mockBooking]);
    User.default.findById.mockResolvedValue({ _id: "tourist1", email: "tourist@test.com" });

    const result = await bookingService.processCompletedBookings();

    expect(result).toBe(1);
    expect(mockBooking.status).toBe("COMPLETED");
    expect(emailService.sendBookingCompletedEmail).toHaveBeenCalledWith("tourist@test.com", mockBooking);
  });

  test("should not complete bookings whose tour has not ended yet", async () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    const mockBooking = {
      _id: "booking1",
      touristId: "tourist1",
      status: "ACTIVE",
      slot: { date: futureDate, endTime: "23:59" },
      save: jest.fn(),
    };

    Booking.default.find.mockResolvedValue([mockBooking]);

    const result = await bookingService.processCompletedBookings();

    expect(result).toBe(0);
    expect(mockBooking.save).not.toHaveBeenCalled();
    expect(emailService.sendBookingCompletedEmail).not.toHaveBeenCalled();
  });
});
