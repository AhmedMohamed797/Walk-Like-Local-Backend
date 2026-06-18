import { jest, describe, test, expect, beforeEach } from "@jest/globals";

jest.unstable_mockModule("../../src/modules/payments/paymentService.js", () => ({
  createCheckoutSession: jest.fn(),
  getPaymentStatus: jest.fn(),
}));
jest.unstable_mockModule("../../src/config/env.js", () => ({
  default: {
    frontendUrl: "http://localhost:5173",
    apiBaseUrl: "http://localhost:5000",
  },
}));
jest.unstable_mockModule("../../src/utils/logger.js", () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.unstable_mockModule("../../src/middlewares/error.middleware.js", () => ({
  asyncHandler: (fn) => fn,
}));
jest.unstable_mockModule("../../src/constants/roles.js", () => ({
  ROLES: { TOURIST: "TOURIST", GUIDE: "GUIDE", ADMIN: "ADMIN" },
}));

const paymentService = await import("../../src/modules/payments/paymentService.js");
const {
  createCheckoutSession,
  getPaymentStatus,
  handleCancelRedirect,
} = await import("../../src/modules/payments/paymentController.js");

describe("createCheckoutSession - Controller auth check", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should return 403 if user is not a TOURIST", async () => {
    const req = { user: { role: "GUIDE", _id: "guide1" }, params: { bookingId: "booking1" } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    await createCheckoutSession(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Only tourists can initiate payments",
    });
    expect(paymentService.createCheckoutSession).not.toHaveBeenCalled();
  });

  test("should return 403 if user is an ADMIN", async () => {
    const req = { user: { role: "ADMIN", _id: "admin1" }, params: { bookingId: "booking1" } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    await createCheckoutSession(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(paymentService.createCheckoutSession).not.toHaveBeenCalled();
  });

  test("should call service and return checkout URL for TOURIST user", async () => {
    paymentService.createCheckoutSession.mockResolvedValue({
      checkoutUrl: "https://checkout.stripe.com/session123",
    });

    const req = { user: { role: "TOURIST", _id: "tourist1" }, params: { bookingId: "booking1" } };
    const res = {
      json: jest.fn().mockReturnThis(),
    };

    await createCheckoutSession(req, res);

    expect(paymentService.createCheckoutSession).toHaveBeenCalledWith("tourist1", "booking1");
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { checkoutUrl: "https://checkout.stripe.com/session123" },
    });
  });
});

describe("getPaymentStatus - Controller auth check", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should return 403 if user is not a TOURIST", async () => {
    const req = { user: { role: "GUIDE", _id: "guide1" }, params: { bookingId: "booking1" } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    await getPaymentStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Only tourists can view payment status",
    });
    expect(paymentService.getPaymentStatus).not.toHaveBeenCalled();
  });

  test("should call service and return payment status for TOURIST user", async () => {
    const mockStatus = {
      bookingStatus: "ACTIVE",
      paymentStatus: "PAID",
      stripeSessionId: "cs_test_123",
      paymentIntentId: "pi_test_123",
      paidAt: "2026-06-17T19:00:00.000Z",
    };

    paymentService.getPaymentStatus.mockResolvedValue(mockStatus);

    const req = { user: { role: "TOURIST", _id: "tourist1" }, params: { bookingId: "booking1" } };
    const res = {
      json: jest.fn().mockReturnThis(),
    };

    await getPaymentStatus(req, res);

    expect(paymentService.getPaymentStatus).toHaveBeenCalledWith("tourist1", "booking1");
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: mockStatus,
    });
  });
});

describe("handleCancelRedirect", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should redirect to frontend cancel page with booking_id", async () => {
    const req = { query: { booking_id: "booking1" } };
    const res = {
      redirect: jest.fn().mockReturnThis(),
    };

    await handleCancelRedirect(req, res);

    expect(res.redirect).toHaveBeenCalledWith(
      "http://localhost:5173/payment/cancel?booking_id=booking1"
    );
  });

  test("should redirect to frontend cancel page without booking_id", async () => {
    const req = { query: {} };
    const res = {
      redirect: jest.fn().mockReturnThis(),
    };

    await handleCancelRedirect(req, res);

    expect(res.redirect).toHaveBeenCalledWith("http://localhost:5173/payment/cancel");
  });
});
