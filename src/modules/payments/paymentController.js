import * as paymentService from "./paymentService.js";
import { asyncHandler } from "../../middlewares/error.middleware.js";
import { ROLES } from "../../constants/roles.js";

export const createCheckoutSession = asyncHandler(async (req, res) => {
  if (req.user.role !== ROLES.TOURIST) {
    return res.status(403).json({
      success: false,
      message: "Only tourists can initiate payments",
    });
  }

  const result = await paymentService.createCheckoutSession(req.user._id, req.params.bookingId);

  return res.json({
    success: true,
    data: result,
  });
});
