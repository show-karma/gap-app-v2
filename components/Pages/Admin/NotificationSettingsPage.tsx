"use client";

import { Check, HelpCircle, Info, Link2, Loader2, Plus, Send, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { DeleteDialog } from "@/components/DeleteDialog";
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
import { useSaveNotificationSettings } from "@/hooks/useSaveNotificationSettings";
import { useSlackInstallResultToast } from "@/hooks/useSlackInstallResultToast";
import type { Community } from "@/types/v2/community";
import { KARMA_TELEGRAM_BOT_HANDLE } from "@/utilities/enviromentVars";
import { MESSAGES } from "@/utilities/messages";
import { SlackOauthProviderCard } from "./SlackOauth/SlackOauthProviderCard";

// Modal-only — defer the bundle until the user opens it.
const TelegramPairChatModal = dynamic(
  () => import("./TelegramPairChatModal").then((m) => m.TelegramPairChatModal),
  { ssr: false }
);

const SECTION_OFFSET_CLASS = "scroll-mt-28";

// Stable shallow array equality for dirty-detection (Slack URLs).
function arraysEqual(a: ReadonlyArray<string>, b: ReadonlyArray<string>): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// Slack incoming webhooks always start with this prefix — Slack rejects
// POSTs to anything else, so the browser URL parser alone isn't enough.
const SLACK_WEBHOOK_PREFIX = "https://hooks.slack.com/";

// Synchronous client-side validator for Slack incoming webhook URLs. Returns
// null when valid or blank (blank rows are filtered at save time). The Save
// bar also blocks persistence when any row is invalid.
export function validateSlackWebhookUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return "Enter a valid URL.";
  }
  if (parsed.protocol !== "https:") {
    return "Webhook URL must use https.";
  }
  if (!trimmed.startsWith(SLACK_WEBHOOK_PREFIX)) {
    return "Slack webhook URLs must start with https://hooks.slack.com/.";
  }
  return null;
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
    event: "Milestone marked complete",
    recipient: "Milestone reviewers of the program",
    note: "Fires when a grantee marks a milestone complete.",
  },
  {
    event: "@-mention in any comment (Telegram)",
    recipient: "The mentioned user (any role)",
    note: "Fires regardless of commenter role; user must have a Telegram username on profile to be tagged. The matching email notification is gated by the kill switch (see email-only table).",
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
    event: "Weekly Milestone Reviewer Digest",
    recipient: "Milestone reviewers",
    note: "Weekly roll-up of milestone completions.",
  },
  {
    event: "Admin Weekly Digest",
    recipient: "Admins",
    note: "Weekly summary; not migrated to Telegram (deferred).",
  },
  {
    event: "Comment @-mention email",
    recipient: "The mentioned user",
    note: "Silenced by the kill switch; Telegram mention dispatch continues.",
  },
  {
    event: "Milestone Verification",
    recipient: "Finance",
    note: "Sent when a reviewer verifies a milestone.",
  },
  {
    event: "Post-approval form submitted",
    recipient: "Per-program admin/finance email list",
    note: "Configured in the form schema.",
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
  "The kill switch silences the four digest emails (daily reviewer, daily + weekly milestone reviewer, admin weekly) and the comment @-mention email. All other per-event emails (milestone verification, invoices, KYC, reviewer invitations) continue regardless, and Telegram/Slack dispatch is never silenced.",
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
  // Track the current URL hash so we can mark the active section with
  // aria-current + a visual cue. We intentionally keep this simple
  // (hash-only, no IntersectionObserver) to stay in scope; scroll-synced
  // highlighting can come as a follow-up if desired.
  const [activeHash, setActiveHash] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return window.location.hash.replace("#", "");
  });

  useEffect(() => {
    const onHashChange = () => setActiveHash(window.location.hash.replace("#", ""));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return (
    <nav
      aria-label="Notification settings sections"
      className="sticky top-0 z-20 -mx-2 mb-4 border-b border-stone-200 bg-white/90 px-2 py-2 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/85"
    >
      <ul className="flex flex-wrap gap-1">
        {SUBNAV_LINKS.map((link) => {
          const isActive = activeHash === link.id;
          return (
            <li key={link.id}>
              <a
                href={`#${link.id}`}
                aria-current={isActive ? "true" : undefined}
                className={`inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  isActive
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                    : "text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                {link.label}
              </a>
            </li>
          );
        })}
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
//
// Naming note: the prop is `silenced` (not `disabled`) so `aria-checked={silenced}`
// reads naturally for screen readers. When emails are SILENCED, the switch
// reads as "checked" — which matches the visual on-state of the toggle and
// the user's mental model (the kill switch is engaged). Previously named
// `disabled`, which was confusing because "disabled switch checked" sounds
// inverted to assistive tech users.

function KillSwitchCard({
  silenced,
  onToggle,
  isSaving,
}: {
  silenced: boolean;
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
            {
              "Silences the four digest emails (daily reviewer, daily + weekly milestone reviewer, admin weekly) and the comment @-mention email. Telegram, Slack, and all other per-event emails are unaffected."
            }
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={silenced}
          aria-label="Toggle email kill switch"
          onClick={() => onToggle(!silenced)}
          disabled={isSaving}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2 disabled:opacity-40 dark:focus:ring-offset-zinc-900 ${
            silenced ? "bg-red-500" : "bg-stone-300 dark:bg-zinc-700"
          }`}
        >
          <span
            className={`pointer-events-none mt-0.5 inline-block h-5 w-5 rounded-full bg-white shadow-sm transition duration-200 ${
              silenced ? "translate-x-[22px]" : "translate-x-[2px]"
            }`}
          />
        </button>
      </div>
      {silenced && (
        <div className="border-t border-red-100 bg-red-50 px-5 py-2.5 dark:border-red-900/30 dark:bg-red-900/10">
          <p className="text-xs text-red-600 dark:text-red-400">
            Daily Reviewer Digest, Daily Milestone Reviewer Digest, and Admin Weekly Digest are off.
            All other notifications continue.
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
  inputType = "text",
  validate,
  rowAriaLabel,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  disabled: boolean;
  placeholderFirst: string;
  placeholderRest: string;
  removeConfirmCopy: (value: string) => string;
  addLabel: string;
  /** HTML input type. Default "text". Slack passes "url" for native validation. */
  inputType?: "text" | "url";
  /** Synchronous validator. Return an error string to show inline, or null when valid.
   *  Empty values should return null — they're filtered at save time. */
  validate?: (value: string) => string | null;
  /** Builds the per-row accessible label (WCAG 2.2 SC 1.3.1 / 4.1.2). */
  rowAriaLabel: (index: number) => string;
}) {
  // Tracks which row's delete-confirmation dialog is open. -1 = none.
  const [confirmIndex, setConfirmIndex] = useState<number>(-1);

  // `async` is intentional — `DeleteDialog.deleteFunction` is typed as
  // `() => Promise<void>`, so returning a sync value trips TS.
  const handleConfirmDelete = async (idx: number) => {
    onChange(values.filter((_, i) => i !== idx));
    setConfirmIndex(-1);
  };

  return (
    <div className="space-y-2.5">
      {values.map((value, idx) => {
        // Pure index key — controlled inputs sync from `value` regardless of
        // key identity, so mixing the current value into the key would only
        // serve to unmount + remount the <input> on every keystroke and
        // destroy focus. Row reorderings aren't supported here, so index is
        // sufficient.
        const rowKey = String(idx);
        const isConfirmOpen = confirmIndex === idx;
        const validationError = validate ? validate(value) : null;
        const errorId = validationError ? `ids-editor-error-${idx}` : undefined;
        return (
          <div key={rowKey} className="flex items-start gap-2">
            <div className="flex-1 space-y-1">
              <input
                type={inputType}
                value={value}
                onChange={(e) => {
                  const next = [...values];
                  next[idx] = e.target.value;
                  onChange(next);
                }}
                disabled={disabled}
                placeholder={idx === 0 ? placeholderFirst : placeholderRest}
                aria-label={rowAriaLabel(idx)}
                aria-invalid={validationError ? true : undefined}
                aria-describedby={errorId}
                className="h-9 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm text-stone-900 placeholder-stone-400 transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/40 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-100 dark:placeholder-zinc-500"
              />
              {validationError ? (
                <p id={errorId} className="px-1 text-xs text-red-600 dark:text-red-400">
                  {validationError}
                </p>
              ) : null}
            </div>
            {values.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (value.trim()) {
                      setConfirmIndex(idx);
                    } else {
                      onChange(values.filter((_, i) => i !== idx));
                    }
                  }}
                  disabled={disabled}
                  aria-label={`Remove ${rowAriaLabel(idx)}`}
                  className="mt-1 rounded-md p-1.5 text-stone-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-40 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                {isConfirmOpen ? (
                  <DeleteDialog
                    title={removeConfirmCopy(value)}
                    deleteFunction={() => handleConfirmDelete(idx)}
                    isLoading={false}
                    buttonElement={null}
                    externalIsOpen={isConfirmOpen}
                    externalSetIsOpen={(open) => {
                      if (!open) setConfirmIndex(-1);
                    }}
                  />
                ) : null}
              </>
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

// ── Telegram chat editor (renders id + paired group name) ──

function ChatsEditor({
  chats,
  onChange,
  disabled,
}: {
  chats: TelegramChat[];
  onChange: (next: TelegramChat[]) => void;
  disabled: boolean;
}) {
  // Tracks which row's delete-confirmation dialog is open. -1 = none.
  const [confirmIndex, setConfirmIndex] = useState<number>(-1);

  // `async` is intentional — see IdsEditor. DeleteDialog expects Promise<void>.
  const handleConfirmDelete = async (idx: number) => {
    onChange(chats.filter((_, i) => i !== idx));
    setConfirmIndex(-1);
  };

  return (
    <div className="space-y-2.5">
      {chats.map((chat, idx) => {
        // Pure index key — see IdsEditor note. Mixing content into the key
        // unmounts the controlled <input> on every keystroke, destroying focus.
        const rowKey = String(idx);
        const label = chat.name || chat.id;
        const isConfirmOpen = confirmIndex === idx;
        return (
          <div key={rowKey} className="flex items-start gap-2">
            <div className="flex-1 space-y-1">
              <input
                type="text"
                value={chat.id}
                onChange={(e) => {
                  const next = [...chats];
                  next[idx] = { id: e.target.value, name: chat.name };
                  onChange(next);
                }}
                disabled={disabled}
                placeholder={idx === 0 ? "-1001234567890" : "Additional chat ID"}
                aria-label={`Telegram chat ID ${idx + 1}`}
                className="h-9 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm text-stone-900 placeholder-stone-400 transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/40 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-100 dark:placeholder-zinc-500"
              />
              {chat.name ? (
                <p className="px-1 text-xs text-stone-600 dark:text-zinc-400">
                  Paired to <span className="font-medium">{chat.name}</span>
                </p>
              ) : chat.id.trim() ? (
                <p className="px-1 text-xs italic text-stone-400 dark:text-zinc-500">
                  Name unknown — re-pair this chat to populate it
                </p>
              ) : null}
            </div>
            {chats.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (label.trim()) {
                      setConfirmIndex(idx);
                    } else {
                      onChange(chats.filter((_, i) => i !== idx));
                    }
                  }}
                  disabled={disabled}
                  aria-label={`Remove Telegram chat ID ${idx + 1}`}
                  className="mt-1 rounded-md p-1.5 text-stone-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-40 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                {isConfirmOpen ? (
                  <DeleteDialog
                    title={`Remove chat "${label}"?`}
                    deleteFunction={() => handleConfirmDelete(idx)}
                    isLoading={false}
                    buttonElement={null}
                    externalIsOpen={isConfirmOpen}
                    externalSetIsOpen={(open) => {
                      if (!open) setConfirmIndex(-1);
                    }}
                  />
                ) : null}
              </>
            )}
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => onChange([...chats, { id: "", name: "" }])}
        disabled={disabled}
        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 transition hover:text-blue-700 disabled:opacity-40 dark:text-blue-400"
      >
        <Plus className="h-3.5 w-3.5" />
        Add chat ID
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

// ── Provider Config Card ──
//
// Provider-specific props are discriminated by `providerType`. We split into
// two wrapper components (TelegramProviderCard / SlackProviderCard) that share
// the common chrome via ProviderCardChrome, so the discriminator narrows
// naturally inside each wrapper — no `as` casts needed.

interface CommonProviderProps {
  title: string;
  communitySlug: string;
  enabled: boolean;
  onEnabledChange: (next: boolean) => void;
}

interface TelegramProviderProps extends CommonProviderProps {
  providerType: "TELEGRAM";
  chats: TelegramChat[];
  onChatsChange: (next: TelegramChat[]) => void;
}

interface SlackProviderProps extends CommonProviderProps {
  providerType: "SLACK";
  webhookUrls: string[];
  onWebhookUrlsChange: (next: string[]) => void;
}

type ProviderProps = TelegramProviderProps | SlackProviderProps;

/**
 * Shared chrome: header (title + on/off toggle), collapsed-hint when off,
 * test button + footer. Body content is supplied via `children`.
 */
function ProviderCardChrome({
  title,
  subtitle,
  enabled,
  onEnabledChange,
  collapsedHint,
  testButtonLabel,
  isTesting,
  onTest,
  children,
}: {
  title: string;
  subtitle: string;
  enabled: boolean;
  onEnabledChange: (next: boolean) => void;
  collapsedHint: string;
  testButtonLabel: string;
  isTesting: boolean;
  onTest: () => void;
  children: React.ReactNode;
}) {
  const collapsed = !enabled;

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      {/* Header with toggle */}
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-stone-900 dark:text-zinc-100">{title}</p>
          <p className="mt-0.5 text-xs text-stone-500 dark:text-zinc-400">{subtitle}</p>
        </div>
        <label className="flex cursor-pointer items-center gap-2.5">
          <span className="text-xs font-medium text-stone-600 dark:text-zinc-400">
            {enabled ? "Enabled" : "Disabled"}
          </span>
          {/* role="switch" — brings this control to parity with KillSwitchCard so
              SRs announce "switch" instead of "checkbox" (WCAG 2.2 SC 4.1.2). */}
          <input
            type="checkbox"
            role="switch"
            aria-checked={enabled}
            aria-label={`Toggle ${title}`}
            checked={enabled}
            onChange={(e) => onEnabledChange(e.target.checked)}
            className="h-4 w-4 rounded border-stone-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-600"
          />
        </label>
      </div>

      {/* Body */}
      {collapsed ? (
        <div className="border-t border-stone-100 px-5 py-3 text-xs text-stone-500 dark:border-zinc-800 dark:text-zinc-500">
          {collapsedHint}
        </div>
      ) : (
        <div className="space-y-4 border-t border-stone-100 px-5 py-4 dark:border-zinc-800">
          {children}

          {/* Test button — icon-only inside the Button label, so we provide an
              explicit aria-label + InfoTooltip warning the user a real message
              is about to be sent (WCAG 2.2 SC 4.1.2). */}
          <div className="flex items-center gap-2 pt-1">
            <InfoTooltip
              side="top"
              triggerAsChild
              content={
                <p className="text-xs">
                  Sends a real test message to every configured destination on this channel.
                </p>
              }
            >
              <Button
                type="button"
                variant="secondary"
                onClick={onTest}
                disabled={isTesting}
                aria-label={testButtonLabel}
              >
                {isTesting ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                )}
                Test
              </Button>
            </InfoTooltip>
          </div>
        </div>
      )}
    </div>
  );
}

function TelegramProviderCard(props: TelegramProviderProps) {
  const { mutate: testConfig, isPending: isTesting } = useTestNotificationConfig(
    props.communitySlug
  );
  const [isPairModalOpen, setIsPairModalOpen] = useState(false);

  const handleTest = () => {
    const filteredIds = props.chats.map((c) => c.id).filter((id) => id.trim());
    testConfig(
      {
        providerType: "TELEGRAM",
        botToken: null,
        chatId: filteredIds[0] || null,
        chatIds: filteredIds.length > 0 ? filteredIds : undefined,
        webhookUrl: null,
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

  return (
    <ProviderCardChrome
      title={props.title}
      subtitle="Karma bot → group/channel"
      enabled={props.enabled}
      onEnabledChange={props.onEnabledChange}
      collapsedHint="Toggle on to configure chat IDs and pair a new group."
      testButtonLabel={`Send test notification to ${props.title}`}
      isTesting={isTesting}
      onTest={handleTest}
    >
      <KarmaBotSetupPanel />
      <div>
        <label className="mb-1.5 flex items-center text-xs font-medium text-stone-600 dark:text-zinc-400">
          Chat IDs
          <InfoTooltip
            side="right"
            triggerAsChild
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
                  Groups use negative IDs (e.g. <code>-100123...</code>). Pair multiple groups to
                  notify each of them.
                </p>
              </div>
            }
          >
            <button type="button" className="ml-1 text-stone-400 hover:text-blue-500">
              <HelpCircle className="h-3.5 w-3.5" />
            </button>
          </InfoTooltip>
        </label>
        <ChatsEditor chats={props.chats} onChange={props.onChatsChange} disabled={false} />
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
        onPaired={(chat) => {
          // Parent seeds tgChats from props ONCE (see NotificationSettingsPageContent)
          // and never re-syncs from the query cache, so the verify hook's cache
          // patch alone does not repopulate the Chat-IDs list. Push the paired
          // chat into local state here: drop blank sentinel rows, keep existing
          // entries, de-dupe by id.
          const withoutBlanks = props.chats.filter((c) => c.id.trim());
          const alreadyPresent = withoutBlanks.some((c) => c.id === chat.id);
          const next = alreadyPresent
            ? withoutBlanks.map((c) => (c.id === chat.id ? chat : c))
            : [...withoutBlanks, chat];
          props.onChatsChange(next);
        }}
      />
    </ProviderCardChrome>
  );
}

function SlackProviderCard(props: SlackProviderProps) {
  const { mutate: testConfig, isPending: isTesting } = useTestNotificationConfig(
    props.communitySlug
  );

  const handleTest = () => {
    const filteredUrls = props.webhookUrls.filter((u) => u.trim());
    testConfig(
      {
        providerType: "SLACK",
        botToken: null,
        chatId: null,
        webhookUrl: filteredUrls[0] || null,
        webhookUrls: filteredUrls.length > 0 ? filteredUrls : undefined,
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

  return (
    <ProviderCardChrome
      title={props.title}
      subtitle="Incoming webhook"
      enabled={props.enabled}
      onEnabledChange={props.onEnabledChange}
      collapsedHint="Toggle on to add webhook URLs."
      testButtonLabel={`Send test notification to ${props.title}`}
      isTesting={isTesting}
      onTest={handleTest}
    >
      <div>
        <label className="mb-1.5 flex items-center text-xs font-medium text-stone-600 dark:text-zinc-400">
          Webhook URLs
          <InfoTooltip
            side="right"
            triggerAsChild
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
          values={props.webhookUrls}
          onChange={props.onWebhookUrlsChange}
          disabled={false}
          placeholderFirst="https://hooks.slack.com/services/..."
          placeholderRest="Additional webhook URL"
          removeConfirmCopy={(v) => `Remove webhook "${v}"?`}
          addLabel="Add webhook URL"
          inputType="url"
          validate={validateSlackWebhookUrl}
          rowAriaLabel={(idx) => `Slack webhook URL ${idx + 1}`}
        />
      </div>
    </ProviderCardChrome>
  );
}

/**
 * Discriminator-based dispatcher. Each branch narrows `props` to its variant
 * naturally — no `as` casts required.
 */
function ProviderConfigCard(props: ProviderProps) {
  if (props.providerType === "TELEGRAM") {
    return <TelegramProviderCard {...props} />;
  }
  return <SlackProviderCard {...props} />;
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
  disabled = false,
  disabledReason,
}: {
  dirtyCount: number;
  onSave: () => void;
  isSaving: boolean;
  disabled?: boolean;
  disabledReason?: string;
}) {
  if (dirtyCount === 0) return null;
  const label = dirtyCount === 1 ? "1 change pending" : `${dirtyCount} changes pending`;
  return (
    <div className="sticky bottom-4 z-30 mt-6 flex justify-center">
      <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-2.5 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
          {label}
        </span>
        {disabled && disabledReason ? (
          // biome-ignore lint/a11y/useSemanticElements: inline error text next to Save — <output> doesn't fit this context
          <span className="text-xs text-red-600 dark:text-red-400" role="status">
            {disabledReason}
          </span>
        ) : null}
        <Button
          type="button"
          onClick={onSave}
          disabled={isSaving || disabled}
          aria-label="Save notification settings"
          aria-disabled={isSaving || disabled}
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
        telegramChats: config?.telegramChats ?? [],
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
    telegramChats: TelegramChat[];
    slackEnabled: boolean;
    slackWebhookUrls: string[];
  };
}) {
  const { mutate: saveConfig, isPending: isSavingKillSwitch } = useCommunityConfigMutation();

  // One-time initializers from props. We deliberately do NOT mirror prop
  // changes back into state via useEffect — that would clobber unsaved local
  // edits whenever an unrelated mutation invalidates the community-config
  // query. Baselines are reset explicitly after a successful global save.
  const [tgEnabled, setTgEnabled] = useState(initialChannels.telegramEnabled);
  const [tgChats, setTgChats] = useState<TelegramChat[]>(
    initialChannels.telegramChats.length > 0
      ? initialChannels.telegramChats
      : [{ id: "", name: "" }]
  );
  const [slackEnabled, setSlackEnabled] = useState(initialChannels.slackEnabled);
  const [slackUrls, setSlackUrls] = useState<string[]>(
    initialChannels.slackWebhookUrls.length > 0 ? initialChannels.slackWebhookUrls : [""]
  );

  // Baselines (server truth). Compared against current state for dirty-detect.
  const tgBaseline = useRef({
    enabled: initialChannels.telegramEnabled,
    chats: initialChannels.telegramChats,
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

  const tgFiltered = useMemo(() => tgChats.filter((c) => c.id.trim()), [tgChats]);
  const slackFiltered = useMemo(() => slackUrls.filter((u) => u.trim()), [slackUrls]);

  // Disable Save while any non-empty Slack webhook URL fails validation. Empty
  // rows are ignored — they get filtered at save time. Prevents persisting a
  // malformed URL that would fail silently on first send.
  const slackHasInvalidUrls = useMemo(
    () => slackUrls.some((u) => validateSlackWebhookUrl(u) !== null),
    [slackUrls]
  );

  const tgDirty =
    tgEnabled !== tgBaseline.current.enabled ||
    !telegramChatsEqual(tgFiltered, tgBaseline.current.chats);
  const slackDirty =
    slackEnabled !== slackBaseline.current.enabled ||
    !arraysEqual(slackFiltered, slackBaseline.current.urls);

  const { save, isSaving, dirtyCount } = useSaveNotificationSettings({
    slug: communitySlug,
    state: {
      telegram: { enabled: tgEnabled, chats: tgFiltered, dirty: tgDirty },
      slack: { enabled: slackEnabled, urls: slackFiltered, dirty: slackDirty },
    },
    baselines: { telegram: tgBaseline, slack: slackBaseline },
    setTgEnabled,
    setTgChats,
    setSlackEnabled,
    setSlackUrls,
  });

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

  // Slack OAuth callback redirects here on success/denial/failure with
  // ?slack_install=...&team=... — show the matching toast, invalidate
  // the workspace cache so the card immediately reflects the install,
  // and strip the params from the URL so refresh doesn't re-fire.
  useSlackInstallResultToast(communitySlug);

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
          silenced={disableReviewerEmails}
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
            chats={tgChats}
            onChatsChange={setTgChats}
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

        <SlackOauthProviderCard communitySlug={communitySlug} />
      </section>

      {/* Reference section */}
      <section id="reference" aria-labelledby="reference-heading" className={SECTION_OFFSET_CLASS}>
        <h2 id="reference-heading" className="sr-only">
          Reference
        </h2>
        <NotificationReferenceCard />
      </section>

      <StickySaveBar
        dirtyCount={dirtyCount}
        onSave={save}
        isSaving={isSaving}
        disabled={slackHasInvalidUrls}
        disabledReason={
          slackHasInvalidUrls ? "Fix invalid Slack webhook URLs before saving." : undefined
        }
      />
    </div>
  );
}
