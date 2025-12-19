"use client";

import { LinkIcon } from "@heroicons/react/24/outline";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { type SettingsConfigFormData, settingsConfigSchema } from "@/schemas/settingsConfigSchema";
import { FUNDING_PLATFORM_DOMAINS } from "@/src/features/funding-map/utils/funding-platform-domains";
import type { FormSchema } from "@/types/question-builder";
import { envVars } from "@/utilities/enviromentVars";
import { formatDate } from "@/utilities/formatDate";
import { ExternalLink } from "../Utilities/ExternalLink";
import { MarkdownEditor } from "../Utilities/MarkdownEditor";

interface SettingsConfigurationProps {
  schema: FormSchema;
  onUpdate?: (updatedSchema: FormSchema) => void;
  className?: string;
  programId?: string;
  readOnly?: boolean;
}

const getApplyUrlByCommunityId = (communityId: string, programId: string) => {
  if (communityId in FUNDING_PLATFORM_DOMAINS) {
    const domain = FUNDING_PLATFORM_DOMAINS[communityId as keyof typeof FUNDING_PLATFORM_DOMAINS];
    return envVars.isDev
      ? `${domain.dev}/browse-applications?programId=${programId}`
      : `${domain.prod}/browse-applications?programId=${programId}`;
  } else {
    return envVars.isDev
      ? `${FUNDING_PLATFORM_DOMAINS.shared.dev}/${communityId}/browse-applications?programId=${programId}`
      : `${FUNDING_PLATFORM_DOMAINS.shared.prod}/${communityId}/browse-applications?programId=${programId}`;
  }
};

// Convert local datetime-local value to UTC ISO string
const convertLocalToUTC = (localDatetime: string | undefined): string | undefined => {
  if (!localDatetime) return undefined;

  const localDate = new Date(localDatetime);
  if (isNaN(localDate.getTime())) return undefined;

  return formatDate(localDate, "ISO");
};

// Convert UTC ISO string to local datetime-local format (YYYY-MM-DDTHH:mm)
const convertUTCToLocal = (utcDatetime: string | undefined): string => {
  if (!utcDatetime) return "";

  const date = new Date(utcDatetime);
  if (isNaN(date.getTime())) return "";

  return formatDate(date, "local", "datetime-local");
};

export function SettingsConfiguration({
  schema,
  onUpdate,
  className = "",
  programId,
  readOnly = false,
}: SettingsConfigurationProps) {
  const { communityId } = useParams() as { communityId: string };

  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SettingsConfigFormData>({
    resolver: zodResolver(settingsConfigSchema),
    defaultValues: {
      privateApplications: schema.settings?.privateApplications ?? true,
      applicationDeadline: convertUTCToLocal(schema.settings?.applicationDeadline),
      donationRound: schema.settings?.donationRound ?? false,
      successPageContent: schema.settings?.successPageContent ?? "",
      showCommentsOnPublicPage: schema.settings?.showCommentsOnPublicPage ?? false,
      approvalEmailTemplate: schema.settings?.approvalEmailTemplate ?? "",
      approvalEmailSubject: schema.settings?.approvalEmailSubject ?? "",
      rejectionEmailTemplate: schema.settings?.rejectionEmailTemplate ?? "",
      rejectionEmailSubject: schema.settings?.rejectionEmailSubject ?? "",
    },
  });

  // Watch for changes and auto-update
  useEffect(() => {
    if (readOnly || !onUpdate) return; // Don't update in read-only mode

    const subscription = watch((data) => {
      const updatedSchema: FormSchema = {
        ...schema,
        settings: {
          ...schema.settings,
          submitButtonText: schema.settings?.submitButtonText || "Submit Application",
          confirmationMessage:
            schema.settings?.confirmationMessage || "Thank you for your submission!",
          privateApplications: data.privateApplications ?? true,
          applicationDeadline: convertLocalToUTC(data.applicationDeadline),
          donationRound: data.donationRound ?? false,
          successPageContent: data.successPageContent,
          showCommentsOnPublicPage: data.showCommentsOnPublicPage ?? false,
          approvalEmailTemplate: data.approvalEmailTemplate,
          approvalEmailSubject: data.approvalEmailSubject,
          rejectionEmailTemplate: data.rejectionEmailTemplate,
          rejectionEmailSubject: data.rejectionEmailSubject,
        },
      };

      onUpdate(updatedSchema);
    });

    return () => subscription.unsubscribe();
  }, [watch, onUpdate, schema, readOnly]);

  const privateApplicationsValue = watch("privateApplications");
  const privateFieldsCount = schema.fields?.filter((field) => field.private).length || 0;

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700 p-6">
        {/* Browse All Applications URL Setting */}
        {watch("privateApplications") ? null : (
          <div className="flex flex-col space-y-2">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
              All Applications URL
            </div>
            <div className="flex flex-row items-center space-x-2">
              <ExternalLink
                className="underline text-blue-500"
                href={getApplyUrlByCommunityId(communityId, programId as string)}
              >
                Browse All Applications
              </ExternalLink>
              <LinkIcon className="w-4 h-4 text-blue-500" />
            </div>
          </div>
        )}

        <hr className="my-4" />

        <div className="space-y-6 py-4">
          {/* Application Deadline */}
          <div className="space-y-2">
            <label
              htmlFor="applicationDeadline"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Application Deadline
            </label>
            <input
              {...register("applicationDeadline")}
              type="datetime-local"
              id="applicationDeadline"
              disabled={readOnly}
              className={`w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-700 dark:text-white ${readOnly ? "opacity-50 cursor-not-allowed" : ""}`}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Set a deadline for when applications will no longer be accepted. Leave empty for no
              deadline.
            </p>
          </div>

          {/* Donation Round */}
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <input
                {...register("donationRound")}
                type="checkbox"
                id="donationRound"
                disabled={readOnly}
                className={`mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${readOnly ? "opacity-50 cursor-not-allowed" : ""}`}
              />
              <div className="flex-1">
                <label
                  htmlFor="donationRound"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Donation Round
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Enable this if this program is a donation round where users can contribute funds.
                </p>
              </div>
            </div>
          </div>

          <hr className="my-4" />

          {/* Success Page Content */}
          <div className="space-y-2">
            <label
              htmlFor="successPageContent"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Success Page Content
            </label>
            <div className={readOnly ? "opacity-50 pointer-events-none" : ""}>
              <MarkdownEditor
                value={watch("successPageContent") || ""}
                onChange={(newValue: string) => {
                  setValue("successPageContent", newValue || "", {
                    shouldValidate: true,
                  });
                }}
                placeholderText="**Review Process:** Your application will be carefully reviewed by the Grants Council.

**Notifications:** You'll receive an update by email within 3 weeks.

**Track Progress:** You can monitor your application status anytime through your dashboard."
                height={250}
                minHeight={200}
                disabled={readOnly}
              />
            </div>
          </div>
        </div>

        <hr className="my-4" />

        {/* Email Templates Section */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Email Templates</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Customize the emails sent to applicants when their applications are approved or
            rejected. Use placeholders like{" "}
            <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{"{{applicantName}}"}</code>
            , <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{"{{programName}}"}</code>
            , <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{"{{reason}}"}</code>,
            etc. Note: Project name and application details are already shown in the application
            info section of the email.
          </p>

          {/* Approval Email Template */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="approvalEmailSubject"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Approval Email Subject
              </label>
              <input
                {...register("approvalEmailSubject")}
                type="text"
                id="approvalEmailSubject"
                disabled={readOnly}
                placeholder="Congratulations! Your application has been approved - {{programName}}"
                className={`w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-700 dark:text-white ${readOnly ? "opacity-50 cursor-not-allowed" : ""}`}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Custom email subject. Leave empty to use default: "Congratulations! Your application
                has been approved - {"{{programName}}"}". Available placeholders:{" "}
                <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">
                  {"{{programName}}"}
                </code>
                ,{" "}
                <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">
                  {"{{applicantName}}"}
                </code>
              </p>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="approvalEmailTemplate"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Approval Email Body
              </label>
              <div className={readOnly ? "opacity-50 pointer-events-none" : ""}>
                <MarkdownEditor
                  value={watch("approvalEmailTemplate") || ""}
                  onChange={(newValue: string) => {
                    setValue("approvalEmailTemplate", newValue || "", {
                      shouldValidate: true,
                    });
                  }}
                  placeholderText={`Congratulations! Your application has been approved for the {{programName}} program.\n\n**Reference Number:** {{referenceNumber}}\n\n{{reason}}\n\nWe're excited to support your journey!`}
                  height={400}
                  minHeight={350}
                  disabled={readOnly}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Available placeholders:{" "}
                <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">
                  {"{{applicantName}}"}
                </code>
                ,{" "}
                <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">
                  {"{{programName}}"}
                </code>
                ,{" "}
                <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">
                  {"{{referenceNumber}}"}
                </code>
                ,{" "}
                <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">
                  {"{{dashboardLink}}"}
                </code>
                , <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{"{{reason}}"}</code>
              </p>
            </div>
          </div>

          {/* Rejection Email Template */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="rejectionEmailSubject"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Rejection Email Subject
              </label>
              <input
                {...register("rejectionEmailSubject")}
                type="text"
                id="rejectionEmailSubject"
                disabled={readOnly}
                placeholder="Thanks for Applying: Resources for {{programName}}"
                className={`w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-700 dark:text-white ${readOnly ? "opacity-50 cursor-not-allowed" : ""}`}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Custom email subject. Leave empty to use default: "Thanks for Applying: Resources
                for {"{{programName}}"}". Available placeholders:{" "}
                <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">
                  {"{{programName}}"}
                </code>
                ,{" "}
                <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">
                  {"{{applicantName}}"}
                </code>
              </p>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="rejectionEmailTemplate"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Rejection Email Body
              </label>
              <div className={readOnly ? "opacity-50 pointer-events-none" : ""}>
                <MarkdownEditor
                  value={watch("rejectionEmailTemplate") || ""}
                  onChange={(newValue: string) => {
                    setValue("rejectionEmailTemplate", newValue || "", {
                      shouldValidate: true,
                    });
                  }}
                  placeholderText={`After careful review, we regret to inform you that your application has not been selected for funding at this time.\n\n**Reference Number:** {{referenceNumber}}\n\n{{reason}}\n\nWe appreciate your interest and encourage you to apply for future opportunities.`}
                  height={400}
                  minHeight={350}
                  disabled={readOnly}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Available placeholders:{" "}
                <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">
                  {"{{applicantName}}"}
                </code>
                ,{" "}
                <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">
                  {"{{programName}}"}
                </code>
                ,{" "}
                <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">
                  {"{{referenceNumber}}"}
                </code>
                ,{" "}
                <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">
                  {"{{dashboardLink}}"}
                </code>
                , <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{"{{reason}}"}</code>
              </p>
            </div>
          </div>
        </div>

        <hr className="my-4" />

        <div className="space-y-6">
          {/* Show Comments on Public Page */}
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <input
                {...register("showCommentsOnPublicPage")}
                type="checkbox"
                id="showCommentsOnPublicPage"
                disabled={readOnly}
                className={`mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${readOnly ? "opacity-50 cursor-not-allowed" : ""}`}
              />
              <div className="flex-1">
                <label
                  htmlFor="showCommentsOnPublicPage"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Show comments on public page
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Enable this to display comments on public application pages. By default, comments
                  are hidden from public view.
                </p>
              </div>
            </div>
          </div>

          <hr className="my-4" />

          {/* Private Applications Setting */}
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <input
                {...register("privateApplications")}
                type="checkbox"
                disabled={readOnly}
                className={`mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${readOnly ? "opacity-50 cursor-not-allowed" : ""}`}
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Private Applications
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  When enabled, all application data will be hidden from public view. Only program
                  administrators and applicants can see applications.
                </p>
              </div>
            </div>

            {/* Warning when private applications is disabled but has private fields */}
            {!privateApplicationsValue && privateFieldsCount > 0 && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <svg
                    className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div className="text-xs text-amber-800 dark:text-amber-300">
                    <strong>Note:</strong> You have {privateFieldsCount} private field
                    {privateFieldsCount !== 1 ? "s" : ""} in your form. These will be filtered from
                    public responses even with public applications enabled.
                  </div>
                </div>
              </div>
            )}

            {/* Info when private applications is enabled */}
            {privateApplicationsValue && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <svg
                    className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div className="text-xs text-blue-800 dark:text-blue-300">
                    <strong>Private mode:</strong> Public API requests will return a privacy message
                    instead of application data. Only authenticated administrators can access
                    application details.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Privacy Summary */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              Privacy Summary
            </h4>
            <dl className="text-xs space-y-2">
              <div className="flex justify-between">
                <dt className="text-gray-600 dark:text-gray-400">Application Visibility:</dt>
                <dd className="text-gray-900 dark:text-white font-medium">
                  {privateApplicationsValue ? "Private" : "Public"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600 dark:text-gray-400">Private Fields:</dt>
                <dd className="text-gray-900 dark:text-white font-medium">
                  {privateFieldsCount} field
                  {privateFieldsCount !== 1 ? "s" : ""}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600 dark:text-gray-400">Public Fields:</dt>
                <dd className="text-gray-900 dark:text-white font-medium">
                  {(schema.fields?.length || 0) - privateFieldsCount} field
                  {(schema.fields?.length || 0) - privateFieldsCount !== 1 ? "s" : ""}
                </dd>
              </div>
            </dl>
          </div>

          {/* Help Text */}
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <p className="mb-2">
              <strong>Private Applications:</strong> Hide all application data from public view
            </p>
            <p>
              <strong>Private Fields:</strong> Individual fields marked as private are filtered from
              public responses (configure per field in the form builder)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
