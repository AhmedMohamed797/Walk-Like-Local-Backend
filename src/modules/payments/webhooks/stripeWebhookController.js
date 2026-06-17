import stripe from "../../../config/stripe.js";
import logger from "../../../utils/logger.js";
import {
  handleCheckoutSessionCompleted,
  handlePaymentIntentFailed,
} from "../paymentService.js";

export const handleStripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    logger.error("Missing Stripe signature or webhook secret");
    return res.status(400).json({
      success: false,
      message: "Webhook verification failed",
    });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err) {
    logger.error(`Stripe webhook signature verification failed: ${err.message}`);
    return res.status(400).json({
      success: false,
      message: `Webhook signature verification failed: ${err.message}`,
    });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object);
        logger.info(`Stripe webhook: checkout.session.completed for session ${event.data.object.id}`);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event.data.object);
        logger.info(`Stripe webhook: payment_intent.payment_failed for intent ${event.data.object.id}`);
        break;

      default:
        logger.info(`Stripe webhook: unhandled event type ${event.type}`);
    }
  } catch (err) {
    logger.error(`Stripe webhook handler error: ${err.message}`);
    return res.status(500).json({
      success: false,
      message: "Webhook handler failed",
    });
  }

  res.json({ received: true });
};
