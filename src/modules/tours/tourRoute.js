import { Router } from "express";
import { authMiddleware } from "../auth/authMiddleware.js";
import {
  createTour,
  getMyTours,
  getActiveTours,
  getTourDetails,
  updateTour,
  activateTour,
  deactivateTour,
  addSlot,
  deleteSlot,
} from "./tourController.js";
import {
  createTourValidation,
  updateTourValidation,
  getActiveToursValidation,
  getTourDetailsValidation,
  activateTourValidation,
  deactivateTourValidation,
  addSlotValidation,
  deleteSlotValidation,
  myToursValidation,
  handleValidation,
} from "./tourValidation.js";

const router = Router();

router.post(
  "/",
  authMiddleware,
  createTourValidation,
  handleValidation,
  createTour,
);

router.get(
  "/my-tours",
  authMiddleware,
  myToursValidation,
  handleValidation,
  getMyTours,
);

router.get(
  "/",
  getActiveToursValidation,
  handleValidation,
  getActiveTours,
);

router.get(
  "/:tourId",
  getTourDetailsValidation,
  handleValidation,
  getTourDetails,
);

router.patch(
  "/:tourId",
  authMiddleware,
  updateTourValidation,
  handleValidation,
  updateTour,
);

router.patch(
  "/:tourId/activate",
  authMiddleware,
  activateTourValidation,
  handleValidation,
  activateTour,
);

router.patch(
  "/:tourId/deactivate",
  authMiddleware,
  deactivateTourValidation,
  handleValidation,
  deactivateTour,
);

router.post(
  "/:tourId/slots",
  authMiddleware,
  addSlotValidation,
  handleValidation,
  addSlot,
);

router.delete(
  "/:tourId/slots/:slotId",
  authMiddleware,
  deleteSlotValidation,
  handleValidation,
  deleteSlot,
);

export default router;
