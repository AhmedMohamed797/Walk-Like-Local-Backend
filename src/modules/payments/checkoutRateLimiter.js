import rateLimit from "express-rate-limit";

const checkoutRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.user._id.toString(),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many checkout attempts. Please try again later.",
  },
});

export default checkoutRateLimiter;
