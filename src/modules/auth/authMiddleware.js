import User from "../users/userModel.js";
import jwt from "jsonwebtoken";

export const authMiddleware = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "You are not logged in! Please log in to get access",
    });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid token, please log in again",
    });
  }

  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: "The user belonging to this token does no longer exist",
    });
  }
  req.user = currentUser;
  next();
};

