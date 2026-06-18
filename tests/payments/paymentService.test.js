import { jest, describe, test, expect, beforeEach } from "@jest/globals";

jest.unstable_mockModule("../../src/modules/payments/models/paymentModel.js", () => ({
  default: {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    deleteOne: jest.fn(),
  },
}));
jest.unstable_mockModule("../../src/modules/bookings/models/bookingModel.js", () => ({
  default: {
    findById: jest.fn(),
    find: jest.fn(),
  },
}));
jest.unstable_mockModule("../../src/config/stripe.js", () => ({
  default: {
    refunds: { create: jest.fn() },
    checkout: { sessions: { create: jest.fn(), retrieve: jest.fn() } },
  },
}));
jest.unstable_mockModule("../../src/modules/bookings/bookingHelper.js", () => ({
  markCouponAsUsed: jest.fn(),
}));
jest.unstable_mockModule("../../src/modules/payments/emailService.js", () => ({
  sendPaymentConfirmationEmail: jest.fn(),
}));
jest.unstable_mockModule("../../src/modules/users/userModel.js", () => ({
  default: { findById: jest.fn() },
}));
jest.unstable_mockModule("../../src/utils/logger.js", () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));
jest.unstable_mockModule("../../src/utils/AppError.js", () => ({
  AppError: class AppError extends Error {
    constructor(message, statusCode) {
      super(message);
      this.statusCode = statusCode;
    }
  },
}));

const Payment = await import("../../src/modules/payments/models/paymentModel.js");
const Booking = await import("../../src/modules/bookings/models/bookingModel.js");
const stripe = await import("../../src/config/stripe.js");
const User = await import("../../src/modules/users/userModel.js");
const bookingHelper = await import("../../src/modules/bookings/bookingHelper.js");
const emailService = await import("../../src/modules/payments/emailService.js");
const paymentService = await import("../../src/modules/payments/paymentService.js");

describe("handleCheckoutSessionCompleted - Idempotent Webhook Processing", () => {
  const mockSession = {
    id: "cs_test_123",
    metadata: { bookingId: "booking1" },
    payment_intent: "pi_test_123",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should skip processing if payment is already PAID", async () => {
    const mockPayment = {
      _id: "pay1",
      status: "PAID",
      save: jest.fn(),
    };

    Payment.default.findOne.mockResolvedValue(mockPayment);
    Booking.default.findById.mockResolvedValue({ _id: "booking1", status: "ACTIVE" });

    const result = await paymentService.handleCheckoutSessionCompleted(mockSession);

    expect(mockPayment.save).not.toHaveBeenCalled();
    expect(result.payment).toEqual(mockPayment);
    expect(result.booking).toBeDefined();
  });

  test("should process payment if status is PENDING", async () => {
    const mockPayment = {
      _id: "pay1",
      status: "PENDING",
      save: jest.fn().mockReturnThis(),
    };

    const mockBooking = {
      _id: "booking1",
      status: "PENDING_PAYMENT",
      appliedCouponId: null,
      touristId: "tourist1",
      save: jest.fn().mockReturnThis(),
    };

    Payment.default.findOne.mockResolvedValue(mockPayment);
    Booking.default.findById.mockResolvedValue(mockBooking);

    const result = await paymentService.handleCheckoutSessionCompleted(mockSession);

    expect(mockPayment.save).toHaveBeenCalled();
    expect(mockBooking.save).toHaveBeenCalled();
    expect(result.payment).toBeDefined();
    expect(result.booking).toBeDefined();
  });

  test("should handle booking already ACTIVE (idempotency guard)", async () => {
    const mockPayment = {
      _id: "pay1",
      status: "PENDING",
      paidAt: null,
      stripePaymentIntentId: null,
      save: jest.fn().mockReturnThis(),
    };

    const mockBooking = {
      _id: "booking1",
      status: "ACTIVE",
      appliedCouponId: null,
      touristId: "tourist1",
    };

    Payment.default.findOne.mockResolvedValue(mockPayment);
    Booking.default.findById.mockResolvedValue(mockBooking);

    const result = await paymentService.handleCheckoutSessionCompleted(mockSession);

    expect(mockPayment.status).toBe("PAID");
    expect(mockPayment.paidAt).toBeDefined();
    expect(mockPayment.stripePaymentIntentId).toBe("pi_test_123");
    expect(mockPayment.save).toHaveBeenCalled();
    expect(mockBooking.status).toBe("ACTIVE");
    expect(result.payment).toEqual(mockPayment);
    expect(result.booking).toEqual(mockBooking);
  });

  test("should mark coupon as USED if booking has appliedCouponId", async () => {
    const mockPayment = {
      _id: "pay1",
      status: "PENDING",
      save: jest.fn().mockReturnThis(),
    };

    const mockBooking = {
      _id: "booking1",
      status: "PENDING_PAYMENT",
      appliedCouponId: "coupon1",
      touristId: "tourist1",
      save: jest.fn().mockReturnThis(),
    };

    const mockUser = { _id: "tourist1", email: "tourist@test.com" };

    Payment.default.findOne.mockResolvedValue(mockPayment);
    Booking.default.findById.mockResolvedValue(mockBooking);
    User.default.findById.mockResolvedValue(mockUser);

    const result = await paymentService.handleCheckoutSessionCompleted(mockSession);

    expect(bookingHelper.markCouponAsUsed).toHaveBeenCalledWith("coupon1");
    expect(emailService.sendPaymentConfirmationEmail).toHaveBeenCalledWith(
      "tourist@test.com",
      mockBooking,
      mockPayment,
    );
  });

  test("should still process if tourist not found (skip email)", async () => {
    const mockPayment = {
      _id: "pay1",
      status: "PENDING",
      save: jest.fn().mockReturnThis(),
    };

    const mockBooking = {
      _id: "booking1",
      status: "PENDING_PAYMENT",
      appliedCouponId: null,
      touristId: "tourist1",
      save: jest.fn().mockReturnThis(),
    };

    Payment.default.findOne.mockResolvedValue(mockPayment);
    Booking.default.findById.mockResolvedValue(mockBooking);
    User.default.findById.mockResolvedValue(null);

    const result = await paymentService.handleCheckoutSessionCompleted(mockSession);

    expect(result.payment).toBeDefined();
    expect(result.booking).toBeDefined();
    expect(emailService.sendPaymentConfirmationEmail).not.toHaveBeenCalled();
  });

  test("should throw error if payment not found", async () => {
    Payment.default.findOne.mockResolvedValue(null);

    await expect(
      paymentService.handleCheckoutSessionCompleted(mockSession)
    ).rejects.toThrow("Payment not found for this session");
  });

  test("should throw error if booking not found", async () => {
    const mockPayment = { _id: "pay1", status: "PENDING" };
    Payment.default.findOne.mockResolvedValue(mockPayment);
    Booking.default.findById.mockResolvedValue(null);

    await expect(
      paymentService.handleCheckoutSessionCompleted(mockSession)
    ).rejects.toThrow("Booking not found");
  });
});

describe("handlePaymentIntentFailed", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should set payment status to FAILED when payment intent found", async () => {
    const mockPayment = {
      _id: "pay1",
      status: "PENDING",
      save: jest.fn().mockReturnThis(),
    };

    Payment.default.findOne.mockResolvedValue(mockPayment);

    const result = await paymentService.handlePaymentIntentFailed({ id: "pi_test_123" });

    expect(mockPayment.status).toBe("FAILED");
    expect(mockPayment.save).toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  test("should return early if no payment found for the intent", async () => {
    Payment.default.findOne.mockResolvedValue(null);

    const result = await paymentService.handlePaymentIntentFailed({ id: "pi_unknown" });

    expect(result).toBeUndefined();
  });
});

describe("getPaymentStatus", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should return payment status for valid booking", async () => {
    const mockBooking = {
      _id: "booking1",
      touristId: "tourist1",
      status: "ACTIVE",
    };

    const mockPayment = {
      _id: "pay1",
      status: "PAID",
      stripeSessionId: "cs_test_123",
      stripePaymentIntentId: "pi_test_123",
      paidAt: new Date("2026-06-17"),
    };

    Booking.default.findById.mockResolvedValue(mockBooking);
    Payment.default.findOne.mockResolvedValue(mockPayment);

    const result = await paymentService.getPaymentStatus("tourist1", "booking1");

    expect(result.bookingStatus).toBe("ACTIVE");
    expect(result.paymentStatus).toBe("PAID");
    expect(result.stripeSessionId).toBe("cs_test_123");
    expect(result.paymentIntentId).toBe("pi_test_123");
  });

  test("should throw 404 if booking not found", async () => {
    Booking.default.findById.mockResolvedValue(null);

    await expect(
      paymentService.getPaymentStatus("tourist1", "booking1")
    ).rejects.toThrow("Booking not found");
  });

  test("should throw 403 if tourist is not the booking owner", async () => {
    const mockBooking = {
      _id: "booking1",
      touristId: "tourist2",
      status: "ACTIVE",
    };

    Booking.default.findById.mockResolvedValue(mockBooking);

    await expect(
      paymentService.getPaymentStatus("tourist1", "booking1")
    ).rejects.toThrow("You are not authorized to view this payment status");
  });

  test("should throw 404 if payment not found for booking", async () => {
    const mockBooking = {
      _id: "booking1",
      touristId: "tourist1",
      status: "ACTIVE",
    };

    Booking.default.findById.mockResolvedValue(mockBooking);
    Payment.default.findOne.mockResolvedValue(null);

    await expect(
      paymentService.getPaymentStatus("tourist1", "booking1")
    ).rejects.toThrow("Payment not found for this booking");
  });
});

describe("expirePendingPayments", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should mark PENDING payments as FAILED when booking is no longer PENDING_PAYMENT", async () => {
    const mockPayment1 = {
      _id: "pay1",
      bookingId: "booking1",
      status: "PENDING",
      save: jest.fn().mockReturnThis(),
    };

    const mockPayment2 = {
      _id: "pay2",
      bookingId: "booking2",
      status: "PENDING",
      save: jest.fn().mockReturnThis(),
    };

    Payment.default.find.mockResolvedValue([mockPayment1, mockPayment2]);
    Booking.default.findById.mockResolvedValueOnce(null);
    Booking.default.findById.mockResolvedValueOnce({ status: "EXPIRED" });

    await paymentService.expirePendingPayments();

    expect(mockPayment1.status).toBe("FAILED");
    expect(mockPayment1.save).toHaveBeenCalled();
    expect(mockPayment2.status).toBe("FAILED");
    expect(mockPayment2.save).toHaveBeenCalled();
  });

  test("should not change status if booking is still PENDING_PAYMENT", async () => {
    const mockPayment = {
      _id: "pay1",
      bookingId: "booking1",
      status: "PENDING",
      save: jest.fn().mockReturnThis(),
    };

    Payment.default.find.mockResolvedValue([mockPayment]);
    Booking.default.findById.mockResolvedValue({ status: "PENDING_PAYMENT" });

    await paymentService.expirePendingPayments();

    expect(mockPayment.status).toBe("PENDING");
    expect(mockPayment.save).not.toHaveBeenCalled();
  });

  test("should handle empty list of pending payments", async () => {
    Payment.default.find.mockResolvedValue([]);

    await paymentService.expirePendingPayments();

    expect(Booking.default.findById).not.toHaveBeenCalled();
  });
});

describe("createCheckoutSession", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should throw 404 if booking not found", async () => {
    Booking.default.findById.mockResolvedValue(null);

    await expect(
      paymentService.createCheckoutSession("tourist1", "booking1")
    ).rejects.toThrow("Booking not found");
  });

  test("should throw 403 if tourist is not the booking owner", async () => {
    const mockBooking = {
      _id: "booking1",
      touristId: "tourist2",
      status: "PENDING_PAYMENT",
      paymentExpiresAt: new Date(Date.now() + 900000),
      pricing: { totalPrice: 50 },
    };

    Booking.default.findById.mockResolvedValue(mockBooking);

    await expect(
      paymentService.createCheckoutSession("tourist1", "booking1")
    ).rejects.toThrow("You are not authorized to pay for this booking");
  });

  test("should throw 400 if booking is not in PENDING_PAYMENT status", async () => {
    const mockBooking = {
      _id: "booking1",
      touristId: "tourist1",
      status: "ACTIVE",
      paymentExpiresAt: new Date(Date.now() + 900000),
      pricing: { totalPrice: 50 },
    };

    Booking.default.findById.mockResolvedValue(mockBooking);

    await expect(
      paymentService.createCheckoutSession("tourist1", "booking1")
    ).rejects.toThrow("Booking is not in PENDING_PAYMENT status");
  });

  test("should throw 400 if payment window has expired", async () => {
    const mockBooking = {
      _id: "booking1",
      touristId: "tourist1",
      status: "PENDING_PAYMENT",
      paymentExpiresAt: new Date(Date.now() - 900000),
      pricing: { totalPrice: 50 },
    };

    Booking.default.findById.mockResolvedValue(mockBooking);

    await expect(
      paymentService.createCheckoutSession("tourist1", "booking1")
    ).rejects.toThrow("Booking payment window has expired");
  });

  test("should throw 400 if booking pricing is missing", async () => {
    const mockBooking = {
      _id: "booking1",
      touristId: "tourist1",
      status: "PENDING_PAYMENT",
      paymentExpiresAt: new Date(Date.now() + 900000),
      pricing: null,
    };

    Booking.default.findById.mockResolvedValue(mockBooking);

    await expect(
      paymentService.createCheckoutSession("tourist1", "booking1")
    ).rejects.toThrow("Booking pricing information is missing");
  });

  test("should return existing checkout URL if session is still open", async () => {
    const mockBooking = {
      _id: "booking1",
      touristId: "tourist1",
      status: "PENDING_PAYMENT",
      paymentExpiresAt: new Date(Date.now() + 900000),
      pricing: { totalPrice: 50 },
      tourTitle: "Amazing Cairo Tour",
      destination: "Cairo",
      groupType: "SMALL_GROUP",
      groupSize: 2,
      save: jest.fn().mockReturnThis(),
    };

    const mockExistingPayment = {
      _id: "pay1",
      bookingId: "booking1",
      status: "PENDING",
      stripeSessionId: "cs_existing_123",
    };

    Booking.default.findById.mockResolvedValue(mockBooking);
    Payment.default.findOne.mockResolvedValue(mockExistingPayment);
    stripe.default.checkout.sessions.retrieve.mockResolvedValue({ status: "open", url: "https://checkout.stripe.com/existing" });

    const result = await paymentService.createCheckoutSession("tourist1", "booking1");

    expect(result.checkoutUrl).toBe("https://checkout.stripe.com/existing");
    expect(stripe.default.checkout.sessions.create).not.toHaveBeenCalled();
  });

  test("should create new session if existing session is expired", async () => {
    const mockBooking = {
      _id: "booking1",
      touristId: "tourist1",
      status: "PENDING_PAYMENT",
      paymentExpiresAt: new Date(Date.now() + 900000),
      pricing: { totalPrice: 50 },
      tourTitle: "Amazing Cairo Tour",
      destination: "Cairo",
      groupType: "SMALL_GROUP",
      groupSize: 2,
      save: jest.fn().mockReturnThis(),
    };

    const mockExistingPayment = {
      _id: "pay1",
      bookingId: "booking1",
      status: "PENDING",
      stripeSessionId: "cs_expired_123",
    };

    Booking.default.findById.mockResolvedValue(mockBooking);
    Payment.default.findOne.mockResolvedValue(mockExistingPayment);
    stripe.default.checkout.sessions.retrieve.mockRejectedValue(new Error("Session expired"));
    Payment.default.deleteOne.mockResolvedValue({ deletedCount: 1 });
    stripe.default.checkout.sessions.create.mockResolvedValue({
      id: "cs_new_123",
      url: "https://checkout.stripe.com/new",
    });
    Payment.default.create.mockResolvedValue({
      _id: "pay2",
      bookingId: "booking1",
      status: "PENDING",
      stripeSessionId: "cs_new_123",
    });

    const result = await paymentService.createCheckoutSession("tourist1", "booking1");

    expect(Payment.default.deleteOne).toHaveBeenCalled();
    expect(stripe.default.checkout.sessions.create).toHaveBeenCalled();
    expect(result.checkoutUrl).toBe("https://checkout.stripe.com/new");
  });

  test("should create new session if no existing pending payment", async () => {
    const mockBooking = {
      _id: "booking1",
      touristId: "tourist1",
      status: "PENDING_PAYMENT",
      paymentExpiresAt: new Date(Date.now() + 900000),
      pricing: { totalPrice: 50 },
      tourTitle: "Amazing Cairo Tour",
      destination: "Cairo",
      groupType: "SMALL_GROUP",
      groupSize: 2,
      save: jest.fn().mockReturnThis(),
    };

    Booking.default.findById.mockResolvedValue(mockBooking);
    Payment.default.findOne.mockResolvedValue(null);
    stripe.default.checkout.sessions.create.mockResolvedValue({
      id: "cs_new_123",
      url: "https://checkout.stripe.com/new",
    });
    Payment.default.create.mockResolvedValue({
      _id: "pay1",
      bookingId: "booking1",
      status: "PENDING",
      stripeSessionId: "cs_new_123",
    });

    const result = await paymentService.createCheckoutSession("tourist1", "booking1");

    expect(stripe.default.checkout.sessions.create).toHaveBeenCalled();
    expect(result.checkoutUrl).toBe("https://checkout.stripe.com/new");
  });
});

describe("processRefund - Stripe Refund Processing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should perform partial refund for tourist cancellation", async () => {
    const mockPayment = {
      _id: "pay1",
      bookingId: "booking1",
      status: "PAID",
      stripePaymentIntentId: "pi_test_123",
      save: jest.fn().mockReturnThis(),
    };

    Payment.default.findOne.mockResolvedValue(mockPayment);
    stripe.default.refunds.create.mockResolvedValue({ id: "re_test_123" });

    const result = await paymentService.processRefund("booking1", 35, false);

    expect(stripe.default.refunds.create).toHaveBeenCalledWith({
      payment_intent: "pi_test_123",
      amount: 3500,
    });
    expect(mockPayment.status).toBe("REFUNDED");
    expect(mockPayment.refundedAt).toBeDefined();
    expect(mockPayment.save).toHaveBeenCalled();
    expect(result.refundProcessed).toBe(true);
  });

  test("should perform full refund for guide cancellation", async () => {
    const mockPayment = {
      _id: "pay1",
      bookingId: "booking1",
      status: "PAID",
      stripePaymentIntentId: "pi_test_123",
      save: jest.fn().mockReturnThis(),
    };

    Payment.default.findOne.mockResolvedValue(mockPayment);
    stripe.default.refunds.create.mockResolvedValue({ id: "re_test_123" });

    const result = await paymentService.processRefund("booking1", 50, true);

    expect(stripe.default.refunds.create).toHaveBeenCalledWith({
      payment_intent: "pi_test_123",
    });
    expect(mockPayment.status).toBe("REFUNDED");
    expect(result.refundProcessed).toBe(true);
  });

  test("should skip refund if payment not found", async () => {
    Payment.default.findOne.mockResolvedValue(null);

    const result = await paymentService.processRefund("booking1", 35, false);

    expect(stripe.default.refunds.create).not.toHaveBeenCalled();
    expect(result.refundProcessed).toBe(false);
    expect(result.reason).toBe("NO_PAID_PAYMENT");
  });

  test("should skip refund if payment already REFUNDED", async () => {
    const mockPayment = {
      _id: "pay1",
      bookingId: "booking1",
      status: "REFUNDED",
      stripePaymentIntentId: "pi_test_123",
    };

    Payment.default.findOne.mockResolvedValue(mockPayment);

    const result = await paymentService.processRefund("booking1", 35, false);

    expect(stripe.default.refunds.create).not.toHaveBeenCalled();
    expect(result.refundProcessed).toBe(false);
    expect(result.reason).toBe("ALREADY_REFUNDED");
  });

  test("should skip refund if no stripePaymentIntentId", async () => {
    const mockPayment = {
      _id: "pay1",
      bookingId: "booking1",
      status: "PAID",
      stripePaymentIntentId: null,
    };

    Payment.default.findOne.mockResolvedValue(mockPayment);

    const result = await paymentService.processRefund("booking1", 35, false);

    expect(stripe.default.refunds.create).not.toHaveBeenCalled();
    expect(result.refundProcessed).toBe(false);
    expect(result.reason).toBe("NO_PAYMENT_INTENT");
  });

  test("should mark payment for manual review on Stripe refund failure", async () => {
    const mockPayment = {
      _id: "pay1",
      bookingId: "booking1",
      status: "PAID",
      stripePaymentIntentId: "pi_test_123",
      save: jest.fn().mockReturnThis(),
    };

    Payment.default.findOne.mockResolvedValue(mockPayment);
    stripe.default.refunds.create.mockRejectedValue(new Error("Stripe API error: invalid payment intent"));

    const result = await paymentService.processRefund("booking1", 35, false);

    expect(mockPayment.refundNeedsReview).toBe(true);
    expect(mockPayment.save).toHaveBeenCalled();
    expect(result.refundProcessed).toBe(false);
    expect(result.reason).toBe("STRIPE_REFUND_FAILED");
  });
});
