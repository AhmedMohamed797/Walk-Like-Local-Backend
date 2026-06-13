import { Router } from "express";
import { authMiddleware } from "../../auth/authMiddleware.js";
import {
  getAllUsers,
  getUserDetails,
  suspendUser,
  activateUser,
  banUser,
  unbanUser,
  getUserStats,
} from "./adminUserController.js";
import {
  getUsersValidation,
  userIdValidation,
  suspendUserValidation,
  activateUserValidation,
  banUserValidation,
  unbanUserValidation,
  handleValidation,
} from "./adminUserValidation.js";

const router = Router();

router.get(
  "/users/stats",
  authMiddleware,
  getUserStats,
);

router.get(
  "/users",
  authMiddleware,
  getUsersValidation,
  handleValidation,
  getAllUsers,
);

router.get(
  "/users/:userId",
  authMiddleware,
  userIdValidation,
  handleValidation,
  getUserDetails,
);

router.patch(
  "/users/:userId/suspend",
  authMiddleware,
  suspendUserValidation,
  handleValidation,
  suspendUser,
);

router.patch(
  "/users/:userId/activate",
  authMiddleware,
  activateUserValidation,
  handleValidation,
  activateUser,
);

router.patch(
  "/users/:userId/ban",
  authMiddleware,
  banUserValidation,
  handleValidation,
  banUser,
);

router.patch(
  "/users/:userId/unban",
  authMiddleware,
  unbanUserValidation,
  handleValidation,
  unbanUser,
);

export default router;