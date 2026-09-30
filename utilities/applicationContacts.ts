import { sanitizeTelegram, validateTelegram } from "@/utilities/validators";

/**
 * Best-effort extraction of the applicant / point-of-contact NAME from a
 * funding application's free-form answers. Program forms label the field
 * differently ("Team Lead/Point of Contact Name", "1.4 Team Lead/Point of
 * Contact", …), so we match on contact + name keywords and fall back to a
 * "name" field that is not a project/org/team field.
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

export interface ApplicantContactChannels {
  email: string | null;
  telegram: string | null;
  slack: string | null;
}

/**
 * Pulls the applicant's reachable channels off the application answers, matching
 * on the channel keyword in the (free-form) field label. `applicantEmail` is the
 * email fallback when the form has no dedicated email field.
 */
export function extractContactChannels(
  applicationData: Record<string, unknown> | null | undefined,
  applicantEmail?: string | null
): ApplicantContactChannels {
  const channels: ApplicantContactChannels = {
    email: applicantEmail?.trim() || null,
    telegram: null,
    slack: null,
  };
  if (applicationData) {
    for (const [label, value] of Object.entries(applicationData)) {
      if (typeof value !== "string" || !value.trim()) continue;
      const key = label.toLowerCase();
      const trimmed = value.trim();
      if (!channels.email && key.includes("email")) channels.email = trimmed;
      else if (!channels.telegram && key.includes("telegram")) channels.telegram = trimmed;
      else if (!channels.slack && key.includes("slack")) channels.slack = trimmed;
    }
  }
  return channels;
}

/**
 * A telegram link when the value is a usable handle or URL; null when the field
 * holds something else (e.g. a person's name), so callers render plain text
 * instead of a broken `t.me` link.
 */
export function telegramHref(value: string): string | null {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (!validateTelegram(trimmed)) return null;
  return `https://t.me/${sanitizeTelegram(trimmed)}`;
}
