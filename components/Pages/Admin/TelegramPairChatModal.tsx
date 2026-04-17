"use client";

import { AlertCircle, Copy, Loader2, MessageSquare, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/Utilities/Button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import {
  type TelegramPairingError,
  useStartTelegramPairing,
  useVerifyTelegramPairing,
} from "@/hooks/useTelegramPairing";
import { envVars } from "@/utilities/enviromentVars";

const KARMA_TELEGRAM_BOT_HANDLE = envVars.KARMA_TELEGRAM_BOT_HANDLE;

interface TelegramPairChatModalProps {
  communitySlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatCountdown = (msRemaining: number): string => {
  const total = Math.max(0, Math.floor(msRemaining / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const resolveVerifyErrorMessage = (error: TelegramPairingError | null): string | null => {
  if (!error) return null;
  if (error.status === 404) {
    return "Token not found yet. Make sure you posted it in the group and the Karma bot is a member.";
  }
  if (error.status === 503) {
    return "Telegram integration is not configured yet. Contact support.";
  }
  return error.message || "Verification failed. Please try again.";
};

export function TelegramPairChatModal({
  communitySlug,
  open,
  onOpenChange,
}: TelegramPairChatModalProps) {
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const [verifyError, setVerifyError] = useState<TelegramPairingError | null>(null);

  const [, copy] = useCopyToClipboard();

  const startPairing = useStartTelegramPairing(communitySlug);
  const verifyPairing = useVerifyTelegramPairing(communitySlug);

  const startMutate = startPairing.mutate;
  const startReset = startPairing.reset;
  const verifyReset = verifyPairing.reset;

  const handleStart = useCallback(() => {
    setVerifyError(null);
    startMutate(undefined, {
      onSuccess: (data) => {
        setToken(data.token);
        setExpiresAt(data.expiresAt);
      },
      onError: (err) => {
        toast.error(err.message || "Could not generate pairing token");
      },
    });
  }, [startMutate]);

  // Kick off a fresh token when the modal opens
  useEffect(() => {
    if (!open) return;
    setToken(null);
    setExpiresAt(null);
    setVerifyError(null);
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

  const handleCopy = useCallback(() => {
    if (!token) return;
    copy(token, "Token copied to clipboard");
  }, [copy, token]);

  const handleVerify = useCallback(() => {
    if (!token) return;
    setVerifyError(null);
    verifyPairing.mutate(
      { token },
      {
        onSuccess: (data) => {
          const label = data.chatTitle || "chat";
          if (data.alreadyPaired) {
            toast.success(`"${label}" is already paired`, { icon: "ℹ️" });
          } else {
            toast.success(`Paired "${label}"`);
          }
          onOpenChange(false);
        },
        onError: (err) => {
          setVerifyError(err);
        },
      }
    );
  }, [token, verifyPairing, onOpenChange]);

  const inlineError = resolveVerifyErrorMessage(verifyError);
  const isStarting = startPairing.isPending;
  const isVerifying = verifyPairing.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-white dark:bg-zinc-900">
        <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <MessageSquare className="w-5 h-5 text-sky-500" />
          Pair a Telegram chat
        </DialogTitle>

        <div className="mt-2 space-y-5">
          {/* Token display */}
          <div>
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              Pairing token
            </p>
            <div className="flex items-stretch gap-2">
              <div className="flex-1 flex items-center justify-center rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 px-4 py-3 font-mono text-base font-semibold tracking-wider text-gray-900 dark:text-white min-h-[52px]">
                {isStarting || !token ? (
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                ) : (
                  <span data-testid="telegram-pair-token">{token}</span>
                )}
              </div>
              <button
                type="button"
                onClick={handleCopy}
                disabled={!token || isStarting}
                className="inline-flex items-center justify-center rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-gray-500 hover:text-sky-600 hover:border-sky-300 dark:hover:text-sky-400 dark:hover:border-sky-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Copy token"
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

          {/* Instructions */}
          <ol className="space-y-2 text-sm text-gray-700 dark:text-gray-300 list-decimal list-inside marker:text-sky-600 dark:marker:text-sky-400">
            <li>
              Add{" "}
              <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-sky-700 dark:text-sky-300 text-xs">
                @{KARMA_TELEGRAM_BOT_HANDLE}
              </code>{" "}
              to your Telegram group if you haven&apos;t already.
            </li>
            <li>Copy the token above and post it as a message in that group.</li>
            <li>
              Click <strong>Verify now</strong> below. Karma will detect which chat the token was
              posted in and add it automatically.
            </li>
          </ol>

          {/* Inline error */}
          {inlineError ? (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10 px-3 py-2.5 text-xs text-red-700 dark:text-red-400">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p>{inlineError}</p>
            </div>
          ) : null}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={isVerifying}
            >
              Cancel
            </Button>
            {isExpired ? (
              <Button type="button" onClick={handleStart} disabled={isStarting}>
                {isStarting ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                )}
                Generate new token
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleVerify}
                disabled={!token || isStarting || isVerifying}
              >
                {isVerifying ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
                Verify now
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
