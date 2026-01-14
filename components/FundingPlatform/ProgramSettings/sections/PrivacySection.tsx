"use client";

import { EyeIcon, EyeSlashIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import type { FormSchema } from "@/types/question-builder";

interface PrivacySectionProps {
  schema: FormSchema;
  onUpdate: (schema: FormSchema) => void;
  readOnly?: boolean;
}

export function PrivacySection({ schema, onUpdate, readOnly = false }: PrivacySectionProps) {
  const privateFieldsCount = schema.fields?.filter((field) => field.private).length || 0;
  const publicFieldsCount = (schema.fields?.length || 0) - privateFieldsCount;
  const isPrivate = schema.settings?.privateApplications ?? true;
  const showComments = schema.settings?.showCommentsOnPublicPage ?? false;
  const isDonationRound = schema.settings?.donationRound ?? false;

  const updateSettings = (key: string, value: boolean) => {
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
    <div className="space-y-6">
      {/* Main Privacy Toggle */}
      <div className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
        <div className="flex items-start gap-4">
          <div
            className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
              isPrivate
                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600"
                : "bg-green-100 dark:bg-green-900/30 text-green-600"
            }`}
          >
            {isPrivate ? (
              <EyeSlashIcon className="w-6 h-6" />
            ) : (
              <EyeIcon className="w-6 h-6" />
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Application Visibility
              </h3>
              <button
                type="button"
                onClick={() => updateSettings("privateApplications", !isPrivate)}
                disabled={readOnly}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  readOnly ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                } ${isPrivate ? "bg-blue-600" : "bg-green-600"}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isPrivate ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {isPrivate
                ? "Applications are private. Only admins and applicants can view them."
                : "Applications are public. Anyone can view approved applications."}
            </p>

            {/* Status Badge */}
            <div
              className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full text-sm font-medium ${
                isPrivate
                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                  : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
              }`}
            >
              {isPrivate ? (
                <>
                  <LockClosedIcon className="w-4 h-4" />
                  Private Mode
                </>
              ) : (
                <>
                  <EyeIcon className="w-4 h-4" />
                  Public Mode
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Additional Settings */}
      <div className="space-y-4">
        {/* Show Comments */}
        <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-lg">
          <input
            type="checkbox"
            id="showComments"
            checked={showComments}
            onChange={(e) => updateSettings("showCommentsOnPublicPage", e.target.checked)}
            disabled={readOnly}
            className={`mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${
              readOnly ? "opacity-50 cursor-not-allowed" : ""
            }`}
          />
          <div>
            <label
              htmlFor="showComments"
              className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
            >
              Show comments on public pages
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Display reviewer comments on public application pages.
            </p>
          </div>
        </div>

        {/* Donation Round */}
        <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-lg">
          <input
            type="checkbox"
            id="donationRound"
            checked={isDonationRound}
            onChange={(e) => updateSettings("donationRound", e.target.checked)}
            disabled={readOnly}
            className={`mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${
              readOnly ? "opacity-50 cursor-not-allowed" : ""
            }`}
          />
          <div>
            <label
              htmlFor="donationRound"
              className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
            >
              Donation Round
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Enable this if this program accepts donations from the community.
            </p>
          </div>
        </div>
      </div>

      {/* Privacy Summary */}
      <div className="bg-gray-100 dark:bg-zinc-800 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Privacy Summary</h4>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-500 dark:text-gray-400">Visibility</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {isPrivate ? "Private" : "Public"}
            </p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Private Fields</p>
            <p className="font-medium text-gray-900 dark:text-white">{privateFieldsCount}</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Public Fields</p>
            <p className="font-medium text-gray-900 dark:text-white">{publicFieldsCount}</p>
          </div>
        </div>

        {/* Warning for public with private fields */}
        {!isPrivate && privateFieldsCount > 0 && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              <strong>Note:</strong> {privateFieldsCount} field
              {privateFieldsCount !== 1 ? "s are" : " is"} marked as private and will be hidden from
              public view even though applications are public.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
