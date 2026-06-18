import { jest, describe, test, expect, beforeEach } from "@jest/globals";

jest.unstable_mockModule("../../src/config/stripe.js", () => ({
  default: {
    checkout: { sessions: { retrieve: jest.fn() } },
  },
}));
jest.unstable_mockModule("../../src/modules/payments/paymentService.js", () => ({
  handleCheckoutSessionCompleted: jest.fn(),
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

const stripe = await import("../../src/config/stripe.js");
const paymentService = await import("../../src/modules/payments/paymentService.js");
const { handleSuccessRedirect } = await import("../../src/modules/payments/paymentController.js");

describe("handleSuccessRedirect - Webhook Failure Recovery", () => {
  const mockRes = () => ({
    redirect: jest.fn().mockReturnThis(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should call handleCheckoutSessionCompleted as fallback when session is paid", async () => {
    const mockSession = {
      id: "cs_test_123",
      payment_status: "paid",
      metadata: { bookingId: "booking1" },
    };

    stripe.default.checkout.sessions.retrieve.mockResolvedValue(mockSession);
    paymentService.handleCheckoutSessionCompleted.mockResolvedValue({ payment: {}, booking: {} });

    const req = { query: { session_id: "cs_test_123" } };
    const res = mockRes();

    await handleSuccessRedirect(req, res);

    expect(paymentService.handleCheckoutSessionCompleted).toHaveBeenCalledWith(mockSession);
    expect(res.redirect).toHaveBeenCalledWith("http://localhost:5173/payment/success?session_id=cs_test_123");
  });

  test("should still redirect to success even if fallback processing fails", async () => {
    const mockSession = {
      id: "cs_test_123",
      payment_status: "paid",
      metadata: { bookingId: "booking1" },
    };

    stripe.default.checkout.sessions.retrieve.mockResolvedValue(mockSession);
    paymentService.handleCheckoutSessionCompleted.mockRejectedValue(new Error("Already processed"));

    const req = { query: { session_id: "cs_test_123" } };
    const res = mockRes();

    await handleSuccessRedirect(req, res);

    expect(paymentService.handleCheckoutSessionCompleted).toHaveBeenCalledWith(mockSession);
    expect(res.redirect).toHaveBeenCalledWith("http://localhost:5173/payment/success?session_id=cs_test_123");
  });

  test("should redirect to cancel if session is not paid", async () => {
    const mockSession = {
      id: "cs_test_123",
      payment_status: "unpaid",
    };

    stripe.default.checkout.sessions.retrieve.mockResolvedValue(mockSession);

    const req = { query: { session_id: "cs_test_123" } };
    const res = mockRes();

    await handleSuccessRedirect(req, res);

    expect(paymentService.handleCheckoutSessionCompleted).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith("http://localhost:5173/payment/cancel");
  });

  test("should redirect to cancel if no session_id provided", async () => {
    const req = { query: {} };
    const res = mockRes();

    await handleSuccessRedirect(req, res);

    expect(stripe.default.checkout.sessions.retrieve).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith("http://localhost:5173/payment/cancel");
  });

  test("should redirect to cancel if Stripe session retrieval fails", async () => {
    stripe.default.checkout.sessions.retrieve.mockRejectedValue(new Error("Stripe error"));

    const req = { query: { session_id: "cs_test_123" } };
    const res = mockRes();

    await handleSuccessRedirect(req, res);

    expect(res.redirect).toHaveBeenCalledWith("http://localhost:5173/payment/cancel");
  });
});
