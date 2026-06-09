import * as touristProfileService from "./touristProfileService.js";
import { asyncHandler } from "../../../middlewares/error.middleware.js";
import { ROLES } from "../../../constants/roles.js";

export const getMyProfile = asyncHandler(async (req, res) => {
  if (req.user.role !== ROLES.TOURIST) {
    return res.status(403).json({
      success: false,
      message: "Only tourists can access this endpoint",
    });
  }

  const touristProfile = await touristProfileService.getTouristProfile(req.user._id);

  return res.json({
    success: true,
    data: {
      user: {
        id: touristProfile.user._id,
        fullName: touristProfile.user.fullName,
        email: touristProfile.user.email,
      },
      profilePhoto: touristProfile.profilePhoto,
      nationality: touristProfile.nationality,
      preferredLanguages: touristProfile.preferredLanguages,
      interests: touristProfile.interests,
      travelPreferences: touristProfile.travelPreferences,
    },
  });
});

export const updateMyProfile = asyncHandler(async (req, res) => {
  if (req.user.role !== ROLES.TOURIST) {
    return res.status(403).json({
      success: false,
      message: "Only tourists can access this endpoint",
    });
  }

  await touristProfileService.updateTouristProfile(req.user._id, req.body);

  return res.json({
    success: true,
    message: "Profile updated successfully",
  });
});

export const updateMyProfilePhoto = asyncHandler(async (req, res) => {
  if (req.user.role !== ROLES.TOURIST) {
    return res.status(403).json({
      success: false,
      message: "Only tourists can access this endpoint",
    });
  }

  await touristProfileService.updateTouristProfilePhoto(req.user._id, req.body);

  return res.json({
    success: true,
    message: "Profile photo updated successfully",
  });
});