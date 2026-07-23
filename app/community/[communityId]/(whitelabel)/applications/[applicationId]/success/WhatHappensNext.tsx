import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { api } from "@/utilities/api/client";

interface WhatHappensNextProps {
  programId: string;
  communityId: string;
  hasApplication: boolean;
  templateVariables?: Record<string, string>;
}

/**
 * Replaces {{variableName}} template variables with actual values.
 * Unmatched variables are replaced with empty strings.
 */
function interpolateTemplate(template: string, variables: Record<string, string>): string {
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
  // TODO(#1775): add zod schema
  let programConfig: {
    formSchema?: { settings?: { successPageContent?: string } };
  } | null;
  try {
    programConfig = await api.get<{
      formSchema?: { settings?: { successPageContent?: string } };
    }>(`/v2/funding-program-configs/${programId}`, { isAuthorized: false });
  } catch {
    // SUPPRESSED: best-effort program-config fetch; the "what happens next"
    // section falls back to its default copy below when this fails.
    programConfig = null;
  }

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
