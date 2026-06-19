export const REVIEW_LIMITS = {
  MIN_RATING: 1,
  MAX_RATING: 5,
  MAX_COMMENT_LENGTH: 1000,
};

export const REVIEW_DEFAULTS = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  DEFAULT_SORT: "-createdAt",
};

export const REVIEW_SORT_FIELDS = {
  createdAt: "createdAt",
  rating: "rating",
};

export const REVIEW_SORT_FIELD_VALUES = Object.values(REVIEW_SORT_FIELDS);

export const GUIDE_LIST_DEFAULTS = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  DEFAULT_SORT: "-rating",
};

export const GUIDE_LIST_SORT_FIELDS = {
  rating: "rating",
  reviewCount: "reviewCount",
  createdAt: "createdAt",
};

export const GUIDE_LIST_SORT_FIELD_VALUES = Object.values(GUIDE_LIST_SORT_FIELDS);
