import { jest, describe, test, expect, beforeEach } from "@jest/globals";

jest.unstable_mockModule("../../src/config/stripe.js", () => ({
  default: {
    webhooks: { constructEvent: jest.fn() },
    refunds: { create: jest.fn() },
    checkout: { sessions: { retrieve: jest.fn() } },
  },
}));
jest.unstable_mockModule("../../src/modules/payments/paymentService.js", () => ({
  handleCheckoutSessionCompleted: jest.fn(),
  handlePaymentIntentFailed: jest.fn(),
}));
jest.unstable_mockModule("../../src/utils/logger.js", () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const stripe = await import("../../src/config/stripe.js");
const paymentService = await import("../../src/modules/payments/paymentService.js");
const { handleStripeWebhook } = await import("../../src/modules/payments/webhooks/stripeWebhookController.js");

describe("Stripe Webhook Controller - Duplicate webhook delivery", () => {
  const mockRes = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  });

  test("should handle checkout.session.completed event", async () => {
    const mockSession = { id: "cs_test_123" };
    const mockEvent = {
      type: "checkout.session.completed",
      data: { object: mockSession },
    };

    stripe.default.webhooks.constructEvent.mockReturnValue(mockEvent);
    paymentService.handleCheckoutSessionCompleted.mockResolvedValue({ payment: {}, booking: {} });

    const req = { rawBody: "{}", headers: { "stripe-signature": "sig_test" } };
    const res = mockRes();

    await handleStripeWebhook(req, res);

    expect(paymentService.handleCheckoutSessionCompleted).toHaveBeenCalledWith(mockSession);
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  test("should handle duplicate webhook delivery gracefully (idempotency)", async () => {
    const mockSession = { id: "cs_test_123" };
    const mockEvent = {
      type: "checkout.session.completed",
      data: { object: mockSession },
    };

    stripe.default.webhooks.constructEvent.mockReturnValue(mockEvent);
    paymentService.handleCheckoutSessionCompleted.mockResolvedValue({
      payment: { status: "PAID" },
      booking: { status: "ACTIVE" },
    });

    const req = { rawBody: "{}", headers: { "stripe-signature": "sig_test" } };
    const res = mockRes();

    await handleStripeWebhook(req, res);

    expect(paymentService.handleCheckoutSessionCompleted).toHaveBeenCalledWith(mockSession);
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  test("should return 400 if webhook signature verification fails", async () => {
    stripe.default.webhooks.constructEvent.mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const req = { rawBody: "{}", headers: { "stripe-signature": "bad_sig" } };
    const res = mockRes();

    await handleStripeWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(paymentService.handleCheckoutSessionCompleted).not.toHaveBeenCalled();
  });

  test("should return 400 if no stripe-signature header provided", async () => {
    const req = { rawBody: "{}", headers: {} };
    const res = mockRes();

    await handleStripeWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(paymentService.handleCheckoutSessionCompleted).not.toHaveBeenCalled();
  });

  test("should return 400 if STRIPE_WEBHOOK_SECRET is not set", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;

    const req = { rawBody: "{}", headers: { "stripe-signature": "sig_test" } };
    const res = mockRes();

    await handleStripeWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("should handle payment_intent.payment_failed event", async () => {
    const mockPaymentIntent = { id: "pi_test_failed_123" };
    const mockEvent = {
      type: "payment_intent.payment_failed",
      data: { object: mockPaymentIntent },
    };

    stripe.default.webhooks.constructEvent.mockReturnValue(mockEvent);
    paymentService.handlePaymentIntentFailed.mockResolvedValue(undefined);

    const req = { rawBody: "{}", headers: { "stripe-signature": "sig_test" } };
    const res = mockRes();

    await handleStripeWebhook(req, res);

    expect(paymentService.handlePaymentIntentFailed).toHaveBeenCalledWith(mockPaymentIntent);
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  test("should log unhandled event types and still return 200", async () => {
    const mockEvent = {
      type: "charge.succeeded",
      data: { object: { id: "ch_test_123" } },
    };

    stripe.default.webhooks.constructEvent.mockReturnValue(mockEvent);

    const req = { rawBody: "{}", headers: { "stripe-signature": "sig_test" } };
    const res = mockRes();

    await handleStripeWebhook(req, res);

    expect(paymentService.handleCheckoutSessionCompleted).not.toHaveBeenCalled();
    expect(paymentService.handlePaymentIntentFailed).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  test("should return 500 if webhook handler throws an error", async () => {
    const mockSession = { id: "cs_test_123" };
    const mockEvent = {
      type: "checkout.session.completed",
      data: { object: mockSession },
    };

    stripe.default.webhooks.constructEvent.mockReturnValue(mockEvent);
    paymentService.handleCheckoutSessionCompleted.mockRejectedValue(new Error("Database error"));

    const req = { rawBody: "{}", headers: { "stripe-signature": "sig_test" } };
    const res = mockRes();

    await handleStripeWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Webhook handler failed",
    });
  });
});
