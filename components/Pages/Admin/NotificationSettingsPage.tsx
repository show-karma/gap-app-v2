"use client";

import { Check, HelpCircle, Info, Link2, Loader2, Plus, Send, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/Utilities/Button";
import { InfoTooltip } from "@/components/Utilities/InfoTooltip";
import { Spinner } from "@/components/Utilities/Spinner";
import { useCommunityAdminAccess } from "@/hooks/communities/useCommunityAdminAccess";
import {
  type TelegramChat,
  useCommunityConfig,
  useCommunityConfigMutation,
} from "@/hooks/useCommunityConfig";
import { useTestNotificationConfig } from "@/hooks/useNotificationConfig";
import type { Community } from "@/types/v2/community";
import { envVars } from "@/utilities/enviromentVars";
import { MESSAGES } from "@/utilities/messages";
import { TelegramPairChatModal } from "./TelegramPairChatModal";

const KARMA_TELEGRAM_BOT_HANDLE = envVars.KARMA_TELEGRAM_BOT_HANDLE;

const SECTION_OFFSET_CLASS = "scroll-mt-28";

// Stable shallow array equality for dirty-detection (Slack URLs).
function arraysEqual(a: ReadonlyArray<string>, b: ReadonlyArray<string>): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// Deep equality for TelegramChat[]. We compare both id AND name because
// re-pairing can update the name while the id stays the same.
function telegramChatsEqual(
  a: ReadonlyArray<TelegramChat>,
  b: ReadonlyArray<TelegramChat>
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i].id !== b[i].id || a[i].name !== b[i].name) return false;
  }
  return true;
}

// ── Reference data: real-time vs email-only events (PRD §2 / §10) ──

interface ReferenceRow {
  event: string;
  recipient: string;
  note: string;
}

const REALTIME_EVENTS: ReadonlyArray<ReferenceRow> = [
  {
    event: "Comment posted on application",
    recipient: "Program reviewers + milestone reviewers (deduped)",
    note: "Skipped when commenter is staff/admin/reviewer; @-mentions still fire.",
  },
  {
    event: "Milestone marked complete (off-chain or on-chain)",
    recipient: "Milestone reviewers of the program",
    note: "Fires from both the in-app form and on-chain MILESTONE attestation.",
  },
  {
    event: "Post-approval form submitted (first time only)",
    recipient: "Program reviewers + milestone reviewers (deduped)",
    note: "Per-program admin/finance email list still receives a separate email.",
  },
  {
    event: "@-mention in any comment",
    recipient: "The mentioned user (any role)",
    note: "Fires regardless of commenter role; user must have a Telegram username on profile to be tagged.",
  },
];

const EMAIL_ONLY_EVENTS: ReadonlyArray<ReferenceRow> = [
  {
    event: "Daily Reviewer Digest",
    recipient: "Program reviewers",
    note: "Bundles comments, status changes, post-approval updates from the last 24h.",
  },
  {
    event: "Daily Milestone Reviewer Digest",
    recipient: "Milestone reviewers",
    note: "Bundles milestone completions from the last 24h.",
  },
  {
    event: "Admin Weekly Digest",
    recipient: "Admins",
    note: "Weekly summary; not migrated to Telegram (deferred).",
  },
  {
    event: "Milestone Verification",
    recipient: "Finance",
    note: "Sent when a reviewer verifies a milestone.",
  },
  {
    event: "Post-approval form submission",
    recipient: "Per-program admin/finance email list",
    note: "Configured in the form schema; runs in parallel with the new Telegram dispatch.",
  },
  {
    event: "Invoice received",
    recipient: "Finance",
    note: "Sent when a grantee submits an invoice.",
  },
  {
    event: "KYC status change",
    recipient: "Admins",
    note: "Sent on KYC state transitions.",
  },
  {
    event: "Reviewer invitations",
    recipient: "Invited reviewer",
    note: "Sent when a user is added as a milestone reviewer.",
  },
  {
    event: "Applicant / grantee emails",
    recipient: "Applicants & grantees",
    note: "Always on, never silenced by the kill switch.",
  },
];

const RULES_OF_THUMB: ReadonlyArray<string> = [
  "The email kill switch silences reviewer / admin / finance emails only. Telegram and Slack notifications continue.",
  "Real-time events do not replace the daily digests — both fire (intentional duplication).",
  "To be @-tagged in a Telegram group, a reviewer must have their Telegram username set on their Karma profile and be a member of the configured group.",
];

// ── Sticky subnav ──

interface SubnavLink {
  id: string;
  label: string;
}

const SUBNAV_LINKS: ReadonlyArray<SubnavLink> = [
  { id: "channels", label: "Channels" },
  { id: "reference", label: "Reference" },
];

function StickySubnav() {
  return (
    <nav
      aria-label="Notification settings sections"
      className="sticky top-0 z-20 -mx-2 mb-4 border-b border-stone-200 bg-white/90 px-2 py-2 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/85"
    >
      <ul className="flex flex-wrap gap-1">
        {SUBNAV_LINKS.map((link) => (
          <li key={link.id}>
            <a
              href={`#${link.id}`}
              className="inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// ── Reviewer banner ──

function ReviewerHeadsUpBanner() {
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start gap-2.5">
        <Info
          className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400"
          aria-hidden="true"
        />
        <div className="space-y-1 text-xs text-stone-700 dark:text-zinc-300">
          <p className="font-semibold text-stone-900 dark:text-zinc-100">
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
  );
}

// ── Kill switch ──

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
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-stone-900 dark:text-zinc-100">
            Email Kill Switch
          </p>
          <p className="mt-0.5 text-xs text-stone-500 dark:text-zinc-400">
            {disabled
              ? "Reviewer, admin & finance emails are silenced."
              : "Emails enabled. Silences reviewer, admin & finance emails when armed. Telegram / Slack are unaffected."}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={disabled}
          aria-label="Toggle email kill switch"
          onClick={() => onToggle(!disabled)}
          disabled={isSaving}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2 disabled:opacity-40 dark:focus:ring-offset-zinc-900 ${
            disabled ? "bg-red-500" : "bg-stone-300 dark:bg-zinc-700"
          }`}
        >
          <span
            className={`pointer-events-none mt-0.5 inline-block h-5 w-5 rounded-full bg-white shadow-sm transition duration-200 ${
              disabled ? "translate-x-[22px]" : "translate-x-[2px]"
            }`}
          />
        </button>
      </div>
      {disabled && (
        <div className="border-t border-red-100 bg-red-50 px-5 py-2.5 dark:border-red-900/30 dark:bg-red-900/10">
          <p className="text-xs text-red-600 dark:text-red-400">
            Reviewer, admin &amp; finance emails are off. Applicant / grantee emails and all
            real-time Telegram / Slack notifications continue to fire.
          </p>
        </div>
      )}
    </div>
  );
}

// ── ID / URL editor (shared by TG chat IDs and Slack webhooks) ──

function IdsEditor({
  values,
  onChange,
  disabled,
  placeholderFirst,
  placeholderRest,
  removeConfirmCopy,
  addLabel,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  disabled: boolean;
  placeholderFirst: string;
  placeholderRest: string;
  removeConfirmCopy: (value: string) => string;
  addLabel: string;
}) {
  return (
    <div className="space-y-2.5">
      {values.map((value, idx) => {
        // Stable-ish key: combines index + content. Pure index keys cause input
        // focus to jump on row removal; content alone collides during initial
        // empty-input state.
        const rowKey = `${idx}-${value || "blank"}`;
        return (
          <div key={rowKey} className="flex items-center gap-2">
            <input
              type="text"
              value={value}
              onChange={(e) => {
                const next = [...values];
                next[idx] = e.target.value;
                onChange(next);
              }}
              disabled={disabled}
              placeholder={idx === 0 ? placeholderFirst : placeholderRest}
              className="h-9 flex-1 rounded-lg border border-stone-200 bg-white px-3 text-sm text-stone-900 placeholder-stone-400 transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/40 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-100 dark:placeholder-zinc-500"
            />
            {values.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  if (value.trim() && !window.confirm(removeConfirmCopy(value))) return;
                  onChange(values.filter((_, i) => i !== idx));
                }}
                disabled={disabled}
                aria-label="Remove"
                className="rounded-md p-1.5 text-stone-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-40 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => onChange([...values, ""])}
        disabled={disabled}
        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 transition hover:text-blue-700 disabled:opacity-40 dark:text-blue-400"
      >
        <Plus className="h-3.5 w-3.5" />
        {addLabel}
      </button>
    </div>
  );
}

// ── Karma bot setup instructions (Telegram only) ──

function KarmaBotSetupPanel() {
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start gap-2.5">
        <Info
          className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400"
          aria-hidden="true"
        />
        <div className="space-y-2 text-xs text-stone-700 dark:text-zinc-300">
          <p className="font-semibold text-stone-900 dark:text-zinc-100">Set up Karma bot</p>
          <ol className="list-inside list-decimal space-y-1.5 marker:text-blue-600 dark:marker:text-blue-400">
            <li>
              Add{" "}
              <code className="rounded border border-stone-200 bg-white px-1 py-0.5 text-blue-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-blue-300">
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

// ── Provider Config Card (controlled — state lifted to parent) ──

interface TelegramProviderProps {
  providerType: "TELEGRAM";
  enabled: boolean;
  onEnabledChange: (next: boolean) => void;
  chatIds: string[];
  onChatIdsChange: (next: string[]) => void;
}

interface SlackProviderProps {
  providerType: "SLACK";
  enabled: boolean;
  onEnabledChange: (next: boolean) => void;
  webhookUrls: string[];
  onWebhookUrlsChange: (next: string[]) => void;
}

type ProviderProps = (TelegramProviderProps | SlackProviderProps) & {
  title: string;
  communitySlug: string;
};

function ProviderConfigCard(props: ProviderProps) {
  const { mutate: testConfig, isPending: isTesting } = useTestNotificationConfig(
    props.communitySlug
  );
  const isTelegram = props.providerType === "TELEGRAM";
  const [isPairModalOpen, setIsPairModalOpen] = useState(false);

  const ids = isTelegram ? props.chatIds : [];
  const urls = !isTelegram ? props.webhookUrls : [];

  const handleTest = () => {
    const filteredIds = isTelegram ? ids.filter((id) => id.trim()) : [];
    const filteredUrls = !isTelegram ? urls.filter((u) => u.trim()) : [];
    testConfig(
      {
        providerType: props.providerType,
        botToken: null,
        chatId: isTelegram ? filteredIds[0] || null : null,
        chatIds: isTelegram && filteredIds.length > 0 ? filteredIds : undefined,
        webhookUrl: !isTelegram ? filteredUrls[0] || null : null,
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

  const collapsed = !props.enabled;

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      {/* Header with toggle */}
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-stone-900 dark:text-zinc-100">{props.title}</p>
          <p className="mt-0.5 text-xs text-stone-500 dark:text-zinc-400">
            {isTelegram ? "Karma bot → group/channel" : "Incoming webhook"}
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-2.5">
          <span className="text-xs font-medium text-stone-600 dark:text-zinc-400">
            {props.enabled ? "Enabled" : "Disabled"}
          </span>
          <input
            type="checkbox"
            checked={props.enabled}
            onChange={(e) => props.onEnabledChange(e.target.checked)}
            className="h-4 w-4 rounded border-stone-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-600"
          />
        </label>
      </div>

      {/* Body — collapsed when disabled */}
      {collapsed ? (
        <div className="border-t border-stone-100 px-5 py-3 text-xs text-stone-500 dark:border-zinc-800 dark:text-zinc-500">
          {isTelegram
            ? "Toggle on to configure chat IDs and pair a new group."
            : "Toggle on to add webhook URLs."}
        </div>
      ) : (
        <div className="space-y-4 border-t border-stone-100 px-5 py-4 dark:border-zinc-800">
          {isTelegram ? (
            <>
              <KarmaBotSetupPanel />
              <div>
                <label className="mb-1.5 flex items-center text-xs font-medium text-stone-600 dark:text-zinc-400">
                  Chat IDs
                  <InfoTooltip
                    side="right"
                    content={
                      <div className="space-y-1.5 text-xs">
                        <p className="font-semibold">Pair a chat</p>
                        <ol className="list-inside list-decimal space-y-0.5 text-gray-400">
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
                    <button type="button" className="ml-1 text-stone-400 hover:text-blue-500">
                      <HelpCircle className="h-3.5 w-3.5" />
                    </button>
                  </InfoTooltip>
                </label>
                <IdsEditor
                  values={ids}
                  onChange={props.onChatIdsChange}
                  disabled={false}
                  placeholderFirst="-1001234567890"
                  placeholderRest="Additional chat ID"
                  removeConfirmCopy={(v) => `Remove chat ID "${v}"?`}
                  addLabel="Add chat ID"
                />
                <div className="mt-2.5">
                  <button
                    type="button"
                    onClick={() => setIsPairModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-blue-800 dark:hover:bg-blue-950/30 dark:hover:text-blue-300"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    Pair new chat
                  </button>
                </div>
              </div>
              <TelegramPairChatModal
                communitySlug={props.communitySlug}
                open={isPairModalOpen}
                onOpenChange={setIsPairModalOpen}
              />
            </>
          ) : (
            <div>
              <label className="mb-1.5 flex items-center text-xs font-medium text-stone-600 dark:text-zinc-400">
                Webhook URLs
                <InfoTooltip
                  side="right"
                  content={
                    <div className="space-y-1.5 text-xs">
                      <p className="font-semibold">Create a Webhook</p>
                      <ol className="list-inside list-decimal space-y-0.5 text-gray-400">
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
                  <button type="button" className="ml-1 text-stone-400 hover:text-blue-500">
                    <HelpCircle className="h-3.5 w-3.5" />
                  </button>
                </InfoTooltip>
              </label>
              <IdsEditor
                values={urls}
                onChange={(props as SlackProviderProps).onWebhookUrlsChange}
                disabled={false}
                placeholderFirst="https://hooks.slack.com/services/..."
                placeholderRest="Additional webhook URL"
                removeConfirmCopy={(v) => `Remove webhook "${v}"?`}
                addLabel="Add webhook URL"
              />
            </div>
          )}

          {/* Test button only — Save is now in the global sticky bar */}
          <div className="flex items-center gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={handleTest} disabled={isTesting}>
              {isTesting ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="mr-1.5 h-3.5 w-3.5" />
              )}
              Test
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Reference card (read-only "What triggers a notification") ──

function ReferenceTable({
  title,
  description,
  rows,
}: {
  title: string;
  description: string;
  rows: ReadonlyArray<ReferenceRow>;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-stone-900 dark:text-zinc-100">{title}</p>
      <p className="mt-0.5 text-xs text-stone-500 dark:text-zinc-400">{description}</p>
      <ul className="mt-3 divide-y divide-stone-100 rounded-lg border border-stone-200 dark:divide-zinc-800 dark:border-zinc-800">
        {rows.map((row) => (
          <li key={row.event} className="grid gap-1 px-4 py-3 sm:grid-cols-[1fr_1fr] sm:gap-4">
            <div>
              <p className="text-xs font-medium text-stone-900 dark:text-zinc-100">{row.event}</p>
              <p className="mt-0.5 text-xs text-stone-500 dark:text-zinc-400">{row.note}</p>
            </div>
            <p className="text-xs text-stone-700 dark:text-zinc-300 sm:text-right">
              {row.recipient}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NotificationReferenceCard() {
  return (
    <div className="space-y-6 overflow-hidden rounded-xl border border-stone-200 bg-white px-5 py-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div>
        <p className="text-base font-semibold text-stone-900 dark:text-zinc-100">
          What triggers a notification
        </p>
        <p className="mt-1 text-xs text-stone-500 dark:text-zinc-400">
          Read-only reference of every event Karma sends, who it goes to, and how it's delivered.
        </p>
      </div>

      <ReferenceTable
        title="Real-time (Telegram / Slack)"
        description="Sent to the configured group(s) the moment the event happens."
        rows={REALTIME_EVENTS}
      />

      <ReferenceTable
        title="Email only"
        description="Not routed through Telegram / Slack."
        rows={EMAIL_ONLY_EVENTS}
      />

      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900/40 dark:bg-blue-950/30">
        <p className="text-xs font-semibold text-blue-900 dark:text-blue-200">Rules of thumb</p>
        <ul className="mt-2 space-y-1.5">
          {RULES_OF_THUMB.map((rule) => (
            <li
              key={rule}
              className="text-xs leading-relaxed text-blue-900/90 dark:text-blue-100/90"
            >
              {rule}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── Sticky save bar ──

function StickySaveBar({
  dirtyCount,
  onSave,
  isSaving,
}: {
  dirtyCount: number;
  onSave: () => void;
  isSaving: boolean;
}) {
  if (dirtyCount === 0) return null;
  const label = dirtyCount === 1 ? "1 change pending" : `${dirtyCount} changes pending`;
  return (
    <div className="sticky bottom-4 z-30 mt-6 flex justify-center">
      <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-2.5 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
          {label}
        </span>
        <Button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          aria-label="Save notification settings"
        >
          {isSaving ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="mr-1.5 h-3.5 w-3.5" />
          )}
          Save
        </Button>
      </div>
    </div>
  );
}

// ── Main page ──

interface NotificationSettingsPageProps {
  community: Community;
}

export function NotificationSettingsPage({ community }: NotificationSettingsPageProps) {
  const communitySlug = community.details?.slug || community.uid;
  const { hasAccess, isLoading: loadingAdmin } = useCommunityAdminAccess(community.uid);
  const { data: config, isLoading, error } = useCommunityConfig(communitySlug);

  if (loadingAdmin || isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex h-96 w-full items-center justify-center">
        <p className="text-lg">{MESSAGES.ADMIN.NOT_AUTHORIZED(community.uid)}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
        <p className="text-red-600 dark:text-red-400">
          Failed to load notification configuration. Please try again.
        </p>
      </div>
    );
  }

  return (
    <NotificationSettingsPageContent
      community={community}
      communitySlug={communitySlug}
      disableReviewerEmails={config?.disableReviewerEmails ?? false}
      initialChannels={{
        telegramEnabled: config?.telegramEnabled ?? false,
        telegramChatIds: config?.telegramChatIds ?? [],
        slackEnabled: config?.slackEnabled ?? false,
        slackWebhookUrls: config?.slackWebhookUrls ?? [],
      }}
    />
  );
}

// Inner content split out so the lifted state initializes once with real
// values from the server. Critical: do NOT sync from props on subsequent
// re-renders — preserves the clobber-fix from commit a17bed6b.
function NotificationSettingsPageContent({
  community,
  communitySlug,
  disableReviewerEmails,
  initialChannels,
}: {
  community: Community;
  communitySlug: string;
  disableReviewerEmails: boolean;
  initialChannels: {
    telegramEnabled: boolean;
    telegramChatIds: string[];
    slackEnabled: boolean;
    slackWebhookUrls: string[];
  };
}) {
  const { mutate: saveConfig, isPending: isSavingKillSwitch } = useCommunityConfigMutation();
  const { mutate: savePersisted, isPending: isSavingPersisted } = useCommunityConfigMutation();

  // One-time initializers from props. We deliberately do NOT mirror prop
  // changes back into state via useEffect — that would clobber unsaved local
  // edits whenever an unrelated mutation invalidates the community-config
  // query. Baselines are reset explicitly after a successful global save.
  const [tgEnabled, setTgEnabled] = useState(initialChannels.telegramEnabled);
  const [tgChatIds, setTgChatIds] = useState<string[]>(
    initialChannels.telegramChatIds.length > 0 ? initialChannels.telegramChatIds : [""]
  );
  const [slackEnabled, setSlackEnabled] = useState(initialChannels.slackEnabled);
  const [slackUrls, setSlackUrls] = useState<string[]>(
    initialChannels.slackWebhookUrls.length > 0 ? initialChannels.slackWebhookUrls : [""]
  );

  // Baselines (server truth). Compared against current state for dirty-detect.
  const tgBaseline = useRef({
    enabled: initialChannels.telegramEnabled,
    chatIds: initialChannels.telegramChatIds,
  });
  const slackBaseline = useRef({
    enabled: initialChannels.slackEnabled,
    urls: initialChannels.slackWebhookUrls,
  });

  // Kill switch toggles immediately, doesn't participate in dirty bar.
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

  const tgFiltered = useMemo(() => tgChatIds.filter((id) => id.trim()), [tgChatIds]);
  const slackFiltered = useMemo(() => slackUrls.filter((u) => u.trim()), [slackUrls]);

  const tgDirty =
    tgEnabled !== tgBaseline.current.enabled ||
    !arraysEqual(tgFiltered, tgBaseline.current.chatIds);
  const slackDirty =
    slackEnabled !== slackBaseline.current.enabled ||
    !arraysEqual(slackFiltered, slackBaseline.current.urls);

  const dirtyCount = (tgDirty ? 1 : 0) + (slackDirty ? 1 : 0);

  // Warn before navigation when there are unsaved changes.
  useEffect(() => {
    if (dirtyCount === 0) return undefined;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirtyCount]);

  const [isGlobalSaving, setIsGlobalSaving] = useState(false);

  const handleGlobalSave = async () => {
    if (dirtyCount === 0) return;
    setIsGlobalSaving(true);
    const tasks: Promise<{ kind: "TELEGRAM" | "SLACK"; ok: boolean; error?: string }>[] = [];

    if (tgDirty) {
      tasks.push(
        new Promise((resolve) => {
          savePersisted(
            {
              slug: communitySlug,
              config: { telegramEnabled: tgEnabled, telegramChatIds: tgFiltered },
            },
            {
              onSuccess: () => resolve({ kind: "TELEGRAM", ok: true }),
              onError: (err) =>
                resolve({ kind: "TELEGRAM", ok: false, error: err.message || "Failed" }),
            }
          );
        })
      );
    }

    if (slackDirty) {
      tasks.push(
        new Promise((resolve) => {
          savePersisted(
            {
              slug: communitySlug,
              config: { slackEnabled, slackWebhookUrls: slackFiltered },
            },
            {
              onSuccess: () => resolve({ kind: "SLACK", ok: true }),
              onError: (err) =>
                resolve({ kind: "SLACK", ok: false, error: err.message || "Failed" }),
            }
          );
        })
      );
    }

    const results = await Promise.allSettled(tasks);

    let successCount = 0;
    const failures: string[] = [];
    for (const r of results) {
      if (r.status === "fulfilled") {
        if (r.value.ok) {
          successCount += 1;
          // Re-sync baselines + local state to the now-authoritative values
          if (r.value.kind === "TELEGRAM") {
            tgBaseline.current = { enabled: tgEnabled, chatIds: tgFiltered };
            setTgChatIds(tgFiltered.length > 0 ? tgFiltered : [""]);
          } else {
            slackBaseline.current = { enabled: slackEnabled, urls: slackFiltered };
            setSlackUrls(slackFiltered.length > 0 ? slackFiltered : [""]);
          }
        } else {
          failures.push(`${r.value.kind}: ${r.value.error || "Failed"}`);
        }
      } else {
        failures.push(r.reason?.message || "Unknown error");
      }
    }

    setIsGlobalSaving(false);

    if (successCount > 0 && failures.length === 0) {
      toast.success(
        successCount === 1 ? "Notification settings saved" : `${successCount} channels saved`
      );
    } else if (successCount > 0 && failures.length > 0) {
      toast.error(`Saved with errors: ${failures.join("; ")}`);
    } else {
      toast.error(`Save failed: ${failures.join("; ")}`);
    }
  };

  const isSaving = isSavingPersisted || isGlobalSaving;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-2">
        <h1 className="text-xl font-bold text-stone-900 dark:text-zinc-100">
          Notification Settings
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-zinc-400">
          Configure where {community.details?.name || "this community"} sends real-time Telegram /
          Slack notifications, and silence reviewer / admin / finance emails when needed. Applicant
          and grantee emails are always on.
        </p>
      </div>

      <ReviewerHeadsUpBanner />

      <StickySubnav />

      {/* Channels section */}
      <section
        id="channels"
        aria-labelledby="channels-heading"
        className={`space-y-4 ${SECTION_OFFSET_CLASS}`}
      >
        <h2 id="channels-heading" className="sr-only">
          Channels
        </h2>

        <KillSwitchCard
          disabled={disableReviewerEmails}
          onToggle={handleKillSwitch}
          isSaving={isSavingKillSwitch}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ProviderConfigCard
            providerType="TELEGRAM"
            title="Telegram"
            communitySlug={communitySlug}
            enabled={tgEnabled}
            onEnabledChange={setTgEnabled}
            chatIds={tgChatIds}
            onChatIdsChange={setTgChatIds}
          />
          <ProviderConfigCard
            providerType="SLACK"
            title="Slack"
            communitySlug={communitySlug}
            enabled={slackEnabled}
            onEnabledChange={setSlackEnabled}
            webhookUrls={slackUrls}
            onWebhookUrlsChange={setSlackUrls}
          />
        </div>
      </section>

      {/* Reference section */}
      <section id="reference" aria-labelledby="reference-heading" className={SECTION_OFFSET_CLASS}>
        <h2 id="reference-heading" className="sr-only">
          Reference
        </h2>
        <NotificationReferenceCard />
      </section>

      <StickySaveBar dirtyCount={dirtyCount} onSave={handleGlobalSave} isSaving={isSaving} />
    </div>
  );
}
