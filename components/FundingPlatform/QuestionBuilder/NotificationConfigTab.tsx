"use client";

import { Send, Loader2, ArrowDownIcon } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/Utilities/Button";
import {
  useCommunityConfig,
  useCommunityConfigMutation,
} from "@/hooks/useCommunityConfig";
import { useTestNotificationConfig } from "@/hooks/useNotificationConfig";

interface NotificationConfigTabProps {
  communityId: string;
  programId: string;
  readOnly?: boolean;
}

export function NotificationConfigTab({
  communityId,
  programId,
  readOnly = false,
}: NotificationConfigTabProps) {
  const { data: config, isLoading, error } = useCommunityConfig(communityId);
  const { mutate: saveConfig, isPending: isSaving } = useCommunityConfigMutation();
  const { mutate: testConfig, isPending: isTesting } = useTestNotificationConfig(communityId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <p className="text-sm text-red-600 dark:text-red-400">
          Failed to load notification settings.
        </p>
      </div>
    );
  }

  const handleTest = (providerType: "TELEGRAM" | "SLACK") => {
    if (providerType === "TELEGRAM") {
      testConfig(
        {
          providerType: "TELEGRAM",
          botToken: config?.telegramBotToken,
          chatId: config?.telegramChatIds?.[0],
        },
        {
          onSuccess: (result) => {
            if (result.success) toast.success("Test notification sent!");
            else toast.error(result.message || "Test failed");
          },
          onError: (err: Error) => toast.error(err.message || "Test failed"),
        }
      );
    } else {
      testConfig(
        {
          providerType: "SLACK",
          webhookUrl: config?.slackWebhookUrl,
        },
        {
          onSuccess: (result) => {
            if (result.success) toast.success("Test notification sent!");
            else toast.error(result.message || "Test failed");
          },
          onError: (err: Error) => toast.error(err.message || "Test failed"),
        }
      );
    }
  };

  const telegramActive = config?.telegramEnabled && !!config?.telegramBotToken && (config?.telegramChatIds?.length ?? 0) > 0;
  const slackActive = config?.slackEnabled && !!config?.slackWebhookUrl;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          Notification Settings
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          These settings are configured at the community level. Program-level overrides are coming soon.
        </p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-center gap-2">
        <ArrowDownIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
        <p className="text-xs text-blue-700 dark:text-blue-300">
          <strong>Inherited from community.</strong> To change these settings, go to{" "}
          <span className="font-medium">Community → Settings → Notifications</span>.
        </p>
      </div>

      {/* Status cards */}
      <div className="space-y-3">
        {/* Telegram status */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs font-bold">
              T
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Telegram</p>
              <p className="text-xs text-gray-500">
                {telegramActive ? "Configured" : "Not configured"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {telegramActive && (
              <span className="text-xs bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full">
                Active
              </span>
            )}
            {!readOnly && telegramActive && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleTest("TELEGRAM")}
                disabled={isTesting}
                className="text-xs px-2 py-1"
              >
                {isTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              </Button>
            )}
          </div>
        </div>

        {/* Slack status */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900 rounded flex items-center justify-center text-purple-600 dark:text-purple-400 text-xs font-bold">
              S
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Slack</p>
              <p className="text-xs text-gray-500">
                {slackActive ? "Configured" : "Not configured"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {slackActive && (
              <span className="text-xs bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full">
                Active
              </span>
            )}
            {!readOnly && slackActive && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleTest("SLACK")}
                disabled={isTesting}
                className="text-xs px-2 py-1"
              >
                {isTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              </Button>
            )}
          </div>
        </div>

        {/* Kill switch status */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-red-100 dark:bg-red-900 rounded flex items-center justify-center text-red-600 dark:text-red-400 text-xs">
              ✕
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Email Kill Switch</p>
              <p className="text-xs text-gray-500">
                {config?.disableReviewerEmails ? "Reviewer/admin/finance emails are disabled" : "All emails active"}
              </p>
            </div>
          </div>
          {config?.disableReviewerEmails && (
            <span className="text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">
              Disabled
            </span>
          )}
        </div>
      </div>

      {/* What data goes through these channels */}
      <div className="bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Data sent via these channels</h3>
        <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1 list-disc list-inside">
          <li>Daily Reviewer Digest — new application updates</li>
          <li>Daily/Weekly Milestone Reviewer Digest</li>
          <li>Admin Weekly Digest</li>
          <li>Milestone Verification → Finance</li>
          <li>Post-Approval Form → Finance/Admin</li>
          <li>Invoice Received → Finance</li>
          <li>KYC Status Change → Admin/Finance</li>
        </ul>
      </div>
    </div>
  );
}
