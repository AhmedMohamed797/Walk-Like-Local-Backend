import logger from "../../utils/logger.js";

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

const sendEmail = async ({ to, subject, text, html }) => {
  if (!BREVO_API_KEY) {
    logger.info(`[EMAIL] No BREVO_API_KEY set — mock send to: ${to}, subject: ${subject}`);
    return;
  }

  const senderEmail = process.env.EMAIL_FROM || process.env.SMTP_USER;
  if (!senderEmail) {
    throw new Error("No sender email configured. Set EMAIL_FROM in your environment variables.");
  }

  const body = {
    sender: { email: senderEmail },
    to: [{ email: to }],
    subject,
    textContent: text,
    htmlContent: html,
  };

  const response = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": BREVO_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Brevo API error ${response.status}: ${errorText}`);
  }
};

export const sendPaymentConfirmationEmail = async (touristEmail, booking, payment) => {
  try {
    await sendEmail({
      to: touristEmail,
      subject: `Payment Confirmation - ${booking.tourTitle}`,
      text: `Hi,\n\nYour payment of $${payment.amount} for "${booking.tourTitle}" has been confirmed.\n\nBooking Reference: ${booking._id}\nTour: ${booking.tourTitle}\nDestination: ${booking.destination}\nDate: ${booking.slot.date}\nGroup Size: ${booking.groupSize}\n\nThank you for booking with Walk Like Local!`,
      html: `
        <p>Hi,</p>
        <p>Your payment has been confirmed!</p>
        <ul>
          <li><strong>Booking Reference:</strong> ${booking._id}</li>
          <li><strong>Tour:</strong> ${booking.tourTitle}</li>
          <li><strong>Destination:</strong> ${booking.destination}</li>
          <li><strong>Date:</strong> ${booking.slot.date}</li>
          <li><strong>Group Size:</strong> ${booking.groupSize}</li>
          <li><strong>Amount Paid:</strong> $${payment.amount}</li>
        </ul>
        <p>Thank you for booking with Walk Like Local!</p>
      `,
    });
    logger.info(`Payment confirmation email sent to ${touristEmail}`);
  } catch (err) {
    logger.error(`Failed to send payment confirmation email to ${touristEmail}: ${err.message}`);
  }
};

export const sendTouristCancellationEmail = async (touristEmail, booking, refundPercentage, refundAmount) => {
  try {
    const refundInfo = refundPercentage > 0
      ? `A refund of ${refundPercentage}% ($${refundAmount.toFixed(2)}) will be processed to your original payment method.`
      : "No refund is applicable as the cancellation was made within 24 hours of the tour.";

    await sendEmail({
      to: touristEmail,
      subject: `Booking Cancelled - ${booking.tourTitle}`,
      text: `Hi,\n\nYour booking for "${booking.tourTitle}" has been cancelled.\n\n${refundInfo}\n\nBooking Reference: ${booking._id}\nTour: ${booking.tourTitle}\nDestination: ${booking.destination}\nDate: ${booking.slot.date}`,
      html: `
        <p>Hi,</p>
        <p>Your booking has been cancelled.</p>
        <p>${refundInfo}</p>
        <ul>
          <li><strong>Booking Reference:</strong> ${booking._id}</li>
          <li><strong>Tour:</strong> ${booking.tourTitle}</li>
          <li><strong>Destination:</strong> ${booking.destination}</li>
          <li><strong>Date:</strong> ${booking.slot.date}</li>
        </ul>
      `,
    });
    logger.info(`Tourist cancellation email sent to ${touristEmail}`);
  } catch (err) {
    logger.error(`Failed to send tourist cancellation email to ${touristEmail}: ${err.message}`);
  }
};

export const sendGuideCancellationEmail = async (touristEmail, booking, coupon) => {
  try {
    const couponInfo = coupon
      ? `As compensation, you have received a coupon code: <strong>${coupon.code}</strong> (${coupon.discountPercentage}% discount), valid until ${new Date(coupon.expiresAt).toLocaleDateString()}.`
      : "";

    await sendEmail({
      to: touristEmail,
      subject: `Booking Cancelled by Guide - ${booking.tourTitle}`,
      text: `Hi,\n\nYour booking for "${booking.tourTitle}" has been cancelled by the guide.\n\nA full refund of $${booking.pricing.totalPrice.toFixed(2)} will be processed to your original payment method.\n\n${coupon ? `Coupon code: ${coupon.code} (${coupon.discountPercentage}% discount), valid until ${new Date(coupon.expiresAt).toLocaleDateString()}` : ""}\n\nBooking Reference: ${booking._id}`,
      html: `
        <p>Hi,</p>
        <p>Your booking has been cancelled by the guide.</p>
        <p>A full refund of $${booking.pricing.totalPrice.toFixed(2)} will be processed to your original payment method.</p>
        <p>${couponInfo}</p>
        <ul>
          <li><strong>Booking Reference:</strong> ${booking._id}</li>
          <li><strong>Tour:</strong> ${booking.tourTitle}</li>
          <li><strong>Destination:</strong> ${booking.destination}</li>
        </ul>
      `,
    });
    logger.info(`Guide cancellation email sent to ${touristEmail}`);
  } catch (err) {
    logger.error(`Failed to send guide cancellation email to ${touristEmail}: ${err.message}`);
  }
};

export const sendBookingExpiredEmail = async (touristEmail, booking) => {
  try {
    await sendEmail({
      to: touristEmail,
      subject: `Booking Expired - ${booking.tourTitle}`,
      text: `Hi,\n\nYour booking for "${booking.tourTitle}" has expired because the payment window closed before payment was completed.\n\nBooking Reference: ${booking._id}\nTour: ${booking.tourTitle}\n\nPlease feel free to book again.`,
      html: `
        <p>Hi,</p>
        <p>Your booking has expired because the payment window closed before payment was completed.</p>
        <ul>
          <li><strong>Booking Reference:</strong> ${booking._id}</li>
          <li><strong>Tour:</strong> ${booking.tourTitle}</li>
        </ul>
        <p>Please feel free to book again.</p>
      `,
    });
    logger.info(`Booking expired email sent to ${touristEmail}`);
  } catch (err) {
    logger.error(`Failed to send booking expired email to ${touristEmail}: ${err.message}`);
  }
};

export const sendBookingCompletedEmail = async (touristEmail, booking) => {
  try {
    await sendEmail({
      to: touristEmail,
      subject: `Tour Completed - ${booking.tourTitle}`,
      text: `Hi,\n\nYour tour "${booking.tourTitle}" has been completed!\n\nWe hope you enjoyed your experience. Please consider leaving a review for your guide.\n\nBooking Reference: ${booking._id}\nTour: ${booking.tourTitle}\nDestination: ${booking.destination}\n\nThank you for using Walk Like Local!`,
      html: `
        <p>Hi,</p>
        <p>Your tour has been completed! We hope you enjoyed your experience.</p>
        <p><strong>Please consider leaving a review for your guide!</strong></p>
        <ul>
          <li><strong>Booking Reference:</strong> ${booking._id}</li>
          <li><strong>Tour:</strong> ${booking.tourTitle}</li>
          <li><strong>Destination:</strong> ${booking.destination}</li>
        </ul>
        <p>Thank you for using Walk Like Local!</p>
      `,
    });
    logger.info(`Booking completed email sent to ${touristEmail}`);
  } catch (err) {
    logger.error(`Failed to send booking completed email to ${touristEmail}: ${err.message}`);
  }
};

export const sendGuideVerificationApprovedEmail = async (email) => {
  try {
    await sendEmail({
      to: email,
      subject: "Guide Verification Approved",
      text: "Congratulations!\n\nYour guide verification has been approved.\n\nYou can now create, manage, and publish tours on Walk Like Local.\n\nThank you for completing the verification process.",
      html: `
        <p>Congratulations!</p>
        <p>Your guide verification has been approved.</p>
        <p>You can now create, manage, and publish tours on Walk Like Local.</p>
        <p>Thank you for completing the verification process.</p>
      `,
    });
    logger.info(`Guide verification approved email sent to ${email}`);
  } catch (err) {
    logger.error(`Failed to send guide verification approved email to ${email}: ${err.message}`);
  }
};

export const sendGuideVerificationRejectedEmail = async (email, rejectionReason) => {
  try {
    await sendEmail({
      to: email,
      subject: "Guide Verification Rejected",
      text: `Unfortunately, your guide verification request has been rejected.\n\nReason:\n${rejectionReason}\n\nPlease update your documents and submit a new verification request.`,
      html: `
        <p>Unfortunately, your guide verification request has been rejected.</p>
        <p><strong>Reason:</strong></p>
        <p>${rejectionReason}</p>
        <p>Please update your documents and submit a new verification request.</p>
      `,
    });
    logger.info(`Guide verification rejected email sent to ${email}`);
  } catch (err) {
    logger.error(`Failed to send guide verification rejected email to ${email}: ${err.message}`);
  }
};

export const sendTouristVerificationApprovedEmail = async (email) => {
  try {
    await sendEmail({
      to: email,
      subject: "Passport Verification Approved",
      text: "Congratulations!\n\nYour passport verification has been approved successfully.\n\nYou may continue using Walk Like Local normally.",
      html: `
        <p>Congratulations!</p>
        <p>Your passport verification has been approved successfully.</p>
        <p>You may continue using Walk Like Local normally.</p>
      `,
    });
    logger.info(`Tourist verification approved email sent to ${email}`);
  } catch (err) {
    logger.error(`Failed to send tourist verification approved email to ${email}: ${err.message}`);
  }
};

export const sendTouristVerificationRejectedEmail = async (email, verificationRejectionReason) => {
  try {
    await sendEmail({
      to: email,
      subject: "Passport Verification Rejected",
      text: `Unfortunately, your passport verification request has been rejected.\n\nReason:\n${verificationRejectionReason}\n\nPlease upload a clearer passport document and resubmit your verification request.`,
      html: `
        <p>Unfortunately, your passport verification request has been rejected.</p>
        <p><strong>Reason:</strong></p>
        <p>${verificationRejectionReason}</p>
        <p>Please upload a clearer passport document and resubmit your verification request.</p>
      `,
    });
    logger.info(`Tourist verification rejected email sent to ${email}`);
  } catch (err) {
    logger.error(`Failed to send tourist verification rejected email to ${email}: ${err.message}`);
  }
};
