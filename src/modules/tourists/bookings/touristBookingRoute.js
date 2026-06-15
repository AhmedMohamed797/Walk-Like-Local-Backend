import { Router } from "express";
import { authMiddleware } from "../../auth/authMiddleware.js";
import {
  createBooking,
  getBookingById,
  getMyBookings,
  cancelBookingByTourist,
} from "../../bookings/bookingController.js";
import {
  createBookingValidation,
  getBookingValidation,
  listMyBookingsValidation,
  cancelBookingValidation,
} from "../../bookings/bookingValidation.js";

const router = Router();

router.post(
  "/",
  authMiddleware,
  createBookingValidation,
  createBooking,
);

router.get(
  "/",
  authMiddleware,
  listMyBookingsValidation,
  getMyBookings,
);

router.get(
  "/:id",
  authMiddleware,
  getBookingValidation,
  getBookingById,
);

router.patch(
  "/:id/cancel",
  authMiddleware,
  cancelBookingValidation,
  cancelBookingByTourist,
);

export default router;
