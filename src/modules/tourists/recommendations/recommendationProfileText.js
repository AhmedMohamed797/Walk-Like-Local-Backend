const joinList = (items) =>
  Array.isArray(items) && items.length ? items.filter(Boolean).join(", ") : "not specified";

export const buildGuideProfileText = (guide) => {
  const user = guide.user && typeof guide.user === "object" ? guide.user : null;
  const sections = [
    "Role: Licensed local tour guide",
    `Name: ${user?.fullName || "not specified"}`,
    `Nationality: ${guide.nationality || "not specified"}`,
    `Languages spoken: ${joinList(guide.languages)}`,
    `Verified languages: ${joinList(guide.verifiedLanguages)}`,
    `Interests and specialties: ${joinList(guide.interests)}`,
    `Years of experience: ${guide.experience?.year || "not specified"}`,
    `Rating: ${guide.rating ?? 0}/5 from ${guide.reviewCount ?? 0} reviews`,
  ];

  if (guide.bio) {
    sections.push(`About: ${guide.bio}`);
  }

  return sections.join("\n");
};

export const buildTouristProfileText = (tourist) => {
  const user = tourist.user && typeof tourist.user === "object" ? tourist.user : null;
  const sections = [
    "Role: Tourist seeking a compatible local guide",
    `Name: ${user?.fullName || "not specified"}`,
    `Nationality: ${tourist.nationality || "not specified"}`,
    `Preferred languages: ${joinList(tourist.preferredLanguages)}`,
    `Interests: ${joinList(tourist.interests)}`,
    `Travel preferences: ${joinList(tourist.travelPreferences)}`,
  ];

  return sections.join("\n");
};
