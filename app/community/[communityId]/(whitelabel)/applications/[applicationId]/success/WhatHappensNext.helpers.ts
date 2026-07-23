/**
 * Extracts the applicant name from applicationData by searching for keys
 * that match common name-related patterns. Uses a priority-based approach:
 * 1. Keys containing both applicant/contact keywords AND name keywords
 * 2. Keys containing just name keywords (excluding project-related)
 */
export function extractApplicantName(
  applicationData: Record<string, unknown> | undefined | null
): string {
  if (!applicationData) return "";
  const dataKeys = Object.keys(applicationData);

  const nameKeywords = ["name", "full name", "applicant", "contact"];
  const applicantKeywords = [
    "applicant",
    "contact",
    "submitter",
    "your",
    "lead",
    "responsible",
    "person",
    "poc",
    "point of contact",
  ];
  const excludeKeywords = [
    "project",
    "proposal",
    "organization",
    "org",
    "company",
    "team",
    "dao",
    "protocol",
    "token",
  ];

  let nameKey = dataKeys.find((key) => {
    const lowerKey = key.toLowerCase();
    const hasApplicantKeyword = applicantKeywords.some((kw) => lowerKey.includes(kw));
    const hasNameKeyword = nameKeywords.some((kw) => lowerKey.includes(kw));
    return hasApplicantKeyword && hasNameKeyword;
  });

  if (!nameKey) {
    nameKey = dataKeys.find((key) => {
      const lowerKey = key.toLowerCase();
      const hasNameKeyword = lowerKey.includes("name");
      const isExcluded = excludeKeywords.some((kw) => lowerKey.includes(kw));
      return hasNameKeyword && !isExcluded;
    });
  }

  if (nameKey) {
    const value = applicationData[nameKey];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return "";
}
