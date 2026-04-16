"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  Bell, Send, Loader2, Eye, EyeOff,
  CheckCircle2, XCircle, MessageSquare, Hash, Plus, Trash2,
  Zap, Shield, HelpCircle,
} from "lucide-react";
import { Button } from "@/components/Utilities/Button";
import { Spinner } from "@/components/Utilities/Spinner";
import { InfoTooltip } from "@/components/Utilities/InfoTooltip";
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
    <div className="rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
            disabled
              ? "bg-red-100 dark:bg-red-900/30"
              : "bg-gray-100 dark:bg-zinc-800"
          }`}>
            <Shield className={`w-4.5 h-4.5 ${
              disabled ? "text-red-500" : "text-gray-400"
            }`} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              Email Kill Switch
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Silence reviewer, admin &amp; finance emails
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={disabled}
          onClick={() => onToggle(!disabled)}
          disabled={isSaving}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 ${
            disabled ? "bg-red-500" : "bg-gray-300 dark:bg-zinc-600"
          }`}
        >
          <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition duration-200 mt-0.5 ${
            disabled ? "translate-x-[22px]" : "translate-x-[2px]"
          }`} />
        </button>
      </div>
      {disabled && (
        <div className="px-5 py-2.5 bg-red-50 dark:bg-red-900/10 border-t border-red-100 dark:border-red-900/20">
          <p className="text-xs text-red-600 dark:text-red-400">
            Reviewer, admin &amp; finance emails disabled. Applicant/grantee emails unaffected.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Chat IDs Editor ──

function ChatIdsEditor({
  chatIds,
  onChange,
  disabled,
}: {
  chatIds: string[];
  onChange: (ids: string[]) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-2.5">
      {chatIds.map((id, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <input
            type="text"
            value={id}
            onChange={(e) => {
              const next = [...chatIds];
              next[idx] = e.target.value;
              onChange(next);
            }}
            disabled={disabled}
            placeholder={idx === 0 ? "-1001234567890" : `Additional chat ID`}
            className="flex-1 h-9 px-3 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800/80 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition disabled:opacity-40"
          />
          {chatIds.length > 1 && (
            <button
              type="button"
              onClick={() => onChange(chatIds.filter((_, i) => i !== idx))}
              disabled={disabled}
              className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition disabled:opacity-40"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...chatIds, ""])}
        disabled={disabled}
        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 transition disabled:opacity-40"
      >
        <Plus className="w-3.5 h-3.5" />
        Add chat ID
      </button>
    </div>
  );
}

// ── Provider Config Card ──

function ProviderConfigCard({
  title,
  providerType,
  communitySlug,
  isEnabled,
  botToken,
  chatIds,
  webhookUrl,
}: {
  title: string;
  providerType: "TELEGRAM" | "SLACK";
  communitySlug: string;
  isEnabled: boolean;
  botToken?: string | null;
  chatIds?: string[];
  webhookUrl?: string | null;
}) {
  const { mutate: saveConfig, isPending: isSaving } = useCommunityConfigMutation();
  const { mutate: testConfig, isPending: isTesting } = useTestNotificationConfig(communitySlug);
  const [showToken, setShowToken] = useState(false);
  const isTelegram = providerType === "TELEGRAM";

  const [enabled, setEnabled] = useState(isEnabled);
  const [token, setToken] = useState(botToken ?? "");
  const [ids, setIds] = useState<string[]>(chatIds?.length ? chatIds : [""]);
  const [url, setUrl] = useState(webhookUrl ?? "");

  // Sync from props
  const prevKey = useRef("");
  const currentKey = `${isEnabled}-${botToken}-${JSON.stringify(chatIds)}-${webhookUrl}`;
  useEffect(() => {
    if (currentKey !== prevKey.current) {
      prevKey.current = currentKey;
      setEnabled(isEnabled);
      setToken(botToken ?? "");
      setIds(chatIds?.length ? chatIds : [""]);
      setUrl(webhookUrl ?? "");
    }
  }, [currentKey, isEnabled, botToken, chatIds, webhookUrl]);

  const handleSave = () => {
    if (isTelegram) {
      const filtered = ids.filter((id) => id.trim());
      saveConfig(
        { slug: communitySlug, config: { telegramEnabled: enabled, telegramBotToken: token || null, telegramChatIds: filtered } },
        { onSuccess: () => toast.success("Telegram config saved"), onError: (e) => toast.error(e.message || "Failed") }
      );
    } else {
      saveConfig(
        { slug: communitySlug, config: { slackEnabled: enabled, slackWebhookUrl: url || null } },
        { onSuccess: () => toast.success("Slack config saved"), onError: (e) => toast.error(e.message || "Failed") }
      );
    }
  };

  const handleTest = () => {
    const filtered = ids.filter((id) => id.trim());
    testConfig(
      {
        providerType,
        botToken: isTelegram ? token : null,
        chatId: isTelegram ? filtered[0] : null,
        chatIds: isTelegram ? filtered : undefined,
        webhookUrl: !isTelegram ? url : null,
      },
      {
        onSuccess: (r) => r.success ? toast.success(r.message || "Test sent!") : toast.error(r.message || "Test failed"),
        onError: (e) => toast.error(e.message || "Test failed"),
      }
    );
  };

  const disabled = !enabled;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
            isTelegram ? "bg-sky-50 dark:bg-sky-900/20" : "bg-purple-50 dark:bg-purple-900/20"
          }`}>
            {isTelegram
              ? <MessageSquare className="w-4.5 h-4.5 text-sky-500" />
              : <Hash className="w-4.5 h-4.5 text-purple-500" />
            }
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isTelegram ? "Bot → group/channel" : "Incoming webhook"}
            </p>
          </div>
        </div>
        {isEnabled ? (
          <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3 h-3" /> On
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-500">
            <XCircle className="w-3 h-3" /> Off
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-4">
        {/* Toggle */}
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Enabled</span>
        </label>

        {/* Fields */}
        <div className={disabled ? "opacity-40 pointer-events-none space-y-4" : "space-y-4"}>
          {isTelegram ? (
            <>
              {/* Bot Token */}
              <div>
                <label className="flex items-center text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Bot Token
                  <InfoTooltip
                    side="right"
                    content={
                      <div className="space-y-1.5 text-xs">
                        <p className="font-semibold">Get a Bot Token</p>
                        <ol className="list-decimal list-inside space-y-0.5 text-gray-400">
                          <li>Open Telegram, search <strong>@BotFather</strong></li>
                          <li>Send <code>/newbot</code>, follow the prompts</li>
                          <li>Copy the token (<code>123456:ABCdef...</code>)</li>
                        </ol>
                      </div>
                    }
                  >
                    <button type="button" className="ml-1 text-gray-400 hover:text-blue-500">
                      <HelpCircle className="w-3.5 h-3.5" />
                    </button>
                  </InfoTooltip>
                </label>
                <div className="relative">
                  <input
                    type={showToken ? "text" : "password"}
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="123456789:ABCdefGHI..."
                    className="w-full h-9 px-3 pr-9 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800/80 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Chat IDs */}
              <div>
                <label className="flex items-center text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Chat IDs
                  <InfoTooltip
                    side="right"
                    content={
                      <div className="space-y-1.5 text-xs">
                        <p className="font-semibold">Get Chat IDs</p>
                        <ol className="list-decimal list-inside space-y-0.5 text-gray-400">
                          <li>Add your bot to the target group</li>
                          <li>Send or forward any message</li>
                          <li>Visit <code className="break-all">api.telegram.org/bot{'{TOKEN}'}/getUpdates</code></li>
                          <li>Copy <code>chat.id</code> from the JSON</li>
                        </ol>
                        <p className="text-gray-500">Groups use negative IDs (e.g. <code>-100123...</code>). Add multiple to send to several groups.</p>
                      </div>
                    }
                  >
                    <button type="button" className="ml-1 text-gray-400 hover:text-blue-500">
                      <HelpCircle className="w-3.5 h-3.5" />
                    </button>
                  </InfoTooltip>
                </label>
                <ChatIdsEditor chatIds={ids} onChange={setIds} disabled={disabled} />
              </div>
            </>
          ) : (
            <div>
              <label className="flex items-center text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Webhook URL
                <InfoTooltip
                  side="right"
                  content={
                    <div className="space-y-1.5 text-xs">
                      <p className="font-semibold">Create a Webhook</p>
                      <ol className="list-decimal list-inside space-y-0.5 text-gray-400">
                        <li>Go to <strong>api.slack.com/messaging/webhooks</strong></li>
                        <li>Create an <strong>Incoming Webhook</strong></li>
                        <li>Select the target channel</li>
                        <li>Copy the webhook URL</li>
                      </ol>
                    </div>
                  }
                >
                  <button type="button" className="ml-1 text-gray-400 hover:text-blue-500">
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </InfoTooltip>
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/T.../B.../..."
                className="w-full h-9 px-3 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800/80 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition"
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <Button type="button" disabled={isSaving} onClick={handleSave}>
            {isSaving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
            Save
          </Button>
          <Button type="button" variant="secondary" onClick={handleTest} disabled={isTesting || !enabled}>
            {isTesting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
            Test
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Notification Types ──

function NotificationTypesCard() {
  const types = [
    "Daily Reviewer Digest",
    "Milestone Reviewer Digest",
    "Admin Weekly Digest",
    "Milestone Verification → Finance",
    "Post-Approval → Finance/Admin",
    "Invoice Received → Finance",
    "KYC Status Change → Admin",
  ];

  return (
    <div className="rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-zinc-800 flex items-center gap-3">
        <div className="w-9 h-9 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex items-center justify-center">
          <Zap className="w-4.5 h-4.5 text-amber-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Affected Notifications</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Routed through Telegram / Slack</p>
        </div>
      </div>
      <div className="px-5 py-3">
        <ul className="space-y-1.5">
          {types.map((t) => (
            <li key={t} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <Bell className="w-3 h-3 text-gray-400 shrink-0" />
              {t}
            </li>
          ))}
        </ul>
      </div>
      <div className="px-5 py-2.5 bg-gray-50 dark:bg-zinc-800/50 border-t border-gray-100 dark:border-zinc-800">
        <p className="text-xs text-gray-500 dark:text-gray-500">
          <strong>Not affected:</strong> Reviewer invitations · Comment @mentions · All applicant emails
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-2">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Notification Settings
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Configure how {community.details?.name || "this community"} receives reviewer, admin, and finance notifications.
        </p>
      </div>

      {/* Kill switch — full width */}
      <KillSwitchCard
        disabled={config?.disableReviewerEmails ?? false}
        onToggle={handleKillSwitch}
        isSaving={isSavingKillSwitch}
      />

      {/* Provider cards — two columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ProviderConfigCard
          title="Telegram"
          providerType="TELEGRAM"
          communitySlug={communitySlug}
          isEnabled={config?.telegramEnabled ?? false}
          botToken={config?.telegramBotToken}
          chatIds={config?.telegramChatIds}
        />

        <ProviderConfigCard
          title="Slack"
          providerType="SLACK"
          communitySlug={communitySlug}
          isEnabled={config?.slackEnabled ?? false}
          webhookUrl={config?.slackWebhookUrl}
        />
      </div>

      {/* Affected types */}
      <NotificationTypesCard />
    </div>
  );
}
