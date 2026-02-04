"use client";

import { EnvelopeIcon, PlusIcon, XMarkIcon } from "@heroicons/react/24/solid";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Spinner } from "@/components/Utilities/Spinner";
import { useIsCommunityAdmin } from "@/hooks/communities/useIsCommunityAdmin";
import { useProgramConfig } from "@/hooks/useFundingPlatform";
import { validateEmail } from "@/utilities/validators";
import { PAGE_HEADER_CONTENT, PageHeader } from "../PageHeader";

interface ProgramContactsTabProps {
  programId: string;
  communityId: string;
  readOnly?: boolean;
}

interface EmailListSectionProps {
  title: string;
  description: string;
  emails: string[];
  onAdd: (email: string) => void;
  onRemove: (index: number) => void;
  readOnly: boolean;
  placeholder: string;
  testIdPrefix: string;
}

function EmailListSection({
  title,
  description,
  emails,
  onAdd,
  onRemove,
  readOnly,
  placeholder,
  testIdPrefix,
}: EmailListSectionProps) {
  const [inputValue, setInputValue] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);

  const handleAdd = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    if (!validateEmail(trimmed)) {
      setInputError("Please enter a valid email address");
      return;
    }

    if (emails.includes(trimmed)) {
      setInputError("This email is already added");
      return;
    }

    setInputError(null);
    onAdd(trimmed);
    setInputValue("");
  }, [inputValue, emails, onAdd]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAdd();
      }
    },
    [handleAdd]
  );

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
      </div>

      {emails.length > 0 && (
        <div className="space-y-2 mb-4" data-testid={`${testIdPrefix}-list`}>
          {emails.map((email, index) => (
            <div
              key={email}
              className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 px-4 py-3 rounded-lg group hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <EnvelopeIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{email}</span>
              </div>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors opacity-0 group-hover:opacity-100"
                  aria-label={`Remove ${email}`}
                  data-testid={`${testIdPrefix}-remove-${index}`}
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {emails.length === 0 && (
        <div className="text-center py-6 mb-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
          <EnvelopeIcon className="mx-auto h-10 w-10 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            No email addresses added yet
          </p>
        </div>
      )}

      {!readOnly && (
        <div className="space-y-2">
          <label
            htmlFor={`${testIdPrefix}-input`}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Add Email Address
          </label>
          <div className="flex gap-2">
            <input
              id={`${testIdPrefix}-input`}
              type="email"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                if (inputError) setInputError(null);
              }}
              onKeyDown={handleKeyDown}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500"
              placeholder={placeholder}
              data-testid={`${testIdPrefix}-input`}
            />
            <button
              type="button"
              onClick={handleAdd}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
              data-testid={`${testIdPrefix}-add-btn`}
            >
              <PlusIcon className="w-5 h-5" />
              Add
            </button>
          </div>
          {inputError && (
            <p
              className="text-xs text-red-500 dark:text-red-400"
              data-testid={`${testIdPrefix}-error`}
            >
              {inputError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export const ProgramContactsTab: React.FC<ProgramContactsTabProps> = ({
  programId,
  communityId,
  readOnly = false,
}) => {
  const { isCommunityAdmin, isLoading: isLoadingAdmin } = useIsCommunityAdmin(communityId);
  const { data: programData, updateConfig, isUpdating } = useProgramConfig(programId);

  const formSchema = programData?.applicationConfig?.formSchema;
  const settings =
    formSchema && typeof formSchema === "object" && "settings" in formSchema
      ? (formSchema as Record<string, any>).settings
      : undefined;

  const savedAdminEmails: string[] =
    settings && Array.isArray(settings.adminEmails) ? settings.adminEmails : [];
  const savedFinanceEmails: string[] =
    settings && Array.isArray(settings.financeEmails) ? settings.financeEmails : [];

  // Local state for editing — synced from server data
  const [localAdminEmails, setLocalAdminEmails] = useState<string[]>(savedAdminEmails);
  const [localFinanceEmails, setLocalFinanceEmails] = useState<string[]>(savedFinanceEmails);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Sync local state when server data changes (initial load or after save)
  useEffect(() => {
    setLocalAdminEmails(savedAdminEmails);
  }, [JSON.stringify(savedAdminEmails)]);

  useEffect(() => {
    setLocalFinanceEmails(savedFinanceEmails);
  }, [JSON.stringify(savedFinanceEmails)]);

  // Track whether local state differs from saved data
  const hasUnsavedChanges = useMemo(() => {
    return (
      JSON.stringify(localAdminEmails) !== JSON.stringify(savedAdminEmails) ||
      JSON.stringify(localFinanceEmails) !== JSON.stringify(savedFinanceEmails)
    );
  }, [localAdminEmails, localFinanceEmails, savedAdminEmails, savedFinanceEmails]);

  const handleAddAdminEmail = useCallback(
    (email: string) => {
      setLocalAdminEmails((prev) => [...prev, email]);
      if (saveError) setSaveError(null);
    },
    [saveError]
  );

  const handleRemoveAdminEmail = useCallback(
    (index: number) => {
      setLocalAdminEmails((prev) => prev.filter((_, i) => i !== index));
      if (saveError) setSaveError(null);
    },
    [saveError]
  );

  const handleAddFinanceEmail = useCallback(
    (email: string) => {
      setLocalFinanceEmails((prev) => [...prev, email]);
      if (saveError) setSaveError(null);
    },
    [saveError]
  );

  const handleRemoveFinanceEmail = useCallback(
    (index: number) => {
      setLocalFinanceEmails((prev) => prev.filter((_, i) => i !== index));
      if (saveError) setSaveError(null);
    },
    [saveError]
  );

  const handleSave = useCallback(() => {
    // Validate locally before sending
    if (localAdminEmails.length === 0) {
      setSaveError("At least one admin email is required.");
      return;
    }
    if (localFinanceEmails.length === 0) {
      setSaveError("At least one finance email is required.");
      return;
    }

    setSaveError(null);

    const currentFormSchema =
      programData?.applicationConfig?.formSchema &&
      typeof programData.applicationConfig.formSchema === "object"
        ? { ...programData.applicationConfig.formSchema }
        : { id: `form_${Date.now()}`, fields: [], settings: {} };

    const currentSettings =
      "settings" in currentFormSchema && currentFormSchema.settings
        ? { ...currentFormSchema.settings }
        : {};

    const updatedFormSchema = {
      ...currentFormSchema,
      settings: {
        ...currentSettings,
        adminEmails: localAdminEmails,
        financeEmails: localFinanceEmails,
      },
    };

    updateConfig({
      formSchema: updatedFormSchema,
    });
  }, [localAdminEmails, localFinanceEmails, programData, updateConfig]);

  if (isLoadingAdmin) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!isCommunityAdmin && !readOnly) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          You don{"'"}t have permission to manage contacts for this program.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <PageHeader
          title="Program Contacts"
          description="Manage admin and finance email contacts for this program. Admin emails are used as reply-to addresses on applicant notifications. Finance contacts are notified when milestones are verified."
          icon={EnvelopeIcon}
        />

        <div className="space-y-6">
          <EmailListSection
            title="Admin Emails"
            description="Admin contacts receive replies from applicants. The first admin email is used as the reply-to address on all applicant-facing emails. At least one admin email is required."
            emails={localAdminEmails}
            onAdd={handleAddAdminEmail}
            onRemove={handleRemoveAdminEmail}
            readOnly={readOnly}
            placeholder="admin@example.com"
            testIdPrefix="admin-email"
          />

          <EmailListSection
            title="Finance Emails"
            description="Finance contacts receive notifications when milestones are verified by reviewers, so they can process payments. At least one finance email is required."
            emails={localFinanceEmails}
            onAdd={handleAddFinanceEmail}
            onRemove={handleRemoveFinanceEmail}
            readOnly={readOnly}
            placeholder="finance@example.com"
            testIdPrefix="finance-email"
          />

          {saveError && (
            <p className="text-sm text-red-600 dark:text-red-400" data-testid="save-error">
              {saveError}
            </p>
          )}

          {!readOnly && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={isUpdating || !hasUnsavedChanges}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                data-testid="save-contacts-btn"
              >
                {isUpdating && <Spinner className="h-4 w-4" />}
                {isUpdating ? "Saving..." : "Save Contacts"}
              </button>
              {hasUnsavedChanges && !isUpdating && (
                <span
                  className="text-sm text-amber-600 dark:text-amber-400"
                  data-testid="unsaved-changes"
                >
                  You have unsaved changes
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
