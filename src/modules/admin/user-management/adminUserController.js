import * as adminUserService from "./adminUserService.js";
import { asyncHandler } from "../../../middlewares/error.middleware.js";
import { ROLES } from "../../../constants/roles.js";

const requireAdmin = (req, res) => {
  if (req.user.role !== ROLES.ADMIN) {
    return res.status(403).json({
      success: false,
      message: "Only admins can access this endpoint",
    });
  }
  return null;
};

export const getAllUsers = asyncHandler(async (req, res) => {
  const adminCheck = requireAdmin(req, res);
  if (adminCheck) return adminCheck;

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const { role, status, search } = req.query;

  const { results, pagination } = await adminUserService.getAllUsers({
    page,
    limit,
    role,
    status,
    search,
  });

  return res.json({
    success: true,
    data: results,
    pagination,
  });
});

export const getUserDetails = asyncHandler(async (req, res) => {
  const adminCheck = requireAdmin(req, res);
  if (adminCheck) return adminCheck;

  const { user, profile } = await adminUserService.getUserDetails(req.params.userId);

  return res.json({
    success: true,
    data: {
      user,
      profile,
    },
  });
});

export const suspendUser = asyncHandler(async (req, res) => {
  const adminCheck = requireAdmin(req, res);
  if (adminCheck) return adminCheck;

  const user = await adminUserService.suspendUser(
    req.params.userId,
    req.body.reason,
    req.user._id,
  );

  return res.json({
    success: true,
    message: "User suspended successfully",
    data: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      status: user.status,
      statusReason: user.statusReason,
    },
  });
});

export const activateUser = asyncHandler(async (req, res) => {
  const adminCheck = requireAdmin(req, res);
  if (adminCheck) return adminCheck;

  const user = await adminUserService.activateUser(req.params.userId);

  return res.json({
    success: true,
    message: "User activated successfully",
    data: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      status: user.status,
    },
  });
});

export const banUser = asyncHandler(async (req, res) => {
  const adminCheck = requireAdmin(req, res);
  if (adminCheck) return adminCheck;

  const user = await adminUserService.banUser(
    req.params.userId,
    req.body.reason,
    req.user._id,
  );

  return res.json({
    success: true,
    message: "User banned successfully",
    data: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      status: user.status,
      statusReason: user.statusReason,
    },
  });
});

export const unbanUser = asyncHandler(async (req, res) => {
  const adminCheck = requireAdmin(req, res);
  if (adminCheck) return adminCheck;

  const user = await adminUserService.unbanUser(req.params.userId);

  return res.json({
    success: true,
    message: "User unbanned successfully",
    data: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      status: user.status,
    },
  });
});

export const getUserStats = asyncHandler(async (req, res) => {
  const adminCheck = requireAdmin(req, res);
  if (adminCheck) return adminCheck;

  const stats = await adminUserService.getUserStats();

  return res.json({
    success: true,
    data: stats,
  });
});