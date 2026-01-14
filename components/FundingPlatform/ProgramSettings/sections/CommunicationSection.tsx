"use client";

import { useParams } from "next/navigation";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { LinkIcon } from "@heroicons/react/24/outline";
import { FUNDING_PLATFORM_DOMAINS } from "@/src/features/funding-map/utils/funding-platform-domains";
import { envVars } from "@/utilities/enviromentVars";
import type { FormSchema } from "@/types/question-builder";

interface CommunicationSectionProps {
  schema: FormSchema;
  onUpdate: (schema: FormSchema) => void;
  programId?: string;
  readOnly?: boolean;
}

const getApplyUrlByCommunityId = (communityId: string, programId: string) => {
  if (communityId in FUNDING_PLATFORM_DOMAINS) {
    const domain = FUNDING_PLATFORM_DOMAINS[communityId as keyof typeof FUNDING_PLATFORM_DOMAINS];
    return envVars.isDev
      ? `${domain.dev}/browse-applications?programId=${programId}`
      : `${domain.prod}/browse-applications?programId=${programId}`;
  }
  return envVars.isDev
    ? `${FUNDING_PLATFORM_DOMAINS.shared.dev}/${communityId}/browse-applications?programId=${programId}`
    : `${FUNDING_PLATFORM_DOMAINS.shared.prod}/${communityId}/browse-applications?programId=${programId}`;
};

export function CommunicationSection({
  schema,
  onUpdate,
  programId,
  readOnly = false,
}: CommunicationSectionProps) {
  const { communityId } = useParams() as { communityId: string };

  const updateSettings = (key: string, value: string) => {
    if (readOnly) return;
    onUpdate({
      ...schema,
      settings: {
        ...schema.settings,
        [key]: value,
      },
    });
  };

  return (
    <div className="space-y-8">
      {/* Success Page */}
      <div className="space-y-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Success Page Content
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Shown to applicants after they submit their application.
          </p>
        </div>
        <div className={readOnly ? "opacity-50 pointer-events-none" : ""}>
          <MarkdownEditor
            value={schema.settings?.successPageContent || ""}
            onChange={(value: string) => updateSettings("successPageContent", value)}
            placeholderText={`**Thank you for applying!**

Your application has been received and will be reviewed by our team.

**What's next?**
- You'll receive an email confirmation
- Our team will review your application within 2-3 weeks
- Track your application status in your dashboard`}
            height={200}
            minHeight={150}
            disabled={readOnly}
          />
        </div>
      </div>

      {/* Email Templates */}
      <div className="space-y-6">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Email Templates</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Customize emails sent to applicants. Available placeholders:{" "}
            <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-xs">
              {"{{applicantName}}"}
            </code>
            ,{" "}
            <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-xs">
              {"{{programName}}"}
            </code>
            ,{" "}
            <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-xs">
              {"{{referenceNumber}}"}
            </code>
            ,{" "}
            <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-xs">{"{{reason}}"}</code>
          </p>
        </div>

        {/* Approval Email */}
        <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-4 space-y-4">
          <h4 className="text-sm font-semibold text-green-800 dark:text-green-200 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            Approval Email
          </h4>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Subject Line
              </label>
              <input
                type="text"
                value={schema.settings?.approvalEmailSubject || ""}
                onChange={(e) => updateSettings("approvalEmailSubject", e.target.value)}
                disabled={readOnly}
                placeholder="Congratulations! Your application has been approved - {{programName}}"
                className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-zinc-800 text-gray-900 dark:text-white ${readOnly ? "opacity-50 cursor-not-allowed" : ""}`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email Body
              </label>
              <div className={readOnly ? "opacity-50 pointer-events-none" : ""}>
                <MarkdownEditor
                  value={schema.settings?.approvalEmailTemplate || ""}
                  onChange={(value: string) => updateSettings("approvalEmailTemplate", value)}
                  placeholderText={`Congratulations! Your application has been approved for {{programName}}.

**Reference Number:** {{referenceNumber}}

{{reason}}

We're excited to support your journey!`}
                  height={200}
                  minHeight={150}
                  disabled={readOnly}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Rejection Email */}
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4 space-y-4">
          <h4 className="text-sm font-semibold text-red-800 dark:text-red-200 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full" />
            Rejection Email
          </h4>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Subject Line
              </label>
              <input
                type="text"
                value={schema.settings?.rejectionEmailSubject || ""}
                onChange={(e) => updateSettings("rejectionEmailSubject", e.target.value)}
                disabled={readOnly}
                placeholder="Thanks for Applying: Resources for {{programName}}"
                className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-zinc-800 text-gray-900 dark:text-white ${readOnly ? "opacity-50 cursor-not-allowed" : ""}`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email Body
              </label>
              <div className={readOnly ? "opacity-50 pointer-events-none" : ""}>
                <MarkdownEditor
                  value={schema.settings?.rejectionEmailTemplate || ""}
                  onChange={(value: string) => updateSettings("rejectionEmailTemplate", value)}
                  placeholderText={`Thank you for your interest in {{programName}}.

After careful review, we regret to inform you that your application has not been selected at this time.

**Reference Number:** {{referenceNumber}}

{{reason}}

We encourage you to apply for future opportunities.`}
                  height={200}
                  minHeight={150}
                  disabled={readOnly}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Public Applications Link */}
      {!schema.settings?.privateApplications && programId && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
            Public Applications URL
          </h4>
          <div className="flex items-center gap-2">
            <ExternalLink
              className="text-blue-600 hover:text-blue-700 underline text-sm"
              href={getApplyUrlByCommunityId(communityId, programId)}
            >
              Browse All Applications
            </ExternalLink>
            <LinkIcon className="w-4 h-4 text-blue-500" />
          </div>
        </div>
      )}
    </div>
  );
}
