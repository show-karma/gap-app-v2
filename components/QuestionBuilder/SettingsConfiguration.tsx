"use client";

import {
  ClipboardDocumentIcon,
  EnvelopeIcon,
  LinkIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { CheckIcon, Cog6ToothIcon } from "@heroicons/react/24/solid";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { type SettingsConfigFormData, settingsConfigSchema } from "@/schemas/settingsConfigSchema";
import type { FormSchema } from "@/types/question-builder";
import { formatDate } from "@/utilities/formatDate";
import { getBrowseApplicationsUrl, getGatedApplyUrl } from "@/utilities/fundingPlatformUrls";
import { PAGE_HEADER_CONTENT, PageHeader } from "../FundingPlatform/PageHeader";
import { PlaceholderReference } from "../FundingPlatform/PlaceholderReference";
import { ExternalLink } from "../Utilities/ExternalLink";
import { MarkdownEditor } from "../Utilities/MarkdownEditor";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";

interface SettingsConfigurationProps {
  schema: FormSchema;
  onUpdate?: (updatedSchema: FormSchema) => void;
  className?: string;
  programId?: string;
  readOnly?: boolean;
}

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
  const [copied, setCopied] = useState(false);

  const handleCopyGatedUrl = async () => {
    const accessCodeValue = watch("accessCode");
    if (!accessCodeValue || !programId) return;

    const url = getGatedApplyUrl(communityId, programId, accessCodeValue);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy URL:", err);
    }
  };

  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SettingsConfigFormData>({
    resolver: zodResolver(settingsConfigSchema),
    mode: "onTouched",
    defaultValues: {
      privateApplications: schema.settings?.privateApplications ?? true,
      donationRound: schema.settings?.donationRound ?? false,
      successPageContent: schema.settings?.successPageContent ?? "",
      showCommentsOnPublicPage: schema.settings?.showCommentsOnPublicPage ?? false,
      approvalEmailTemplate: schema.settings?.approvalEmailTemplate ?? "",
      approvalEmailSubject: schema.settings?.approvalEmailSubject ?? "",
      rejectionEmailTemplate: schema.settings?.rejectionEmailTemplate ?? "",
      rejectionEmailSubject: schema.settings?.rejectionEmailSubject ?? "",
      accessCode: schema.settings?.accessCode ?? "",
    },
  });

  // Debounce timer ref for watch subscription
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Memoized update handler to prevent unnecessary re-renders
  const debouncedUpdate = useCallback(
    (data: Partial<SettingsConfigFormData>) => {
      if (!onUpdate) return;

      const updatedSchema: FormSchema = {
        ...schema,
        settings: {
          ...schema.settings,
          submitButtonText: schema.settings?.submitButtonText || "Submit Application",
          confirmationMessage:
            schema.settings?.confirmationMessage || "Thank you for your submission!",
          privateApplications: data.privateApplications ?? true,
          donationRound: data.donationRound ?? false,
          successPageContent: data.successPageContent,
          showCommentsOnPublicPage: data.showCommentsOnPublicPage ?? false,
          approvalEmailTemplate: data.approvalEmailTemplate,
          approvalEmailSubject: data.approvalEmailSubject,
          rejectionEmailTemplate: data.rejectionEmailTemplate,
          rejectionEmailSubject: data.rejectionEmailSubject,
          // Only send accessCode - backend derives accessCodeEnabled from it
          accessCode: data.accessCode,
        },
      };

      onUpdate(updatedSchema);
    },
    [onUpdate, schema]
  );

  // Watch for changes with debounce to prevent excessive re-renders during typing
  useEffect(() => {
    if (readOnly || !onUpdate) return; // Don't update in read-only mode

    const subscription = watch((data) => {
      // Clear any pending debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Debounce the update by 300ms to prevent re-renders on every keystroke
      debounceTimerRef.current = setTimeout(() => {
        debouncedUpdate(data);
      }, 300);
    });

    return () => {
      subscription.unsubscribe();
      // Clean up debounce timer on unmount
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [watch, onUpdate, readOnly, debouncedUpdate]);

  const privateApplicationsValue = watch("privateApplications");
  const privateFieldsCount = schema.fields?.filter((field) => field.private).length || 0;

  return (
    <div className={`space-y-6 ${className}`}>
      <PageHeader
        title={PAGE_HEADER_CONTENT.emailPrivacy.title}
        description={PAGE_HEADER_CONTENT.emailPrivacy.description}
        icon={Cog6ToothIcon}
      />
      <div className="bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700">
        <Accordion type="multiple" defaultValue={["application-settings"]} className="w-full">
          {/* Application Settings Section */}
          <AccordionItem
            value="application-settings"
            className="border-b border-gray-200 dark:border-zinc-700"
          >
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-gray-50 dark:hover:bg-zinc-700/50">
              <div className="flex items-center gap-3">
                <SparklesIcon className="w-5 h-5 text-blue-500" />
                <div className="text-left">
                  <div className="font-medium text-gray-900 dark:text-white">
                    Application Settings
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                    Configure submission behavior and success page
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="space-y-6">
                {/* Donation Round */}
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
                      Enable this if this program is a donation round where users can contribute
                      funds.
                    </p>
                  </div>
                </div>

                {/* Success Page Content */}
                <div className="space-y-2 pt-4 border-t border-gray-100 dark:border-zinc-700">
                  <label
                    htmlFor="successPageContent"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Success Page Content
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Customize the message shown after a successful application submission.
                  </p>
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
                      height={200}
                      minHeight={150}
                      disabled={readOnly}
                    />
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Email Templates Section */}
          <AccordionItem
            value="email-templates"
            className="border-b border-gray-200 dark:border-zinc-700"
          >
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-gray-50 dark:hover:bg-zinc-700/50">
              <div className="flex items-center gap-3">
                <EnvelopeIcon className="w-5 h-5 text-green-500" />
                <div className="text-left">
                  <div className="font-medium text-gray-900 dark:text-white">Email Templates</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                    Customize approval and rejection emails
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="space-y-6">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Customize the emails sent to applicants when their applications are approved or
                  rejected. Project name and application details are shown automatically.
                </p>

                {/* Placeholder Reference */}
                <PlaceholderReference />

                {/* Approval Email */}
                <div className="space-y-4 p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
                  <h4 className="text-sm font-semibold text-green-800 dark:text-green-400">
                    Approval Email
                  </h4>
                  <div className="space-y-2">
                    <label
                      htmlFor="approvalEmailSubject"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Subject
                    </label>
                    <input
                      {...register("approvalEmailSubject")}
                      type="text"
                      id="approvalEmailSubject"
                      disabled={readOnly}
                      placeholder="Congratulations! Your application has been approved - {{programName}}"
                      className={`w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-700 dark:text-white ${readOnly ? "opacity-50 cursor-not-allowed" : ""}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="approvalEmailTemplate"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Body
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
                        height={250}
                        minHeight={200}
                        disabled={readOnly}
                      />
                    </div>
                  </div>
                </div>

                {/* Rejection Email */}
                <div className="space-y-4 p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800">
                  <h4 className="text-sm font-semibold text-red-800 dark:text-red-400">
                    Rejection Email
                  </h4>
                  <div className="space-y-2">
                    <label
                      htmlFor="rejectionEmailSubject"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Subject
                    </label>
                    <input
                      {...register("rejectionEmailSubject")}
                      type="text"
                      id="rejectionEmailSubject"
                      disabled={readOnly}
                      placeholder="Thanks for Applying: Resources for {{programName}}"
                      className={`w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-700 dark:text-white ${readOnly ? "opacity-50 cursor-not-allowed" : ""}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="rejectionEmailTemplate"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Body
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
                        height={250}
                        minHeight={200}
                        disabled={readOnly}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Privacy Settings Section */}
          <AccordionItem
            value="privacy-settings"
            className="border-b border-gray-200 dark:border-zinc-700"
          >
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-gray-50 dark:hover:bg-zinc-700/50">
              <div className="flex items-center gap-3">
                <ShieldCheckIcon className="w-5 h-5 text-purple-500" />
                <div className="text-left">
                  <div className="font-medium text-gray-900 dark:text-white">Privacy Settings</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                    Control application visibility and comments
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="space-y-6">
                {/* Browse All Applications URL */}
                {!watch("privateApplications") && (
                  <div className="flex flex-col space-y-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      All Applications URL
                    </div>
                    <div className="flex flex-row items-center space-x-2">
                      <ExternalLink
                        className="underline text-blue-500"
                        href={getBrowseApplicationsUrl(communityId, programId as string)}
                      >
                        Browse All Applications
                      </ExternalLink>
                      <LinkIcon className="w-4 h-4 text-blue-500" />
                    </div>
                  </div>
                )}

                {/* Private Applications */}
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
                        When enabled, all application data will be hidden from public view.
                      </p>
                    </div>
                  </div>

                  {/* Warning/Info boxes */}
                  {!privateApplicationsValue && privateFieldsCount > 0 && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 ml-6">
                      <div className="text-xs text-amber-800 dark:text-amber-300">
                        <strong>Note:</strong> You have {privateFieldsCount} private field
                        {privateFieldsCount !== 1 ? "s" : ""} that will be filtered from public
                        responses.
                      </div>
                    </div>
                  )}

                  {privateApplicationsValue && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 ml-6">
                      <div className="text-xs text-blue-800 dark:text-blue-300">
                        <strong>Private mode:</strong> Only authenticated administrators can access
                        application details.
                      </div>
                    </div>
                  )}
                </div>

                {/* Show Comments */}
                <div className="flex items-start space-x-3 pt-4 border-t border-gray-100 dark:border-zinc-700">
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
                      Display comments on public application pages.
                    </p>
                  </div>
                </div>

                {/* Privacy Summary */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mt-4">
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
                        {privateFieldsCount} field{privateFieldsCount !== 1 ? "s" : ""}
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
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Access Control Section */}
          <AccordionItem value="access-control" className="border-b-0">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-gray-50 dark:hover:bg-zinc-700/50">
              <div className="flex items-center gap-3">
                <LockClosedIcon className="w-5 h-5 text-amber-500" />
                <div className="text-left">
                  <div className="font-medium text-gray-900 dark:text-white">Access Control</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                    Gate applications with an access code
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor="accessCode"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Access Code
                  </label>
                  <input
                    {...register("accessCode")}
                    type="text"
                    id="accessCode"
                    disabled={readOnly}
                    placeholder="Enter a code to gate this application"
                    aria-describedby="accessCode-help accessCode-error"
                    aria-invalid={!!errors.accessCode}
                    className={`w-full max-w-xs px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-700 dark:text-white font-mono ${
                      errors.accessCode
                        ? "border-red-500 dark:border-red-500"
                        : "border-gray-300 dark:border-zinc-600"
                    } ${readOnly ? "opacity-50 cursor-not-allowed" : ""}`}
                  />
                  {errors.accessCode && (
                    <p
                      id="accessCode-error"
                      className="text-red-500 dark:text-red-400 text-sm"
                      role="alert"
                    >
                      {errors.accessCode.message}
                    </p>
                  )}
                  <p id="accessCode-help" className="text-xs text-gray-500 dark:text-gray-400">
                    Applicants will need to enter this code to unlock the form. Leave empty for open
                    applications. Must be at least 6 characters with no spaces.
                  </p>

                  {/* Copy gated URL button */}
                  {watch("accessCode") && programId && (
                    <button
                      type="button"
                      onClick={handleCopyGatedUrl}
                      className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                    >
                      {copied ? (
                        <>
                          <CheckIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                          <span className="text-green-600 dark:text-green-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <ClipboardDocumentIcon className="w-4 h-4" />
                          <span>Copy gated application URL</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
