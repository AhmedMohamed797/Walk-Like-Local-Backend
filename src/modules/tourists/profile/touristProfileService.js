import TouristProfile from "../models/touristProfileModel.js";
import { AppError } from "../../../utils/AppError.js";

export const getTouristProfile = async (userId) => {
  const touristProfile = await TouristProfile.findOne({ user: userId }).populate(
    "user",
    "fullName email",
  );
  if (!touristProfile) throw new AppError("Tourist profile not found", 404);
  return touristProfile;
};

export const updateTouristProfile = async (userId, updateData) => {
  const touristProfile = await TouristProfile.findOne({ user: userId });
  if (!touristProfile) throw new AppError("Tourist profile not found", 404);

  const allowedFields = ["nationality", "preferredLanguages", "interests", "travelPreferences"];

  allowedFields.forEach((field) => {
    if (updateData[field] !== undefined) {
      touristProfile[field] = updateData[field];
    }
  });

  await touristProfile.save();
  return touristProfile;
};

export const updateTouristProfilePhoto = async (userId, photoData) => {
  const touristProfile = await TouristProfile.findOne({ user: userId });
  if (!touristProfile) throw new AppError("Tourist profile not found", 404);

  touristProfile.profilePhoto = {
    secureUrl: photoData.profilePhoto.secureUrl,
    publicId: photoData.profilePhoto.publicId,
  };

  await touristProfile.save();
  return touristProfile;
};