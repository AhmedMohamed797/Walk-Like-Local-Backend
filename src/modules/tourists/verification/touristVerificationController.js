import * as touristVerificationService from "./touristVerificationService.js";
import { asyncHandler } from "../../../middlewares/error.middleware.js";
import { ROLES } from "../../../constants/roles.js";

export const submitVerificationDocuments = asyncHandler(async (req, res) => {
  if (req.user.role !== ROLES.TOURIST) {
    return res.status(403).json({
      success: false,
      message: "Only tourists can submit verification documents",
    });
  }

  await touristVerificationService.submitTouristVerification(
    req.user._id,
    req.body,
  );

  return res.status(201).json({
    success: true,
    message: "Passport submitted successfully for verification",
  });
});

export const getVerificationStatus = asyncHandler(async (req, res) => {
  if (req.user.role !== ROLES.TOURIST) {
    return res.status(403).json({
      success: false,
      message: "Only tourists can view verification status",
    });
  }

  const data = await touristVerificationService.getTouristVerificationStatus(req.user._id);

  return res.json({
    success: true,
    data,
  });
});

export const resubmitVerificationDocuments = asyncHandler(async (req, res) => {
  if (req.user.role !== ROLES.TOURIST) {
    return res.status(403).json({
      success: false,
      message: "Only tourists can resubmit verification documents",
    });
  }

  await touristVerificationService.resubmitTouristVerification(
    req.user._id,
    req.body,
  );

  return res.json({
    success: true,
    message: "Passport resubmitted successfully for verification",
  });
});