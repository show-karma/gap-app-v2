"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Bell, Send, Loader2, AlertTriangle, Info,
  Eye, EyeOff, CheckCircle2, XCircle, MessageSquare, Hash,
} from "lucide-react";
import { Button } from "@/components/Utilities/Button";
import { Spinner } from "@/components/Utilities/Spinner";
import { useCommunityAdminAccess } from "@/hooks/communities/useCommunityAdminAccess";
import {
  useCommunityConfig,
  useCommunityConfigMutation,
} from "@/hooks/useCommunityConfig";
import { useTestNotificationConfig } from "@/hooks/useNotificationConfig";
import type { Community } from "@/types/v2/community";
import { MESSAGES } from "@/utilities/messages";

// ── Kill Switch ──

function KillSwitchCard({
  disabled,
  onToggle,
  isSaving,
}: {
  disabled: boolean;
  onToggle: (value: boolean) => void;
  isSaving: boolean;
}) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-50 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Email Kill Switch
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Silence all reviewer, admin &amp; finance emails
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={disabled}
            onClick={() => onToggle(!disabled)}
            disabled={isSaving}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
              disabled ? "bg-red-500" : "bg-gray-200 dark:bg-zinc-700"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                disabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>
      {disabled && (
        <div className="px-6 py-3 bg-red-50 dark:bg-red-900/10 border-t border-red-100 dark:border-red-900/20">
          <p className="text-sm text-red-700 dark:text-red-300">
            All reviewer, admin, and finance emails are <strong>disabled</strong>. Applicant and grantee emails are not affected.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Provider Config Card ──

interface FieldDef {
  key: string;
  label: string;
  placeholder: string;
  type?: string;
  secret?: boolean;
  value: string;
}

function ProviderConfigCard({
  title,
  description,
  providerType,
  communitySlug,
  isEnabled,
  fields,
}: {
  title: string;
  description: string;
  providerType: "TELEGRAM" | "SLACK";
  communitySlug: string;
  isEnabled: boolean;
  fields: FieldDef[];
}) {
  const { mutate: saveConfig, isPending: isSaving } = useCommunityConfigMutation();
  const { mutate: testConfig, isPending: isTesting } = useTestNotificationConfig(communitySlug);
  const [showSecrets, setShowSecrets] = useState(false);

  const schemaFields: Record<string, any> = { isEnabled: z.boolean() };
  for (const f of fields) {
    schemaFields[f.key] = f.type === "url"
      ? z.string().url("Must be a valid URL")
      : z.string().min(1, `${f.label} is required`);
  }
  const schema = z.object(schemaFields);

  const defaults: Record<string, any> = { isEnabled };
  for (const f of fields) {
    defaults[f.key] = f.value ?? "";
  }

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  const prevKey = useRef("");
  const currentKey = JSON.stringify(defaults);
  useEffect(() => {
    if (currentKey !== prevKey.current) {
      prevKey.current = currentKey;
      form.reset(defaults);
    }
  }, [currentKey, form, defaults]);

  const onSubmit = (data: any) => {
    const patch: Record<string, any> = {};
    if (providerType === "TELEGRAM") {
      patch.telegramEnabled = data.isEnabled;
      patch.telegramBotToken = data.botToken || null;
      patch.telegramChatId = data.chatId || null;
    } else {
      patch.slackEnabled = data.isEnabled;
      patch.slackWebhookUrl = data.webhookUrl || null;
    }
    saveConfig(
      { slug: communitySlug, config: patch },
      {
        onSuccess: () => toast.success(`${title} configuration saved`),
        onError: (err) => toast.error(err.message || "Failed to save"),
      }
    );
  };

  const handleTest = () => {
    const values = form.getValues();
    testConfig(
      {
        providerType,
        botToken: providerType === "TELEGRAM" ? values.botToken : null,
        chatId: providerType === "TELEGRAM" ? values.chatId : null,
        webhookUrl: providerType === "SLACK" ? values.webhookUrl : null,
      },
      {
        onSuccess: (result) => {
          if (result.success) toast.success("Test notification sent!");
          else toast.error(result.message || "Test failed");
        },
        onError: (err) => toast.error(err.message || "Test failed"),
      }
    );
  };

  const enabled = form.watch("isEnabled");

  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              providerType === "TELEGRAM"
                ? "bg-blue-50 dark:bg-blue-900/30"
                : "bg-purple-50 dark:bg-purple-900/30"
            }`}>
              {providerType === "TELEGRAM"
                ? <MessageSquare className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                : <Hash className="w-5 h-5 text-purple-500 dark:text-purple-400" />
              }
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
            </div>
          </div>
          {isEnabled ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" /> Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-gray-400">
              <XCircle className="w-4 h-4" /> Inactive
            </span>
          )}
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-5">
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            {...form.register("isEnabled")}
            className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            Enable {title} notifications
          </span>
        </label>

        {fields.map((f) => (
          <div key={f.key} className={enabled ? "" : "opacity-50 pointer-events-none"}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {f.label}
            </label>
            <div className="relative">
              <input
                type={f.secret && !showSecrets ? "password" : "text"}
                {...form.register(f.key)}
                placeholder={f.placeholder}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              />
              {f.secret && (
                <button
                  type="button"
                  onClick={() => setShowSecrets((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              )}
            </div>
            {form.formState.errors[f.key] && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                {String(form.formState.errors[f.key]?.message)}
              </p>
            )}
          </div>
        ))}

        <div className="flex items-center gap-3 pt-3 border-t border-gray-100 dark:border-zinc-800">
          <Button type="submit" disabled={isSaving} className="flex-1 sm:flex-none">
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Save
          </Button>
          <Button type="button" variant="secondary" onClick={handleTest} disabled={isTesting || !enabled}>
            {isTesting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Send Test
          </Button>
        </div>
      </form>
    </div>
  );
}

// ── Notification Types Info ──

function NotificationTypesInfo() {
  const types = [
    { label: "Daily Reviewer Digest", desc: "New application updates sent to reviewers" },
    { label: "Daily/Weekly Milestone Digest", desc: "Milestone completions sent to reviewers" },
    { label: "Admin Weekly Digest", desc: "Weekly summary sent to community admins" },
    { label: "Milestone Verification", desc: "Finance team notified of verified milestones" },
    { label: "Post-Approval Form", desc: "Finance/Admin notified of submissions" },
    { label: "Invoice Received", desc: "Finance team notified of new invoices" },
    { label: "KYC Status Change", desc: "Admin/Finance BCC'd on KYC updates" },
  ];
  const unaffected = ["Reviewer invitations", "Comment @mentions", "All applicant & grantee emails"];

  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <Info className="w-5 h-5 text-blue-500 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Notification Types</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Routed through the channels configured above
            </p>
          </div>
        </div>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-zinc-800">
        {types.map((t) => (
          <div key={t.label} className="px-6 py-3 flex items-start gap-3">
            <Bell className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{t.label}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="px-6 py-4 bg-gray-50 dark:bg-zinc-800/50 border-t border-gray-100 dark:border-zinc-800">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <span className="font-semibold text-gray-700 dark:text-gray-300">Not affected: </span>
          {unaffected.join(" · ")}
        </p>
      </div>
    </div>
  );
}

// ── Main Page ──

interface NotificationSettingsPageProps {
  community: Community;
}

export function NotificationSettingsPage({ community }: NotificationSettingsPageProps) {
  const communitySlug = community.details?.slug || community.uid;
  const { hasAccess, isLoading: loadingAdmin } = useCommunityAdminAccess(community.uid);
  const { data: config, isLoading, error } = useCommunityConfig(communitySlug);
  const { mutate: saveConfig, isPending: isSavingKillSwitch } = useCommunityConfigMutation();

  if (loadingAdmin || isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex w-full items-center justify-center h-96">
        <p className="text-lg">{MESSAGES.ADMIN.NOT_AUTHORIZED(community.uid)}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <p className="text-red-600 dark:text-red-400">
          Failed to load notification configuration. Please try again.
        </p>
      </div>
    );
  }

  const handleKillSwitch = (value: boolean) => {
    saveConfig(
      { slug: communitySlug, config: { disableReviewerEmails: value } },
      {
        onSuccess: () => toast.success(value ? "Reviewer emails disabled" : "Reviewer emails enabled"),
        onError: (err) => toast.error(err.message || "Failed to update"),
      }
    );
  };

  const telegramEnabled = config?.telegramEnabled ?? false;
  const slackEnabled = config?.slackEnabled ?? false;

  return (
    <div className="space-y-8">
      {/* Page header — full width */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Bell className="w-7 h-7 text-blue-500 dark:text-blue-400" />
          Notification Settings
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400 max-w-3xl">
          Configure how{" "}
          <span className="font-medium text-gray-900 dark:text-white">
            {community.details?.name || "this community"}
          </span>{" "}
          receives reviewer, admin, and finance notifications. Settings apply community-wide unless overridden at the program level.
        </p>
      </div>

      {/* Two-column grid on lg, stacked on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column: provider cards */}
        <div className="space-y-6">
          <ProviderConfigCard
            title="Telegram"
            description="Send to a Telegram group or channel via bot"
            providerType="TELEGRAM"
            communitySlug={communitySlug}
            isEnabled={telegramEnabled}
            fields={[
              { key: "botToken", label: "Bot Token", placeholder: "123456789:ABCdefGHIjklMNOpqrsTUVwxyz", secret: true, value: config?.telegramBotToken ?? "" },
              { key: "chatId", label: "Chat ID", placeholder: "-1001234567890", value: config?.telegramChatId ?? "" },
            ]}
          />

          <ProviderConfigCard
            title="Slack"
            description="Send to a Slack channel via incoming webhook"
            providerType="SLACK"
            communitySlug={communitySlug}
            isEnabled={slackEnabled}
            fields={[
              { key: "webhookUrl", label: "Webhook URL", placeholder: "https://hooks.slack.com/services/T.../B.../...", type: "url", value: config?.slackWebhookUrl ?? "" },
            ]}
          />
        </div>

        {/* Right column: kill switch + types info */}
        <div className="space-y-6">
          <KillSwitchCard
            disabled={config?.disableReviewerEmails ?? false}
            onToggle={handleKillSwitch}
            isSaving={isSavingKillSwitch}
          />

          <NotificationTypesInfo />
        </div>
      </div>
    </div>
  );
}
