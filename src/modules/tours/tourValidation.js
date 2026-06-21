import { body, param, query, validationResult } from "express-validator";
import {
  TOUR_LIMITS,
  SUPPORTED_GROUP_TYPE_VALUES,
  TOUR_SORT_FIELD_VALUES,
  TOUR_DEFAULTS,
} from "../../constants/tourConstants.js";

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

const tourIdRules = param("tourId")
  .isMongoId()
  .withMessage("Invalid tour ID");

const slotIdRules = param("slotId")
  .isMongoId()
  .withMessage("Invalid slot ID");

const cloudinaryMediaRules = (fieldName, required = true) => {
  const secureUrlRule = body(`${fieldName}.secureUrl`)
    .trim()
    .notEmpty()
    .withMessage(`${fieldName} secureUrl is required`)
    .isURL()
    .withMessage(`${fieldName} secureUrl must be a valid URL`);

  const publicIdRule = body(`${fieldName}.publicId`)
    .trim()
    .notEmpty()
    .withMessage(`${fieldName} publicId is required`);

  if (!required) {
    return [
      body(`${fieldName}.secureUrl`)
        .optional()
        .trim()
        .notEmpty()
        .withMessage(`${fieldName} secureUrl cannot be empty`)
        .isURL()
        .withMessage(`${fieldName} secureUrl must be a valid URL`),
      body(`${fieldName}.publicId`)
        .optional()
        .trim()
        .notEmpty()
        .withMessage(`${fieldName} publicId cannot be empty`),
    ];
  }

  return [secureUrlRule, publicIdRule];
};

const pricingRules = (prefix, required = true) => {
  const makeRule = (field, isRequired) => {
    const rule = body(`${prefix}.${field}`);
    if (isRequired) {
      return rule
        .notEmpty()
        .withMessage(`${prefix}.${field} is required`)
        .isFloat({ min: TOUR_LIMITS.MIN_PRICING })
        .withMessage(`${prefix}.${field} must be a non-negative number`);
    }
    return rule
      .optional()
      .isFloat({ min: TOUR_LIMITS.MIN_PRICING })
      .withMessage(`${prefix}.${field} must be a non-negative number`);
  };

  return [
    makeRule("PRIVATE", required),
    makeRule("SMALL_GROUP", required),
    makeRule("LARGE_GROUP", required),
  ];
};

export const createTourValidation = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ max: TOUR_LIMITS.MAX_TITLE_LENGTH })
    .withMessage(`Title must be at most ${TOUR_LIMITS.MAX_TITLE_LENGTH} characters`),

  body("description")
    .trim()
    .notEmpty()
    .withMessage("Description is required")
    .isLength({ max: TOUR_LIMITS.MAX_DESCRIPTION_LENGTH })
    .withMessage(`Description must be at most ${TOUR_LIMITS.MAX_DESCRIPTION_LENGTH} characters`),

  body("destination")
    .trim()
    .notEmpty()
    .withMessage("Destination is required")
    .isLength({ max: TOUR_LIMITS.MAX_DESTINATION_LENGTH })
    .withMessage(`Destination must be at most ${TOUR_LIMITS.MAX_DESTINATION_LENGTH} characters`),

  body("meetingPoint")
    .optional()
    .trim()
    .isLength({ max: TOUR_LIMITS.MAX_MEETING_POINT_LENGTH })
    .withMessage(`Meeting point must be at most ${TOUR_LIMITS.MAX_MEETING_POINT_LENGTH} characters`),

  ...pricingRules("pricing", true),

  ...cloudinaryMediaRules("coverImage", true),

  body("galleryImages")
    .optional()
    .isArray({ max: TOUR_LIMITS.MAX_GALLERY_IMAGES })
    .withMessage(`Gallery images must be at most ${TOUR_LIMITS.MAX_GALLERY_IMAGES} items`),

  body("galleryImages.*.secureUrl")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Gallery image secureUrl cannot be empty")
    .isURL()
    .withMessage("Gallery image secureUrl must be a valid URL"),

  body("galleryImages.*.publicId")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Gallery image publicId cannot be empty"),

  body("activities")
    .optional()
    .isArray({ max: TOUR_LIMITS.MAX_ACTIVITIES })
    .withMessage(`Activities must be at most ${TOUR_LIMITS.MAX_ACTIVITIES} items`),

  body("activities.*.name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Activity name is required")
    .isLength({ max: TOUR_LIMITS.MAX_ACTIVITY_NAME_LENGTH })
    .withMessage(`Activity name must be at most ${TOUR_LIMITS.MAX_ACTIVITY_NAME_LENGTH} characters`),

  body("activities.*.description")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Activity description is required")
    .isLength({ max: TOUR_LIMITS.MAX_ACTIVITY_DESCRIPTION_LENGTH })
    .withMessage(`Activity description must be at most ${TOUR_LIMITS.MAX_ACTIVITY_DESCRIPTION_LENGTH} characters`),

  ...pricingRules("activities.*.pricing", true),

  body("activities.*.removable")
    .optional()
    .isBoolean()
    .withMessage("Activity removable must be a boolean"),

  body("slots")
    .isArray({ min: 1 })
    .withMessage("At least one slot is required"),

  body("slots.*.date")
    .notEmpty()
    .withMessage("Slot date is required")
    .isISO8601()
    .withMessage("Slot date must be a valid date"),

  body("slots.*.startTime")
    .trim()
    .notEmpty()
    .withMessage("Slot start time is required"),

  body("slots.*.endTime")
    .trim()
    .notEmpty()
    .withMessage("Slot end time is required"),
];

export const updateTourValidation = [
  tourIdRules,

  body("title")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Title cannot be empty")
    .isLength({ max: TOUR_LIMITS.MAX_TITLE_LENGTH })
    .withMessage(`Title must be at most ${TOUR_LIMITS.MAX_TITLE_LENGTH} characters`),

  body("description")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Description cannot be empty")
    .isLength({ max: TOUR_LIMITS.MAX_DESCRIPTION_LENGTH })
    .withMessage(`Description must be at most ${TOUR_LIMITS.MAX_DESCRIPTION_LENGTH} characters`),

  body("destination")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Destination cannot be empty")
    .isLength({ max: TOUR_LIMITS.MAX_DESTINATION_LENGTH })
    .withMessage(`Destination must be at most ${TOUR_LIMITS.MAX_DESTINATION_LENGTH} characters`),

  body("meetingPoint")
    .optional()
    .trim()
    .isLength({ max: TOUR_LIMITS.MAX_MEETING_POINT_LENGTH })
    .withMessage(`Meeting point must be at most ${TOUR_LIMITS.MAX_MEETING_POINT_LENGTH} characters`),

  ...pricingRules("pricing", false),

  ...cloudinaryMediaRules("coverImage", false),

  body("galleryImages")
    .optional()
    .isArray({ max: TOUR_LIMITS.MAX_GALLERY_IMAGES })
    .withMessage(`Gallery images must be at most ${TOUR_LIMITS.MAX_GALLERY_IMAGES} items`),

  body("galleryImages.*.secureUrl")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Gallery image secureUrl cannot be empty")
    .isURL()
    .withMessage("Gallery image secureUrl must be a valid URL"),

  body("galleryImages.*.publicId")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Gallery image publicId cannot be empty"),

  body("activities")
    .optional()
    .isArray({ max: TOUR_LIMITS.MAX_ACTIVITIES })
    .withMessage(`Activities must be at most ${TOUR_LIMITS.MAX_ACTIVITIES} items`),

  body("activities.*.name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Activity name is required")
    .isLength({ max: TOUR_LIMITS.MAX_ACTIVITY_NAME_LENGTH })
    .withMessage(`Activity name must be at most ${TOUR_LIMITS.MAX_ACTIVITY_NAME_LENGTH} characters`),

  body("activities.*.description")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Activity description is required")
    .isLength({ max: TOUR_LIMITS.MAX_ACTIVITY_DESCRIPTION_LENGTH })
    .withMessage(`Activity description must be at most ${TOUR_LIMITS.MAX_ACTIVITY_DESCRIPTION_LENGTH} characters`),

  ...pricingRules("activities.*.pricing", false),

  body("activities.*.removable")
    .optional()
    .isBoolean()
    .withMessage("Activity removable must be a boolean"),

  body().custom((_, { req }) => {
    const updatableFields = [
      "title", "description", "destination", "meetingPoint",
      "pricing", "coverImage", "galleryImages",
      "activities",
    ];
    const hasAtLeastOne = updatableFields.some((field) => req.body[field] !== undefined);
    if (!hasAtLeastOne) {
      throw new Error("At least one field must be provided for update");
    }
    return true;
  }),
];

export const getActiveToursValidation = [
  query("search")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Search must be at most 200 characters"),

  query("destination")
    .optional()
    .trim()
    .isLength({ max: TOUR_LIMITS.MAX_DESTINATION_LENGTH })
    .withMessage(`Destination filter must be at most ${TOUR_LIMITS.MAX_DESTINATION_LENGTH} characters`),

  query("activity")
    .optional()
    .trim()
    .isLength({ max: TOUR_LIMITS.MAX_ACTIVITY_NAME_LENGTH })
    .withMessage(`Activity filter must be at most ${TOUR_LIMITS.MAX_ACTIVITY_NAME_LENGTH} characters`),

  query("groupType")
    .optional()
    .trim()
    .isIn(SUPPORTED_GROUP_TYPE_VALUES)
    .withMessage(`groupType must be one of: ${SUPPORTED_GROUP_TYPE_VALUES.join(", ")}`),

  query("minPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("minPrice must be a non-negative number"),

  query("maxPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("maxPrice must be a non-negative number"),

  query("sortBy")
    .optional()
    .trim()
    .isIn(TOUR_SORT_FIELD_VALUES)
    .withMessage(`sortBy must be one of: ${TOUR_SORT_FIELD_VALUES.join(", ")}`),

  query("sortOrder")
    .optional()
    .trim()
    .isIn(["asc", "desc"])
    .withMessage("sortOrder must be asc or desc"),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  query().custom((_, { req }) => {
    if ((req.query.minPrice || req.query.maxPrice) && !req.query.groupType) {
      throw new Error("groupType is required when filtering by price range");
    }

    if (req.query.sortBy === "price" && !req.query.groupType) {
      throw new Error("groupType is required when sorting by price");
    }

    if (req.query.minPrice && req.query.maxPrice) {
      if (Number(req.query.minPrice) > Number(req.query.maxPrice)) {
        throw new Error("minPrice cannot be greater than maxPrice");
      }
    }

    return true;
  }),
];

export const getTourDetailsValidation = [tourIdRules];

export const activateTourValidation = [tourIdRules];

export const deactivateTourValidation = [tourIdRules];

export const addSlotValidation = [
  tourIdRules,
  body("date")
    .notEmpty()
    .withMessage("Slot date is required")
    .isISO8601()
    .withMessage("Slot date must be a valid date"),
  body("startTime")
    .trim()
    .notEmpty()
    .withMessage("Slot start time is required"),
  body("endTime")
    .trim()
    .notEmpty()
    .withMessage("Slot end time is required"),
];

export const deleteSlotValidation = [tourIdRules, slotIdRules];

export const myToursValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
];
