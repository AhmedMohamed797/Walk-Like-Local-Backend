import { Router } from "express";
import { authMiddleware } from "../auth/authMiddleware.js";
import {
  getTouristBookingHistory,
  getTouristBookingDetails,
  getGuideBookingHistory,
  getGuideBookingDetails,
} from "./bookingHistoryController.js";
import {
  touristBookingHistoryValidation,
  touristBookingDetailValidation,
  guideBookingHistoryValidation,
  guideBookingDetailValidation,
} from "./bookingHistoryValidation.js";

const touristBookingHistoryRouter = Router();
const guideBookingHistoryRouter = Router();

touristBookingHistoryRouter.get(
  "/",
  authMiddleware,
  touristBookingHistoryValidation,
  getTouristBookingHistory,
);

touristBookingHistoryRouter.get(
  "/:bookingId",
  authMiddleware,
  touristBookingDetailValidation,
  getTouristBookingDetails,
);

guideBookingHistoryRouter.get(
  "/",
  authMiddleware,
  guideBookingHistoryValidation,
  getGuideBookingHistory,
);

guideBookingHistoryRouter.get(
  "/:bookingId",
  authMiddleware,
  guideBookingDetailValidation,
  getGuideBookingDetails,
);

export { touristBookingHistoryRouter, guideBookingHistoryRouter };
