"use client";

import {
  AtSign,
  Bell,
  CheckCircle2,
  Hash,
  HelpCircle,
  Info,
  Link2,
  Loader2,
  MessageSquare,
  Plus,
  Send,
  Shield,
  Trash2,
  XCircle,
  Zap,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/Utilities/Button";
import { InfoTooltip } from "@/components/Utilities/InfoTooltip";
import { Spinner } from "@/components/Utilities/Spinner";
import { useCommunityAdminAccess } from "@/hooks/communities/useCommunityAdminAccess";
import { useCommunityConfig, useCommunityConfigMutation } from "@/hooks/useCommunityConfig";
import { useTestNotificationConfig } from "@/hooks/useNotificationConfig";
import type { Community } from "@/types/v2/community";
import { envVars } from "@/utilities/enviromentVars";
import { MESSAGES } from "@/utilities/messages";
import { TelegramPairChatModal } from "./TelegramPairChatModal";

const KARMA_TELEGRAM_BOT_HANDLE = envVars.KARMA_TELEGRAM_BOT_HANDLE;

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
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center ${
              disabled ? "bg-red-100 dark:bg-red-900/30" : "bg-gray-100 dark:bg-zinc-800"
            }`}
          >
            <Shield className={`w-4.5 h-4.5 ${disabled ? "text-red-500" : "text-gray-400"}`} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Email Kill Switch</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Silences reviewer, admin &amp; finance emails. Telegram / Slack are unaffected.
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
          <span
            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition duration-200 mt-0.5 ${
              disabled ? "translate-x-[22px]" : "translate-x-[2px]"
            }`}
          />
        </button>
      </div>
      {disabled && (
        <div className="px-5 py-2.5 bg-red-50 dark:bg-red-900/10 border-t border-red-100 dark:border-red-900/20">
          <p className="text-xs text-red-600 dark:text-red-400">
            Reviewer, admin &amp; finance emails are off. Applicant / grantee emails and all
            real-time Telegram / Slack notifications continue to fire.
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
      {chatIds.map((id, idx) => {
        // Stable-ish key: combines index and content. Pure index keys cause
        // input focus to jump on row removal; content alone collides on the
        // empty-input case during initial state.
        const rowKey = `${idx}-${id || "blank"}`;
        return (
          <div key={rowKey} className="flex items-center gap-2">
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
                onClick={() => {
                  if (id.trim() && !window.confirm(`Remove chat ID "${id}"?`)) return;
                  onChange(chatIds.filter((_, i) => i !== idx));
                }}
                disabled={disabled}
                className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition disabled:opacity-40"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        );
      })}
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

// ── Karma Bot Setup Instructions (Telegram only) ──

function KarmaBotSetupPanel() {
  return (
    <div className="rounded-lg border border-sky-200 dark:border-sky-900/40 bg-sky-50 dark:bg-sky-900/10 px-4 py-3">
      <div className="flex items-start gap-2.5">
        <Info className="w-4 h-4 text-sky-600 dark:text-sky-400 mt-0.5 shrink-0" />
        <div className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
          <p className="font-semibold text-gray-900 dark:text-white">Set up Karma bot</p>
          <ol className="list-decimal list-inside space-y-1.5 marker:text-sky-600 dark:marker:text-sky-400">
            <li>
              Add{" "}
              <code className="px-1 py-0.5 rounded bg-white dark:bg-zinc-800 border border-sky-200 dark:border-sky-900/40 text-sky-700 dark:text-sky-300">
                @{KARMA_TELEGRAM_BOT_HANDLE}
              </code>{" "}
              to your Telegram group or channel and grant it permission to post messages.
            </li>
            <li>
              Click <strong>Pair new chat</strong> below — Karma will walk you through connecting
              the group securely.
            </li>
            <li>
              Once verified, the chat ID is saved and Telegram notifications are enabled
              automatically.
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}

// ── Provider Config Card ──

function ProviderConfigCard({
  title,
  providerType,
  communitySlug,
  isEnabled,
  chatIds,
  webhookUrls,
}: {
  title: string;
  providerType: "TELEGRAM" | "SLACK";
  communitySlug: string;
  isEnabled: boolean;
  chatIds?: string[];
  webhookUrls?: string[];
}) {
  const { mutate: saveConfig, isPending: isSaving } = useCommunityConfigMutation();
  const { mutate: testConfig, isPending: isTesting } = useTestNotificationConfig(communitySlug);
  const isTelegram = providerType === "TELEGRAM";

  // One-time initializers from props. We deliberately do NOT mirror prop
  // changes back into state via useEffect — that would clobber unsaved local
  // edits whenever an unrelated mutation invalidates the community-config
  // query (e.g. saving the sibling Slack card while editing TG, or toggling
  // the kill switch). State is reset explicitly after a successful save.
  const [enabled, setEnabled] = useState(isEnabled);
  const [ids, setIds] = useState<string[]>(chatIds?.length ? chatIds : [""]);
  const [urls, setUrls] = useState<string[]>(webhookUrls?.length ? webhookUrls : [""]);
  const [isPairModalOpen, setIsPairModalOpen] = useState(false);

  const buildSavePayload = () => {
    if (isTelegram) {
      const filtered = ids.filter((id) => id.trim());
      return {
        config: { telegramEnabled: enabled, telegramChatIds: filtered },
        normalized: filtered,
      };
    }
    const filtered = urls.filter((u) => u.trim());
    return {
      config: { slackEnabled: enabled, slackWebhookUrls: filtered },
      normalized: filtered,
    };
  };

  const handleSave = () => {
    const { config: payload, normalized } = buildSavePayload();
    saveConfig(
      { slug: communitySlug, config: payload },
      {
        onSuccess: () => {
          toast.success(`${title} config saved`);
          // Re-sync local state to the now-authoritative server values so the
          // next refetch is a no-op and trim/dedup is reflected in the inputs.
          if (isTelegram) {
            setIds(normalized.length ? normalized : [""]);
          } else {
            setUrls(normalized.length ? normalized : [""]);
          }
        },
        onError: (e) => toast.error(e.message || "Failed"),
      }
    );
  };

  const handleTest = () => {
    const filteredIds = isTelegram ? ids.filter((id) => id.trim()) : [];
    const filteredUrls = isTelegram ? [] : urls.filter((u) => u.trim());
    testConfig(
      {
        providerType,
        botToken: null,
        chatId: isTelegram ? filteredIds[0] || null : null,
        chatIds: isTelegram && filteredIds.length > 0 ? filteredIds : undefined,
        webhookUrl: isTelegram ? null : filteredUrls[0] || null,
        webhookUrls: !isTelegram && filteredUrls.length > 0 ? filteredUrls : undefined,
      },
      {
        onSuccess: (r) =>
          r.success
            ? toast.success(r.message || "Test sent!")
            : toast.error(r.message || "Test failed"),
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
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center ${
              isTelegram ? "bg-sky-50 dark:bg-sky-900/20" : "bg-purple-50 dark:bg-purple-900/20"
            }`}
          >
            {isTelegram ? (
              <MessageSquare className="w-4.5 h-4.5 text-sky-500" />
            ) : (
              <Hash className="w-4.5 h-4.5 text-purple-500" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isTelegram ? "Karma bot → group/channel" : "Incoming webhook"}
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
              {/* Karma bot setup instructions */}
              <KarmaBotSetupPanel />

              {/* Chat IDs */}
              <div>
                <label className="flex items-center text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Chat IDs
                  <InfoTooltip
                    side="right"
                    content={
                      <div className="space-y-1.5 text-xs">
                        <p className="font-semibold">Pair a chat</p>
                        <ol className="list-decimal list-inside space-y-0.5 text-gray-400">
                          <li>
                            Add <strong>@{KARMA_TELEGRAM_BOT_HANDLE}</strong> to your target group
                          </li>
                          <li>
                            Click <strong>Pair new chat</strong> — Karma walks you through the rest
                          </li>
                          <li>The chat ID is added automatically once verified</li>
                        </ol>
                        <p className="text-gray-500">
                          Groups use negative IDs (e.g. <code>-100123...</code>). Pair multiple
                          groups to notify each of them.
                        </p>
                      </div>
                    }
                  >
                    <button type="button" className="ml-1 text-gray-400 hover:text-blue-500">
                      <HelpCircle className="w-3.5 h-3.5" />
                    </button>
                  </InfoTooltip>
                </label>
                <ChatIdsEditor chatIds={ids} onChange={setIds} disabled={disabled} />
                <div className="mt-2.5">
                  <button
                    type="button"
                    onClick={() => setIsPairModalOpen(true)}
                    disabled={disabled}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 dark:border-sky-900/50 bg-sky-50 dark:bg-sky-900/20 px-3 py-1.5 text-xs font-medium text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/40 transition disabled:opacity-40"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    Pair new chat
                  </button>
                </div>
              </div>
              <TelegramPairChatModal
                communitySlug={communitySlug}
                open={isPairModalOpen}
                onOpenChange={setIsPairModalOpen}
              />
            </>
          ) : (
            <div>
              <label className="flex items-center text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Webhook URLs
                <InfoTooltip
                  side="right"
                  content={
                    <div className="space-y-1.5 text-xs">
                      <p className="font-semibold">Create a Webhook</p>
                      <ol className="list-decimal list-inside space-y-0.5 text-gray-400">
                        <li>
                          Go to <strong>api.slack.com/messaging/webhooks</strong>
                        </li>
                        <li>
                          Create an <strong>Incoming Webhook</strong>
                        </li>
                        <li>Select the target channel</li>
                        <li>Copy the webhook URL</li>
                      </ol>
                      <p className="text-gray-500">Add multiple to notify several channels.</p>
                      <p className="text-gray-500 italic">
                        Slack messages currently list reviewer names as plain text. Real{" "}
                        <code>&lt;@user&gt;</code> Slack tagging is on the Phase&nbsp;2 roadmap.
                      </p>
                    </div>
                  }
                >
                  <button type="button" className="ml-1 text-gray-400 hover:text-blue-500">
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </InfoTooltip>
              </label>
              <ChatIdsEditor chatIds={urls} onChange={setUrls} disabled={disabled} />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <Button type="button" disabled={isSaving} onClick={handleSave}>
            {isSaving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
            Save
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleTest}
            disabled={isTesting || !enabled}
          >
            {isTesting ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5 mr-1.5" />
            )}
            Test
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Notification Types ──

const REALTIME_BULLETS: ReadonlyArray<{ key: string; text: ReactNode }> = [
  {
    key: "broadcast",
    text: (
      <>
        When a grantee or applicant comments on an application, all program reviewers and milestone
        reviewers are notified in your Telegram group.
      </>
    ),
  },
  {
    key: "skip-privileged",
    text: (
      <>
        Comments from admins or reviewers do <strong>not</strong> trigger broadcast notifications,
        but @-mentions still notify the tagged user.
      </>
    ),
  },
  {
    key: "milestone",
    text: (
      <>
        When a grantee marks a milestone complete, milestone reviewers are notified in your Telegram
        group.
      </>
    ),
  },
  {
    key: "post-approval",
    text: (
      <>
        When a grantee submits the post-approval form for the first time, all program reviewers and
        milestone reviewers are notified in your Telegram group. The per-program admin/finance email
        list still receives a separate email.
      </>
    ),
  },
  {
    key: "tagging",
    text: (
      <>
        Reviewers with a Telegram username on their profile are tagged with{" "}
        <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300">
          @username
        </code>
        . Others appear by name only.
      </>
    ),
  },
  {
    key: "kill-switch",
    text: (
      <>
        The &quot;Disable reviewer emails&quot; kill-switch above only blocks emails — Telegram and
        Slack notifications continue.
      </>
    ),
  },
];

const REALTIME_TYPES: ReadonlyArray<string> = [
  "Comment on an application (from a grantee or applicant) → reviewers",
  "Milestone marked complete (by a grantee) → milestone reviewers",
  "Post-approval form submitted (by a grantee) → reviewers",
  "@-mention in a comment → the tagged user",
];

const EMAIL_ONLY_TYPES: ReadonlyArray<string> = [
  "Daily Reviewer Digest",
  "Milestone Reviewer Digest",
  "Admin Weekly Digest",
  "Milestone Verification → Finance",
  "Post-Approval → per-program admin/finance email list",
  "Invoice Received → Finance",
  "KYC Status Change → Admin",
  "Reviewer invitations",
  "All applicant / grantee emails",
];

function NotificationTypesCard() {
  const realtimeTypes = REALTIME_TYPES;
  const emailOnly = EMAIL_ONLY_TYPES;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-zinc-800 flex items-center gap-3">
        <div className="w-9 h-9 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex items-center justify-center">
          <Zap className="w-4.5 h-4.5 text-amber-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            Routed through Telegram / Slack
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Real-time notifications sent to the configured group(s)
          </p>
        </div>
      </div>
      <div className="px-5 py-3">
        <ul className="space-y-1.5">
          {realtimeTypes.map((t) => (
            <li
              key={t}
              className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400"
            >
              <Bell className="w-3 h-3 text-sky-500 shrink-0" />
              {t}
            </li>
          ))}
        </ul>
      </div>

      {/* How it behaves */}
      <div className="px-5 py-4 border-t border-gray-100 dark:border-zinc-800">
        <div className="flex items-center gap-2 mb-2">
          <AtSign className="w-3.5 h-3.5 text-sky-500" />
          <p className="text-sm font-semibold text-gray-900 dark:text-white">How it behaves</p>
        </div>
        <ul className="space-y-1.5 list-disc list-inside marker:text-gray-300 dark:marker:text-zinc-600">
          {REALTIME_BULLETS.map((bullet) => (
            <li
              key={bullet.key}
              className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed"
            >
              {bullet.text}
            </li>
          ))}
        </ul>
      </div>

      {/* Email-only notifications */}
      <div className="px-5 py-4 border-t border-gray-100 dark:border-zinc-800">
        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
          Email only (not routed through Telegram / Slack)
        </p>
        <ul className="space-y-1.5">
          {emailOnly.map((t) => (
            <li
              key={t}
              className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500"
            >
              <Bell className="w-3 h-3 text-gray-300 dark:text-zinc-600 shrink-0" />
              {t}
            </li>
          ))}
        </ul>
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
        onSuccess: () =>
          toast.success(value ? "Reviewer emails disabled" : "Reviewer emails enabled"),
        onError: (err) => toast.error(err.message || "Failed to update"),
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-2">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Notification Settings</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Configure where {community.details?.name || "this community"} sends real-time Telegram /
          Slack notifications, and silence reviewer / admin / finance emails when needed. Applicant
          and grantee emails are always on.
        </p>
      </div>

      {/* Reviewer-side prerequisite reminder */}
      <div className="rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/10 px-4 py-3">
        <div className="flex items-start gap-2.5">
          <AtSign className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div className="space-y-1 text-xs text-gray-700 dark:text-gray-300">
            <p className="font-semibold text-gray-900 dark:text-white">
              Heads-up for your reviewers
            </p>
            <p>
              For Karma to <code>@</code>-tag a reviewer in your Telegram group, that reviewer must
              add their Telegram username (without the <code>@</code>) to their Karma user profile{" "}
              <strong>and</strong> be a member of the group. Reviewers without a username still see
              the message — they just appear by name instead of as a tag.
            </p>
          </div>
        </div>
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
          chatIds={config?.telegramChatIds}
        />

        <ProviderConfigCard
          title="Slack"
          providerType="SLACK"
          communitySlug={communitySlug}
          isEnabled={config?.slackEnabled ?? false}
          webhookUrls={config?.slackWebhookUrls}
        />
      </div>

      {/* Affected types */}
      <NotificationTypesCard />
    </div>
  );
}
