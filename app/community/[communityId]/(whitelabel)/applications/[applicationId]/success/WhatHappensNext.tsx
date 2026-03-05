import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import fetchData from "@/utilities/fetchData";

interface WhatHappensNextProps {
  programId: string;
  communityId: string;
  hasApplication: boolean;
  templateVariables?: Record<string, string>;
}

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

/**
 * Replaces {{variableName}} template variables with actual values.
 * Unmatched variables are replaced with empty strings.
 */
export function interpolateTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, variableName: string) => {
    return variables[variableName] ?? "";
  });
}

export async function WhatHappensNext({
  programId,
  communityId: _communityId,
  hasApplication,
  templateVariables = {},
}: WhatHappensNextProps) {
  // Fetch program config to get successPageContent
  const [programConfig] = await fetchData<{
    formSchema?: { settings?: { successPageContent?: string } };
  }>(`/v2/funding-program-configs/${programId}`, "GET", {}, {}, {}, false);

  const successPageContent = programConfig?.formSchema?.settings?.successPageContent;

  const interpolatedContent = successPageContent
    ? interpolateTemplate(successPageContent, templateVariables)
    : undefined;

  return (
    <div className="rounded-lg bg-muted p-6">
      <h2 className="text-lg font-semibold mb-2">What happens next?</h2>

      {hasApplication && interpolatedContent ? (
        <div className="prose prose-sm text-left max-w-none text-muted-foreground">
          <MarkdownPreview source={interpolatedContent} />
        </div>
      ) : (
        <ul className="text-left space-y-2 text-muted-foreground">
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>
              <strong>Review Process:</strong> Your application will be carefully reviewed by the
              Grants Council.
            </span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>
              <strong>Notifications:</strong> You&apos;ll receive an update by email within 3 weeks.
            </span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>
              <strong>Track Progress:</strong> You can monitor your application status anytime
              through your dashboard.
            </span>
          </li>
        </ul>
      )}
    </div>
  );
}
