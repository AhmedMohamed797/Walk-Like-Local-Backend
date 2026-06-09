import { body, validationResult } from "express-validator";

export const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
    });
  }
  next();
};

export const updateProfileValidation = [
  body("nationality")
    .optional()
    .isString()
    .withMessage("Nationality must be a string")
    .isLength({ max: 100 })
    .withMessage("Nationality must be at most 100 characters"),

  body("preferredLanguages")
    .optional()
    .isArray()
    .withMessage("Preferred languages must be an array"),

  body("interests")
    .optional()
    .isArray()
    .withMessage("Interests must be an array"),

  body("travelPreferences")
    .optional()
    .isArray()
    .withMessage("Travel preferences must be an array"),
];

export const updateProfilePhotoValidation = [
  body("profilePhoto.secureUrl")
    .trim()
    .notEmpty()
    .withMessage("Profile photo secureUrl is required")
    .isURL()
    .withMessage("Profile photo secureUrl must be a valid URL"),

  body("profilePhoto.publicId")
    .trim()
    .notEmpty()
    .withMessage("Profile photo publicId is required"),
];