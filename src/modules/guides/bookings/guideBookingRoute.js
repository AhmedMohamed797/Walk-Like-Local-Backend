import { Router } from "express";
import { authMiddleware } from "../../auth/authMiddleware.js";
import {
  getGuideBookings,
  cancelBookingByGuide,
} from "../../bookings/bookingController.js";
import {
  listGuideBookingsValidation,
  cancelBookingValidation,
} from "../../bookings/bookingValidation.js";

const router = Router();

router.get(
  "/",
  authMiddleware,
  listGuideBookingsValidation,
  getGuideBookings,
);

router.patch(
  "/:id/cancel",
  authMiddleware,
  cancelBookingValidation,
  cancelBookingByGuide,
);

export default router;
