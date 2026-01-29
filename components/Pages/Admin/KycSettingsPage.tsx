"use client";

import { ChevronLeftIcon } from "@heroicons/react/20/solid";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";
import { Button } from "@/components/Utilities/Button";
import { Spinner } from "@/components/Utilities/Spinner";
import { useKycConfig, useSaveKycConfig } from "@/hooks/useKycStatus";
import type { Community } from "@/types/v2/community";
import { envVars } from "@/utilities/enviromentVars";
import { PAGES } from "@/utilities/pages";

const kycConfigSchema = z.object({
  providerType: z.enum(["TREOVA"]),
  providerName: z.string().min(1, "Provider name is required"),
  kycFormUrl: z.string().url("Must be a valid URL"),
  kybFormUrl: z.string().url("Must be a valid URL"),
  validityMonths: z.number().int().min(1).max(60),
  isEnabled: z.boolean(),
});

type KycConfigFormData = z.infer<typeof kycConfigSchema>;

interface KycSettingsPageProps {
  community: Community;
}

export function KycSettingsPage({ community }: KycSettingsPageProps) {
  const communityUID = community.uid;
  const { config, isLoading, error } = useKycConfig(communityUID);
  const { mutate: saveConfig, isPending: isSaving } = useSaveKycConfig(communityUID);
  const [isInitialized, setIsInitialized] = useState(false);

  const form = useForm<KycConfigFormData>({
    resolver: zodResolver(kycConfigSchema),
    defaultValues: {
      providerType: "TREOVA",
      providerName: "Treova",
      kycFormUrl: "",
      kybFormUrl: "",
      validityMonths: 12,
      isEnabled: true,
    },
  });

  // Reset form when config loads
  useEffect(() => {
    if (config && !isInitialized) {
      form.reset({
        providerType: (config.providerType as "TREOVA") || "TREOVA",
        providerName: config.providerName || "Treova",
        kycFormUrl: config.kycFormUrl || "",
        kybFormUrl: config.kybFormUrl || "",
        validityMonths: config.validityMonths || 12,
        isEnabled: config.isEnabled ?? true,
      });
      setIsInitialized(true);
    }
  }, [config, form, isInitialized]);

  const onSubmit = (data: KycConfigFormData) => {
    saveConfig(data, {
      onSuccess: () => {
        toast.success("KYC configuration saved successfully");
      },
      onError: (err) => {
        toast.error(err.message || "Failed to save configuration");
      },
    });
  };

  const webhookUrl = `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}/v2/webhooks/kyc/treova`;

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success("Webhook URL copied to clipboard");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <p className="text-red-600 dark:text-red-400">
          Failed to load KYC configuration. Please try again.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      {/* Back to Admin */}
      <Link href={PAGES.ADMIN.ROOT(community.details?.slug || community.uid)}>
        <Button className="flex flex-row items-center gap-2 px-4 py-2 bg-transparent text-black dark:text-white dark:bg-transparent hover:bg-transparent rounded-md transition-all ease-in-out duration-200">
          <ChevronLeftIcon className="h-5 w-5" />
          Return to admin page
        </Button>
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">KYC/KYB Configuration</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Configure identity verification for grantees in{" "}
          {community.details?.name || "this community"}.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-zinc-800 rounded-lg">
          <input
            type="checkbox"
            id="isEnabled"
            {...form.register("isEnabled")}
            className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <label htmlFor="isEnabled" className="text-sm font-medium text-gray-900 dark:text-white">
            Enable KYC Verification for this Community
          </label>
        </div>

        {/* Provider Selection */}
        <div className="space-y-2">
          <label
            htmlFor="providerType"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            KYC Provider
          </label>
          <select
            id="providerType"
            {...form.register("providerType")}
            className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
          >
            <option value="TREOVA">Treova</option>
          </select>
        </div>

        {/* Provider Name */}
        <div className="space-y-2">
          <label
            htmlFor="providerName"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Provider Display Name
          </label>
          <input
            id="providerName"
            type="text"
            {...form.register("providerName")}
            placeholder="Treova"
            className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
          />
          {form.formState.errors.providerName && (
            <p className="text-sm text-red-600">{form.formState.errors.providerName.message}</p>
          )}
        </div>

        {/* KYC Form URL */}
        <div className="space-y-2">
          <label
            htmlFor="kycFormUrl"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            KYC Form URL (Individual Verification)
          </label>
          <input
            id="kycFormUrl"
            type="url"
            {...form.register("kycFormUrl")}
            placeholder="https://kyc.treova.ai/cmp_xxx"
            className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
          />
          {form.formState.errors.kycFormUrl && (
            <p className="text-sm text-red-600">{form.formState.errors.kycFormUrl.message}</p>
          )}
          <p className="text-xs text-gray-500">
            Get this URL from your Treova dashboard campaign settings
          </p>
        </div>

        {/* KYB Form URL */}
        <div className="space-y-2">
          <label
            htmlFor="kybFormUrl"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            KYB Form URL (Business Verification)
          </label>
          <input
            id="kybFormUrl"
            type="url"
            {...form.register("kybFormUrl")}
            placeholder="https://kyb.treova.ai/cmp_xxx"
            className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
          />
          {form.formState.errors.kybFormUrl && (
            <p className="text-sm text-red-600">{form.formState.errors.kybFormUrl.message}</p>
          )}
        </div>

        {/* Validity Period */}
        <div className="space-y-2">
          <label
            htmlFor="validityMonths"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Verification Validity (months)
          </label>
          <input
            id="validityMonths"
            type="number"
            {...form.register("validityMonths", { valueAsNumber: true })}
            min={1}
            max={60}
            className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
          />
          {form.formState.errors.validityMonths && (
            <p className="text-sm text-red-600">{form.formState.errors.validityMonths.message}</p>
          )}
          <p className="text-xs text-gray-500">
            How long a successful verification remains valid before expiring
          </p>
        </div>

        {/* Webhook URL (read-only) */}
        <div className="space-y-2">
          <label
            htmlFor="webhookUrl"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Webhook URL
          </label>
          <div className="flex gap-2">
            <input
              id="webhookUrl"
              type="text"
              value={webhookUrl}
              readOnly
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md bg-gray-50 dark:bg-zinc-900 text-gray-600 dark:text-gray-400"
            />
            <Button type="button" onClick={copyWebhookUrl} className="shrink-0">
              Copy
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Provide this URL to Treova for webhook configuration. They will send verification status
            updates here.
          </p>
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
            {isSaving ? (
              <>
                <Spinner className="w-4 h-4 mr-2" />
                Saving...
              </>
            ) : (
              "Save Configuration"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
