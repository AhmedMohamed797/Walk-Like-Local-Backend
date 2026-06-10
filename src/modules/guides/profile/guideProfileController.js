import * as guideProfileService from "./guideProfileService.js";
import { asyncHandler } from "../../../middlewares/error.middleware.js";
import { ROLES } from "../../../constants/roles.js";

const ensureGuide = (req, res) => {
  if (req.user.role !== ROLES.GUIDE) {
    res.status(403).json({
      success: false,
      message: "Only guides can access guide profile endpoints",
    });
    return false;
  }

  return true;
};

export const getGuideProfile = asyncHandler(async (req, res) => {
  if (!ensureGuide(req, res)) return;

  const data = await guideProfileService.getGuideProfile(req.user._id);

  return res.json({
    success: true,
    data,
  });
});

export const updateGuideProfile = asyncHandler(async (req, res) => {
  if (!ensureGuide(req, res)) return;

  const data = await guideProfileService.updateGuideProfile(req.user._id, req.body);

  return res.json({
    success: true,
    message: "Guide profile updated successfully",
    data,
  });
});

export const setGuideLanguages = asyncHandler(async (req, res) => {
  if (!ensureGuide(req, res)) return;

  const data = await guideProfileService.setGuideLanguages(req.user._id, req.body.languages);

  return res.json({
    success: true,
    message: "Guide languages updated successfully",
    data,
  });
});
