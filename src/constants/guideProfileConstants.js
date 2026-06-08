import { LANGUAGE_ISO_CODES } from "./languageTestConstants.js";

const toTitleCase = (value) =>
  value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();

export const SUPPORTED_GUIDE_LANGUAGES = Object.keys(LANGUAGE_ISO_CODES).map(toTitleCase);

export const GUIDE_PROFILE_LIMITS = {
  MIN_LANGUAGES: 1,
  MAX_LANGUAGES: 10,
  MAX_BIO_LENGTH: 1000,
  MAX_INTERESTS: 15,
  MAX_INTEREST_LENGTH: 50,
};
