"use client";

import { Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { DeleteDialog } from "@/components/DeleteDialog";
import {
  BTN_BASE,
  BTN_OUTLINE,
  BTN_PRIMARY,
  BTN_SM,
} from "@/components/Pages/Dashboard/v3/soft-classes";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { useGenerateShareToken, useRevokeShareToken } from "@/hooks/useShareToken";
import { markSurfaced } from "@/utilities/errors";
import { PAGES } from "@/utilities/pages";

interface ShareTokenControlsProps {
  reportId: string;
  hasShareToken: boolean;
  shareToken: string | null;
  shareTokenExpiresAt: string | null;
}

const DEFAULT_TTL_DAYS = 30;

/**
 * Share-token controls (U13d). Three states the advisor sees:
 *
 *  - No token: "Share with donor" CTA generates a link directly — no modal,
 *    no share personalization (advisor display name / intro text is an
 *    explicit spec non-goal). It hits the indexer's POST
 *    /reports/:id/share-token with a fixed `DEFAULT_TTL_DAYS` TTL.
 *  - Has token: copy URL / regenerate / revoke. Both Regenerate (rotates
 *    the token, breaking links already sent) and Revoke are destructive,
 *    so both fire through `DeleteDialog` (CLAUDE.md mandate: never raw
 *    `confirm()`). Copy works off whatever token is currently live —
 *    either the one just generated in this session or the one the
 *    report-detail response carried in (`report.shareToken`).
 *  - Pending: button disabled, label flips to a progress phrase.
 */
export function ShareTokenControls({
  reportId,
  hasShareToken,
  shareToken,
  shareTokenExpiresAt,
}: ShareTokenControlsProps) {
  const [, copyFn] = useCopyToClipboard();
  const copy = async (text: string) => {
    try {
      await copyFn(text);
    } catch {
      // SUPPRESSED: useCopyToClipboard already surfaces failures via
      // toast/errorManager; swallow here so a rejected clipboard write can't
      // bubble up as an unhandled rejection.
    }
  };
  const generate = useGenerateShareToken();
  const revoke = useRevokeShareToken();
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [regenerateOpen, setRegenerateOpen] = useState(false);

  const effectiveToken = generatedToken ?? shareToken;
  // Locale/timezone formatting must run after mount: `toLocaleString()` renders
  // with the server's locale during SSR and the browser's on hydration, so
  // formatting it in render would produce a hydration mismatch. Compute the
  // label in an effect and render nothing until it resolves client-side.
  const [expiresLabel, setExpiresLabel] = useState<string | null>(null);
  useEffect(() => {
    setExpiresLabel(shareTokenExpiresAt ? new Date(shareTokenExpiresAt).toLocaleString() : null);
  }, [shareTokenExpiresAt]);

  const rotateShareToken = async () => {
    const result = await generate.mutateAsync({
      reportId,
      body: { ttlSeconds: DEFAULT_TTL_DAYS * 24 * 60 * 60 },
    });
    setGeneratedToken(result.shareToken);
  };

  const handleGenerate = async () => {
    try {
      await rotateShareToken();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't generate a share link. Try again."
      );
    }
  };

  // Regenerate goes through `DeleteDialog`, whose `deleteFunction` contract
  // is "throw on failure" — it awaits the function and treats a resolved
  // promise as success, closing the confirm dialog. Reusing the
  // toast-and-swallow `handleGenerate` here would let a failed rotation
  // present as a successful one (the dialog closes as if it worked, and
  // only the toast reveals otherwise). Rethrow — marked surfaced, since the
  // toast above already told the user — so `DeleteDialog` keeps the dialog
  // open and its own catch handles telemetry without stacking a second,
  // generic toast on top.
  const handleRegenerateConfirm = async () => {
    try {
      await rotateShareToken();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't generate a share link. Try again."
      );
      throw markSurfaced(error);
    }
  };

  const handleCopy = async () => {
    if (effectiveToken) {
      await copy(buildShareUrl(effectiveToken));
    }
  };

  const handleConfirmRevoke = async () => {
    await revoke.mutateAsync({ reportId });
    setGeneratedToken(null);
  };

  if (!hasShareToken && !generatedToken) {
    return (
      <button
        className={`${BTN_BASE} ${BTN_SM} ${BTN_PRIMARY} disabled:opacity-50`}
        disabled={generate.isPending}
        onClick={handleGenerate}
        type="button"
      >
        <Share2 className="h-4 w-4" />
        {generate.isPending ? "Generating…" : "Share with donor"}
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <button
          className={`${BTN_BASE} ${BTN_SM} ${BTN_PRIMARY} disabled:opacity-50`}
          disabled={!effectiveToken}
          onClick={handleCopy}
          type="button"
        >
          Copy share link
        </button>
        <button
          className={`${BTN_BASE} ${BTN_SM} ${BTN_OUTLINE} disabled:opacity-50`}
          disabled={generate.isPending}
          onClick={() => setRegenerateOpen(true)}
          type="button"
        >
          Regenerate
        </button>
        <button
          className={`${BTN_BASE} ${BTN_SM} border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200`}
          onClick={() => setRevokeOpen(true)}
          type="button"
        >
          Revoke
        </button>
      </div>
      {expiresLabel ? <p className="text-xs text-sf-muted">Link expires {expiresLabel}</p> : null}

      <DeleteDialog
        title={
          <span className="flex flex-col gap-2">
            <span>Regenerate share link?</span>
            <span className="text-sm font-normal text-muted-foreground">
              This rotates the share token and immediately stops the current link from working.
              Anyone you already sent it to will lose access until you share the new link.
            </span>
          </span>
        }
        deleteFunction={handleRegenerateConfirm}
        isLoading={generate.isPending}
        buttonElement={null}
        externalIsOpen={regenerateOpen}
        externalSetIsOpen={setRegenerateOpen}
      />

      <DeleteDialog
        title="Revoke share link?"
        deleteFunction={handleConfirmRevoke}
        isLoading={revoke.isPending}
        buttonElement={null}
        externalIsOpen={revokeOpen}
        externalSetIsOpen={setRevokeOpen}
      />
    </div>
  );
}

function buildShareUrl(token: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}${PAGES.DONOR_RESEARCH.SHARED(token)}`;
}
