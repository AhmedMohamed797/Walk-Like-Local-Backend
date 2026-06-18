import { jest, describe, test, expect, beforeEach, afterEach } from "@jest/globals";

jest.unstable_mockModule("../../src/utils/logger.js", () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

const { sendPaymentConfirmationEmail, sendTouristCancellationEmail, sendGuideCancellationEmail, sendBookingExpiredEmail, sendBookingCompletedEmail } = await import("../../src/modules/payments/emailService.js");

const mockBooking = {
  _id: "booking1",
  tourTitle: "Amazing Cairo Tour",
  destination: "Cairo",
  slot: { date: "2026-07-01", startTime: "10:00", endTime: "14:00" },
  groupSize: 2,
  pricing: { totalPrice: 50 },
};

const mockPayment = {
  _id: "pay1",
  amount: 50,
};

const mockCoupon = {
  code: "GUIDE-CXL-ABC123",
  discountPercentage: 10,
  expiresAt: new Date("2026-10-01"),
};

describe("Email Notification Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve("") });
    process.env.BREVO_API_KEY = "test-key";
    process.env.EMAIL_FROM = "noreply@test.com";
  });

  afterEach(() => {
    delete process.env.BREVO_API_KEY;
    delete process.env.EMAIL_FROM;
  });

  test("sendPaymentConfirmationEmail should send email with booking details", async () => {
    await sendPaymentConfirmationEmail("tourist@test.com", mockBooking, mockPayment);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.to[0].email).toBe("tourist@test.com");
    expect(callBody.subject).toContain("Payment Confirmation");
    expect(callBody.htmlContent).toContain("Amazing Cairo Tour");
    expect(callBody.htmlContent).toContain("$50");
    expect(callBody.htmlContent).toContain("booking1");
  });

  test("sendTouristCancellationEmail should include refund percentage and amount", async () => {
    await sendTouristCancellationEmail("tourist@test.com", mockBooking, 70, 35);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.subject).toContain("Booking Cancelled");
    expect(callBody.htmlContent).toContain("70%");
    expect(callBody.htmlContent).toContain("$35.00");
  });

  test("sendTouristCancellationEmail with 0% refund should show no refund message", async () => {
    await sendTouristCancellationEmail("tourist@test.com", mockBooking, 0, 0);

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.htmlContent).toContain("No refund is applicable");
  });

  test("sendGuideCancellationEmail should include coupon details", async () => {
    await sendGuideCancellationEmail("tourist@test.com", mockBooking, mockCoupon);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.subject).toContain("Cancelled by Guide");
    expect(callBody.htmlContent).toContain("GUIDE-CXL-ABC123");
    expect(callBody.htmlContent).toContain("10%");
    expect(callBody.htmlContent).toContain("$50.00");
  });

  test("sendBookingExpiredEmail should show payment window expired", async () => {
    await sendBookingExpiredEmail("tourist@test.com", mockBooking);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.subject).toContain("Booking Expired");
    expect(callBody.htmlContent).toContain("payment window closed");
  });

  test("sendBookingCompletedEmail should include review reminder", async () => {
    await sendBookingCompletedEmail("tourist@test.com", mockBooking);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.subject).toContain("Tour Completed");
    expect(callBody.htmlContent).toContain("review");
    expect(callBody.htmlContent).toContain("Amazing Cairo Tour");
  });

  test("email failures should not throw errors", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve("Server error"),
    });

    await sendPaymentConfirmationEmail("tourist@test.com", mockBooking, mockPayment);

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  test("email Brevo API failure should not throw (caught by try/catch)", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve("Server error"),
    });

    await sendPaymentConfirmationEmail("tourist@test.com", mockBooking, mockPayment);

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
