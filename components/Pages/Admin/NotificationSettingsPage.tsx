"use client";

import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Bell, Send, Loader2, AlertTriangle, Info } from "lucide-react";
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

// ── Types ──

type NotificationProviderType = "TELEGRAM" | "SLACK";

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
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-zinc-700 flex items-center gap-3">
        <div className="w-8 h-8 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Disable Reviewer, Admin & Finance Emails
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Kill switch — silences all reviewer, admin, and finance email notifications
          </p>
        </div>
        <span
          className={`ml-auto text-xs px-2 py-1 rounded-full ${
            disabled
              ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
              : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
          }`}
        >
          {disabled ? "Emails Disabled" : "Emails Active"}
        </span>
      </div>

      <div className="p-6">
        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
          <input
            type="checkbox"
            id="kill-switch"
            checked={disabled}
            onChange={(e) => onToggle(e.target.checked)}
            disabled={isSaving}
            className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
          />
          <label htmlFor="kill-switch" className="text-sm font-medium text-gray-900 dark:text-white">
            Disable all reviewer, admin, and finance email notifications for this community
          </label>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          When enabled, applicant and grantee emails are <strong>not</strong> affected. Reviewer invitations
          and comment @mentions are also unaffected. Configure external channels below to receive these
          notifications via Telegram or Slack instead.
        </p>
      </div>
    </div>
  );
}

// ── Provider Cards ──

function ProviderConfigCard({
  title,
  providerType,
  communitySlug,
  isEnabled,
  botToken,
  chatId,
  webhookUrl,
}: {
  title: string;
  providerType: NotificationProviderType;
  communitySlug: string;
  isEnabled: boolean;
  botToken?: string | null;
  chatId?: string | null;
  webhookUrl?: string | null;
}) {
  const { mutate: saveConfig, isPending: isSaving } = useCommunityConfigMutation();
  const { mutate: testConfig, isPending: isTesting } = useTestNotificationConfig(communitySlug);

  const isTelegram = providerType === "TELEGRAM";

  const form = useForm({
    resolver: zodResolver(
      isTelegram
        ? z.object({ botToken: z.string().min(1, "Required"), chatId: z.string().min(1, "Required"), isEnabled: z.boolean() })
        : z.object({ webhookUrl: z.string().url("Must be a valid URL"), isEnabled: z.boolean() })
    ),
    defaultValues: isTelegram
      ? { botToken: botToken ?? "", chatId: chatId ?? "", isEnabled }
      : { webhookUrl: webhookUrl ?? "", isEnabled },
  });

  const prevKey = useRef<string>("");
  const currentKey = `${botToken}-${chatId}-${webhookUrl}-${isEnabled}`;
  useEffect(() => {
    if (currentKey !== prevKey.current) {
      prevKey.current = currentKey;
      form.reset(
        isTelegram
          ? { botToken: botToken ?? "", chatId: chatId ?? "", isEnabled }
          : { webhookUrl: webhookUrl ?? "", isEnabled }
      );
    }
  }, [botToken, chatId, webhookUrl, isEnabled, form, isTelegram, currentKey]);

  const onSubmit = (data: any) => {
    const patch: Record<string, any> = { isEnabled: data.isEnabled };
    if (isTelegram) {
      patch.telegramBotToken = data.botToken || null;
      patch.telegramChatId = data.chatId || null;
      patch.telegramEnabled = data.isEnabled;
    } else {
      patch.slackWebhookUrl = data.webhookUrl || null;
      patch.slackEnabled = data.isEnabled;
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
        botToken: isTelegram ? values.botToken : null,
        chatId: isTelegram ? values.chatId : null,
        webhookUrl: !isTelegram ? values.webhookUrl : null,
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

  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-zinc-700 flex items-center gap-3">
        <div className={`w-8 h-8 ${isTelegram ? "bg-blue-100 dark:bg-blue-900" : "bg-purple-100 dark:bg-purple-900"} rounded-lg flex items-center justify-center`}>
          {isTelegram ? (
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="currentColor">
              <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.124 2.521a2.528 2.528 0 0 1 2.521-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.521 2.521h-2.521V8.834zm-1.27 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.124a2.528 2.528 0 0 1 2.523 2.521A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.521v-2.521h2.52zm0-1.27a2.527 2.527 0 0 1-2.52-2.523 2.527 2.527 0 0 1 2.52-2.52h6.315A2.528 2.528 0 0 1 24 15.165a2.528 2.528 0 0 1-2.521 2.523h-6.315z" />
            </svg>
          )}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {isTelegram ? "Send notifications to a Telegram chat via bot" : "Send notifications via Slack webhook"}
          </p>
        </div>
        {isEnabled && (
          <span className="ml-auto text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
            Active
          </span>
        )}
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-4">
        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
          <input
            type="checkbox"
            id={`${providerType}-enabled`}
            {...form.register("isEnabled")}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor={`${providerType}-enabled`} className="text-sm font-medium text-gray-900 dark:text-white">
            Enable {title} notifications
          </label>
        </div>

        {isTelegram ? (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bot Token</label>
              <input
                type="password"
                {...form.register("botToken")}
                placeholder="123456:ABC-DEF..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Chat ID</label>
              <input
                type="text"
                {...form.register("chatId")}
                placeholder="-1001234567890"
                className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
              />
            </div>
          </>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Webhook URL</label>
            <input
              type="url"
              {...form.register("webhookUrl")}
              placeholder="https://hooks.slack.com/services/T.../B.../..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
            />
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={isSaving} className="flex-1">
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Save
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleTest}
            disabled={isTesting}
          >
            {isTesting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Test
          </Button>
        </div>
      </form>
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

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Bell className="w-7 h-7" />
          Notification Settings
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Configure how {community.details?.name || "this community"} receives reviewer, admin, and finance
          notifications. These settings apply community-wide unless overridden at the program level.
        </p>
      </div>

      {/* What gets notified */}
      <div className="bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
          <Info className="w-4 h-4 text-blue-500" />
          Notifications affected by these settings
        </div>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
          <li>Daily Reviewer Digest — new application updates</li>
          <li>Daily/Weekly Milestone Reviewer Digest — milestone completions</li>
          <li>Admin Weekly Digest — weekly summary</li>
          <li>Milestone Verification → Finance contacts</li>
          <li>Post-Approval Form submission → Finance/Admin</li>
          <li>Invoice Received → Finance contacts</li>
          <li>KYC Status Change → Admin/Finance (BCC)</li>
        </ul>
        <p className="text-xs text-gray-500 dark:text-gray-500">
          <strong>Not affected:</strong> Reviewer invitations, comment @mentions, all applicant/grantee emails
        </p>
      </div>

      {/* Kill switch */}
      <KillSwitchCard
        disabled={config?.disableReviewerEmails ?? false}
        onToggle={handleKillSwitch}
        isSaving={isSavingKillSwitch}
      />

      {/* Telegram */}
      <ProviderConfigCard
        title="Telegram"
        providerType="TELEGRAM"
        communitySlug={communitySlug}
        isEnabled={config?.telegramEnabled ?? false}
        botToken={config?.telegramBotToken}
        chatId={config?.telegramChatId}
      />

      {/* Slack */}
      <ProviderConfigCard
        title="Slack"
        providerType="SLACK"
        communitySlug={communitySlug}
        isEnabled={config?.slackEnabled ?? false}
        webhookUrl={config?.slackWebhookUrl}
      />
    </div>
  );
}
