import GuideProfile from "../models/guideProfileModel.js";
import User from "../../users/userModel.js";
import { AppError } from "../../../utils/AppError.js";
import { ROLES } from "../../../constants/roles.js";
import { ACCOUNT_VERIFICATION_STATUS } from "../../../constants/verificationStatus.js";
import { GUIDE_LIST_DEFAULTS } from "../../../constants/reviewConstants.js";

const sanitizeExperiencePhoto = (photo) => {
  const secureUrl = photo?.secureUrl || null;
  const publicId = photo?.publicId || null;

  if (!secureUrl && !publicId) {
    return null;
  }

  return { secureUrl, publicId };
};

export const sanitizePublicGuideProfile = (user, guideProfile) => ({
  _id: user._id,
  fullName: user.fullName,
  profilePicture: user.profilePicture ?? null,
  bio: guideProfile.bio,
  interests: guideProfile.interests,
  experience: {
    year: guideProfile.experience?.year || "",
    photo: sanitizeExperiencePhoto(guideProfile.experience?.photo),
  },
  languages: guideProfile.languages,
  verifiedLanguages: guideProfile.verifiedLanguages,
  profilePhoto: sanitizeExperiencePhoto(guideProfile.profilePhoto),
  introductionVideo: sanitizeExperiencePhoto(guideProfile.introductionVideo),
  rating: guideProfile.rating ?? 0,
  reviewCount: guideProfile.reviewCount ?? 0,
  nationality: guideProfile.nationality || null,
});

const parseGuideListSort = (sortBy, sortOrder) => {
  const order = sortOrder === "asc" ? 1 : -1;
  const field = sortBy || "rating";

  const allowedFields = ["rating", "reviewCount", "createdAt"];
  if (!allowedFields.includes(field)) {
    throw new AppError(`Invalid sortBy. Must be one of: ${allowedFields.join(", ")}`, 400);
  }

  return { [field]: order };
};

const buildGuideListFilter = ({ minRating, maxRating, minReviewCount, language }) => {
  const filter = {
    accountVerificationStatus: ACCOUNT_VERIFICATION_STATUS.VERIFIED,
  };

  if (minRating !== undefined || maxRating !== undefined) {
    filter.rating = {};
    if (minRating !== undefined) filter.rating.$gte = Number(minRating);
    if (maxRating !== undefined) filter.rating.$lte = Number(maxRating);
  }

  if (minReviewCount !== undefined) {
    filter.reviewCount = { $gte: Number(minReviewCount) };
  }

  if (language) {
    filter.languages = language.trim();
  }

  return filter;
};

export const listGuides = async ({
  page = GUIDE_LIST_DEFAULTS.DEFAULT_PAGE,
  limit = GUIDE_LIST_DEFAULTS.DEFAULT_LIMIT,
  sortBy,
  sortOrder,
  minRating,
  maxRating,
  minReviewCount,
  language,
  search,
}) => {
  const profileFilter = buildGuideListFilter({
    minRating,
    maxRating,
    minReviewCount,
    language,
  });

  if (search) {
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matchingUsers = await User.find({
      role: ROLES.GUIDE,
      status: "ACTIVE",
      fullName: { $regex: escapedSearch, $options: "i" },
    }).select("_id");

    const userIds = matchingUsers.map((user) => user._id);

    if (!userIds.length) {
      return {
        results: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 1,
        },
      };
    }

    profileFilter.user = { $in: userIds };
  }

  const sortQuery = parseGuideListSort(sortBy, sortOrder);
  const skip = (page - 1) * limit;

  const [profiles, total] = await Promise.all([
    GuideProfile.find(profileFilter).sort(sortQuery).skip(skip).limit(limit),
    GuideProfile.countDocuments(profileFilter),
  ]);

  const userIds = profiles.map((profile) => profile.user);
  const users = await User.find({
    _id: { $in: userIds },
    role: ROLES.GUIDE,
    status: "ACTIVE",
  }).select("fullName profilePicture");

  const userMap = new Map(users.map((user) => [user._id.toString(), user]));

  const results = profiles
    .map((profile) => {
      const user = userMap.get(profile.user.toString());
      if (!user) return null;
      return sanitizePublicGuideProfile(user, profile);
    })
    .filter(Boolean);

  return {
    results,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const getGuidePublicProfile = async (guideId) => {
  const user = await User.findOne({
    _id: guideId,
    role: ROLES.GUIDE,
    status: "ACTIVE",
  }).select("fullName profilePicture");

  if (!user) {
    throw new AppError("Guide not found", 404);
  }

  const guideProfile = await GuideProfile.findOne({
    user: guideId,
    accountVerificationStatus: ACCOUNT_VERIFICATION_STATUS.VERIFIED,
  });

  if (!guideProfile) {
    throw new AppError("Guide profile not found or not verified", 404);
  }

  return sanitizePublicGuideProfile(user, guideProfile);
};
