import User from "../../users/userModel.js";
import GuideProfile from "../../guides/models/guideProfileModel.js";
import TouristProfile from "../../tourists/models/touristProfileModel.js";
import { AppError } from "../../../utils/AppError.js";
import { ROLES } from "../../../constants/roles.js";
import { USER_STATUS } from "../../../constants/userStatus.js";

export const getAllUsers = async ({ page = 1, limit = 10, role, status, search }) => {
  const skip = (page - 1) * limit;

  const filter = {};

  if (role) filter.role = role;
  if (status) filter.status = status;

  if (search) {
    filter.$or = [
      { fullName: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const totalResults = await User.countDocuments(filter);
  const users = await User.find(filter)
    .select("-password -emailVerificationToken -passwordResetCode")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return {
    results: users,
    pagination: {
      totalResults,
      totalPages: Math.ceil(totalResults / limit),
      currentPage: page,
      resultsPerPage: limit,
    },
  };
};

export const getUserDetails = async (userId) => {
  const user = await User.findById(userId).select(
    "-password -emailVerificationToken -passwordResetCode",
  );

  if (!user) throw new AppError("User not found", 404);

  let profile = null;

  if (user.role === ROLES.GUIDE) {
    profile = await GuideProfile.findOne({ user: userId });
  } else if (user.role === ROLES.TOURIST) {
    profile = await TouristProfile.findOne({ user: userId });
  }

  return { user, profile };
};

export const suspendUser = async (userId, reason, adminId) => {
  if (userId === adminId.toString()) {
    throw new AppError("You cannot suspend your own account", 400);
  }

  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found", 404);

  if (user.role === ROLES.ADMIN) {
    throw new AppError("You cannot suspend another admin", 400);
  }

  if (user.status === USER_STATUS.SUSPENDED) {
    throw new AppError("User is already suspended", 400);
  }

  if (user.status === USER_STATUS.BANNED) {
    throw new AppError("User is banned. Activate them first before suspending", 400);
  }

  user.status = USER_STATUS.SUSPENDED;
  user.statusReason = reason;
  user.statusUpdatedAt = new Date();
  user.statusUpdatedBy = adminId;

  await user.save();
  return user;
};

export const activateUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found", 404);

  if (user.status === USER_STATUS.ACTIVE) {
    throw new AppError("User is already active", 400);
  }

  user.status = USER_STATUS.ACTIVE;
  user.statusReason = null;
  user.statusUpdatedAt = new Date();

  await user.save();
  return user;
};

export const banUser = async (userId, reason, adminId) => {
  if (userId === adminId.toString()) {
    throw new AppError("You cannot ban your own account", 400);
  }

  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found", 404);

  if (user.role === ROLES.ADMIN) {
    throw new AppError("You cannot ban another admin", 400);
  }

  if (user.status === USER_STATUS.BANNED) {
    throw new AppError("User is already banned", 400);
  }

  user.status = USER_STATUS.BANNED;
  user.statusReason = reason;
  user.statusUpdatedAt = new Date();
  user.statusUpdatedBy = adminId;

  await user.save();
  return user;
};

export const unbanUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found", 404);

  if (user.status !== USER_STATUS.BANNED) {
    throw new AppError("User is not banned", 400);
  }

  user.status = USER_STATUS.ACTIVE;
  user.statusReason = null;
  user.statusUpdatedAt = new Date();

  await user.save();
  return user;
};

export const getUserStats = async () => {
  const stats = await User.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        totalGuides: {
          $sum: { $cond: [{ $eq: ["$role", ROLES.GUIDE] }, 1, 0] },
        },
        totalTourists: {
          $sum: { $cond: [{ $eq: ["$role", ROLES.TOURIST] }, 1, 0] },
        },
        activeUsers: {
          $sum: { $cond: [{ $eq: ["$status", USER_STATUS.ACTIVE] }, 1, 0] },
        },
        suspendedUsers: {
          $sum: { $cond: [{ $eq: ["$status", USER_STATUS.SUSPENDED] }, 1, 0] },
        },
        bannedUsers: {
          $sum: { $cond: [{ $eq: ["$status", USER_STATUS.BANNED] }, 1, 0] },
        },
      },
    },
  ]);

  const data = stats[0] || {
    totalUsers: 0,
    totalGuides: 0,
    totalTourists: 0,
    activeUsers: 0,
    suspendedUsers: 0,
    bannedUsers: 0,
  };

  delete data._id;
  return data;
};