"use client";

import { AlertCircle, Copy, ExternalLink, Loader2, MessageSquare, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/Utilities/Button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import {
  TelegramPairingError,
  useStartTelegramPairing,
  useVerifyTelegramPairing,
} from "@/hooks/useTelegramPairing";
import { KARMA_TELEGRAM_BOT_HANDLE } from "@/utilities/enviromentVars";

interface TelegramPairChatModalProps {
  communitySlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Fires on successful pair (both newly-paired and already-paired). The
  // parent's local `tgChats` state is seeded once from server data and never
  // re-synced from props (see NotificationSettingsPage.tsx:1074-1078 — sync
  // would clobber unsaved edits). Without this callback the provider card's
  // Chat-IDs list stays empty until the page is remounted.
  onPaired?: (chat: { id: string; name: string }) => void;
}

// Poll every 3s. The backend rate-limits verify at 10/min per community
// (service constant), so 20 polls/min would trip it. 3s → 20 attempts over
// the full 2-min TTL, well under the cap. Quick enough that pairing feels
// instant once the grantee sends the slash command.
const POLL_INTERVAL_MS = 3_000;

const formatCountdown = (msRemaining: number): string => {
  const total = Math.max(0, Math.floor(msRemaining / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

/**
 * Translate a verify-error into a user-facing banner. 422 (pending — bot
 * hasn't claimed yet) is filtered out BEFORE this — it fires every poll
 * tick until pairing completes and is not a real error.
 */
const resolveFatalErrorMessage = (error: Error | null): string | null => {
  if (!error) return null;
  if (error instanceof TelegramPairingError) {
    if (error.status === 404) {
      return "Token expired. Generate a new one and try again.";
    }
    if (error.status === 403) {
      return "This token doesn't belong to the current community.";
    }
    if (error.status === 503) {
      return "Telegram integration is not configured yet. Contact support.";
    }
  }
  return error.message || "Verification failed. Please try again.";
};

export function TelegramPairChatModal({
  communitySlug,
  open,
  onOpenChange,
  onPaired,
}: TelegramPairChatModalProps) {
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  // Terminal state — set when the bot claims (success) or when polling hits
  // a non-retryable error. Stops the polling loop.
  const [pollingHalted, setPollingHalted] = useState(false);

  const [, copy] = useCopyToClipboard();

  const startPairing = useStartTelegramPairing(communitySlug);
  const verifyPairing = useVerifyTelegramPairing(communitySlug);

  const startMutate = startPairing.mutate;
  const startReset = startPairing.reset;
  const verifyMutate = verifyPairing.mutate;
  const verifyReset = verifyPairing.reset;

  // Per-open session id. Incremented every time the modal opens. Async
  // callbacks compare the captured id at fire-time against the current ref —
  // late responses from a previous session are silently dropped. Lighter
  // than an AbortController (which fetchData doesn't currently surface).
  const sessionIdRef = useRef(0);

  const handleStart = useCallback(() => {
    const sessionId = sessionIdRef.current;
    startMutate(undefined, {
      onSuccess: (data) => {
        if (sessionId !== sessionIdRef.current) return;
        setToken(data.token);
        setExpiresAt(data.expiresAt);
      },
      onError: (err) => {
        if (sessionId !== sessionIdRef.current) return;
        toast.error(err.message || "Could not generate pairing token");
      },
    });
  }, [startMutate]);

  // Kick off a fresh token when the modal opens
  useEffect(() => {
    if (!open) return;
    sessionIdRef.current += 1;
    setToken(null);
    setExpiresAt(null);
    setPollingHalted(false);
    verifyReset();
    startReset();
    handleStart();
  }, [open, handleStart, startReset, verifyReset]);

  // Countdown tick — only while modal is open and token is live
  useEffect(() => {
    if (!open || !expiresAt) return;
    setNow(Date.now());
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [open, expiresAt]);

  const expiresAtMs = useMemo(() => (expiresAt ? new Date(expiresAt).getTime() : 0), [expiresAt]);
  const msRemaining = Math.max(0, expiresAtMs - now);
  const isExpired = Boolean(expiresAt) && msRemaining === 0;
  const isLowTime = !isExpired && msRemaining > 0 && msRemaining < 30_000;

  // One-tap "add bot" deep link. Opens Telegram's group picker pre-scoped to
  // the Karma bot so the admin doesn't have to search for its username. The
  // token rides along as the `startgroup` payload — Telegram surfaces it back
  // to the bot on some clients, but we do NOT rely on that (payload delivery
  // isn't consistent across clients). The grantee still sends
  // `/karma-pair <token>` in the group to complete the flow.
  const addBotDeepLink = useMemo(() => {
    if (!token) return null;
    return `https://t.me/${KARMA_TELEGRAM_BOT_HANDLE}?startgroup=${encodeURIComponent(token)}`;
  }, [token]);

  // The exact command the grantee should paste in the group. Shown verbatim
  // in the copy box so they can paste without modification.
  const slashCommand = useMemo(() => (token ? `/karma-pair ${token}` : null), [token]);

  const handleCopy = useCallback(() => {
    if (!slashCommand) return;
    copy(slashCommand, "Command copied to clipboard");
  }, [copy, slashCommand]);

  // Polling loop: once a token is live, ask the backend "has the bot
  // claimed this yet?" on an interval. On 200 → close modal + toast. On
  // 422 (pending) → keep polling silently. On 404/403/503 → halt polling
  // and surface as an inline error. Re-fires on token change / re-open.
  useEffect(() => {
    if (!open || !token || isExpired || pollingHalted) return;

    const sessionId = sessionIdRef.current;
    const pollOnce = () => {
      verifyMutate(
        { token },
        {
          onSuccess: (data) => {
            if (sessionId !== sessionIdRef.current) return;
            setPollingHalted(true);
            const label = data.chatTitle || "chat";
            if (data.alreadyPaired) {
              toast.success(`"${label}" is already paired`, { icon: "ℹ️" });
            } else {
              toast.success(`Paired "${label}"`);
            }
            // Fire even on already-paired: server truth includes the chat
            // but the parent's local state may not (paired in another tab).
            // Parent de-dupes by id.
            onPaired?.({ id: data.chatId, name: data.chatTitle });
            onOpenChange(false);
          },
          onError: (err) => {
            if (sessionId !== sessionIdRef.current) return;
            // 422 = "pending" (bot hasn't claimed yet). Keep polling silently.
            // 429 = rate limit (shouldn't happen at 3s cadence). Keep polling.
            // 404 / 403 / 503 = terminal. Halt and surface the error.
            if (err instanceof TelegramPairingError) {
              if (err.status === 422 || err.status === 429) return;
            }
            setPollingHalted(true);
          },
        }
      );
    };

    // Kick off the first poll immediately so state flips fast when the
    // grantee sends the command quickly.
    pollOnce();
    const interval = setInterval(pollOnce, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [open, token, isExpired, pollingHalted, verifyMutate, onOpenChange, onPaired]);

  // Terminal error (not the 422 "still waiting" polling signal).
  const inlineError = useMemo(() => {
    const err = verifyPairing.error;
    if (!err) return null;
    if (err instanceof TelegramPairingError) {
      if (err.status === 422 || err.status === 429) return null;
    }
    return resolveFatalErrorMessage(err);
  }, [verifyPairing.error]);

  const isStarting = startPairing.isPending;
  const showWaiting = Boolean(token) && !isExpired && !pollingHalted && !inlineError;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-white dark:bg-zinc-900">
        <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <MessageSquare className="w-5 h-5 text-sky-500" />
          Pair a Telegram chat
        </DialogTitle>

        <div className="mt-2 space-y-5">
          {/* Slash-command display */}
          <div>
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              Send this command in the group
            </p>
            <div className="flex items-stretch gap-2">
              <div className="flex-1 flex items-center justify-center rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 px-4 py-3 font-mono text-sm font-semibold tracking-wide text-gray-900 dark:text-white min-h-[52px] break-all">
                {isStarting || !slashCommand ? (
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                ) : (
                  <span data-testid="telegram-pair-command">{slashCommand}</span>
                )}
              </div>
              <button
                type="button"
                onClick={handleCopy}
                disabled={!slashCommand || isStarting}
                className="inline-flex items-center justify-center rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-gray-500 hover:text-sky-600 hover:border-sky-300 dark:hover:text-sky-400 dark:hover:border-sky-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Copy command"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-500">
                {isExpired ? (
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    Token expired
                  </span>
                ) : (
                  <>
                    Token expires in{" "}
                    <span
                      className={
                        isLowTime
                          ? "font-bold text-gray-900 dark:text-white"
                          : "font-medium text-gray-700 dark:text-gray-300"
                      }
                      data-testid="telegram-pair-countdown"
                    >
                      {formatCountdown(msRemaining)}
                    </span>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* One-tap add-to-group deep link */}
          {addBotDeepLink ? (
            <a
              href={addBotDeepLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-lg border border-sky-200 dark:border-sky-900/40 bg-sky-50 dark:bg-sky-900/10 px-4 py-2.5 text-sm font-medium text-sky-700 dark:text-sky-300 transition hover:border-sky-300 hover:bg-sky-100 dark:hover:border-sky-700 dark:hover:bg-sky-900/20"
            >
              <ExternalLink className="w-4 h-4" />
              Open Telegram — add Karma bot to a group
            </a>
          ) : null}

          {/* Instructions */}
          <ol className="space-y-2 text-sm text-gray-700 dark:text-gray-300 list-decimal list-inside marker:text-sky-600 dark:marker:text-sky-400">
            <li>
              Click <strong>Open Telegram</strong> above and pick the group you want to pair. If the
              Karma bot is already in the group, skip this step.
            </li>
            <li>
              Send the <strong>/karma-pair</strong> command above as a message in that group.
            </li>
            <li>
              Come back here — Karma auto-detects the pairing and this modal closes. No extra click
              needed.
            </li>
          </ol>

          {/* Waiting indicator / inline error */}
          {showWaiting ? (
            <output
              aria-live="polite"
              className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/50 px-3 py-2.5 text-xs text-gray-600 dark:text-gray-400"
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              <p>Waiting for the bot to see your command…</p>
            </output>
          ) : null}

          {inlineError ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10 px-3 py-2.5 text-xs text-red-700 dark:text-red-400"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p>{inlineError}</p>
            </div>
          ) : null}

          {/* Actions: close, plus regenerate when expired */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {isExpired || inlineError ? (
              <Button type="button" onClick={handleStart} disabled={isStarting}>
                {isStarting ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                )}
                Generate new token
              </Button>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
