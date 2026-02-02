"use client";

import { IdentificationIcon } from "@heroicons/react/24/outline";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PageHeader } from "../FundingPlatform/PageHeader";
import { Button } from "../Utilities/Button";

// Zod schema for KYC/KYB URL validation
const kycSettingsSchema = z.object({
  kycFormUrl: z
    .string()
    .url("Please enter a valid URL")
    .or(z.literal(""))
    .optional()
    .transform((val) => val || ""),
  kybFormUrl: z
    .string()
    .url("Please enter a valid URL")
    .or(z.literal(""))
    .optional()
    .transform((val) => val || ""),
});

type KycSettingsFormData = z.infer<typeof kycSettingsSchema>;

interface KycSettingsConfigurationProps {
  programId: string;
  readOnly?: boolean;
  initialSettings?: {
    kycFormUrl?: string;
    kybFormUrl?: string;
  };
  onSave?: (settings: { kycFormUrl?: string; kybFormUrl?: string }) => void;
}

export function KycSettingsConfiguration({
  programId,
  readOnly = false,
  initialSettings,
  onSave,
}: KycSettingsConfigurationProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<KycSettingsFormData>({
    resolver: zodResolver(kycSettingsSchema),
    mode: "onBlur",
    defaultValues: {
      kycFormUrl: initialSettings?.kycFormUrl || "",
      kybFormUrl: initialSettings?.kybFormUrl || "",
    },
  });

  const onSubmit = async (data: KycSettingsFormData) => {
    if (readOnly || !onSave) return;

    // Call parent's save handler - the mutation's onSuccess will show the toast
    onSave({
      kycFormUrl: data.kycFormUrl || undefined,
      kybFormUrl: data.kybFormUrl || undefined,
    });
    // Reset form with new values so isDirty becomes false
    reset(data);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="KYC/KYB Settings"
        description="Configure program-specific identity verification form URLs. These settings override the community-level defaults for this program only."
        icon={IdentificationIcon}
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700 p-6">
          <div className="space-y-6">
            {/* KYC Form URL */}
            <div className="space-y-2">
              <label
                htmlFor="kycFormUrl"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                KYC Form URL
              </label>
              <input
                {...register("kycFormUrl")}
                type="text"
                id="kycFormUrl"
                disabled={readOnly}
                placeholder="https://provider.com/kyc-form/..."
                aria-invalid={!!errors.kycFormUrl}
                aria-describedby={errors.kycFormUrl ? "kycFormUrl-error" : undefined}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-zinc-700 dark:text-white ${
                  errors.kycFormUrl
                    ? "border-red-500 dark:border-red-500 focus:ring-red-500 focus:border-red-500"
                    : "border-gray-300 dark:border-zinc-600"
                } ${readOnly ? "opacity-50 cursor-not-allowed" : ""}`}
              />
              {errors.kycFormUrl && (
                <p
                  id="kycFormUrl-error"
                  className="text-sm text-red-500 dark:text-red-400"
                  role="alert"
                >
                  {errors.kycFormUrl.message}
                </p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400">
                URL for individual identity verification (Know Your Customer). Leave empty to use
                the community default.
              </p>
            </div>

            {/* KYB Form URL */}
            <div className="space-y-2">
              <label
                htmlFor="kybFormUrl"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                KYB Form URL
              </label>
              <input
                {...register("kybFormUrl")}
                type="text"
                id="kybFormUrl"
                disabled={readOnly}
                placeholder="https://provider.com/kyb-form/..."
                aria-invalid={!!errors.kybFormUrl}
                aria-describedby={errors.kybFormUrl ? "kybFormUrl-error" : undefined}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-zinc-700 dark:text-white ${
                  errors.kybFormUrl
                    ? "border-red-500 dark:border-red-500 focus:ring-red-500 focus:border-red-500"
                    : "border-gray-300 dark:border-zinc-600"
                } ${readOnly ? "opacity-50 cursor-not-allowed" : ""}`}
              />
              {errors.kybFormUrl && (
                <p
                  id="kybFormUrl-error"
                  className="text-sm text-red-500 dark:text-red-400"
                  role="alert"
                >
                  {errors.kybFormUrl.message}
                </p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400">
                URL for business identity verification (Know Your Business). Leave empty to use the
                community default.
              </p>
            </div>

            {/* Info box */}
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
              <h4 className="text-sm font-medium text-indigo-800 dark:text-indigo-300 mb-2">
                How it works
              </h4>
              <ul className="text-xs text-indigo-700 dark:text-indigo-400 space-y-1 list-disc list-inside">
                <li>
                  These URLs override the community-level KYC/KYB settings for this program only.
                </li>
                <li>
                  The verification provider (e.g., Treova) will automatically append the application
                  reference number.
                </li>
                <li>If left empty, the community default URLs will be used instead.</li>
              </ul>
            </div>

            {/* Save Button */}
            {!readOnly && (
              <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-zinc-700">
                <Button
                  type="submit"
                  disabled={!isDirty}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save KYC/KYB Settings
                </Button>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
