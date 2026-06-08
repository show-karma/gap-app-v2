"use client";

import { Share2 } from "lucide-react";
import { useState } from "react";
import { DeleteDialog } from "@/components/DeleteDialog";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { useGenerateShareToken, useRevokeShareToken } from "@/hooks/useShareToken";
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
 *  - No token: "Generate share link" CTA → modal with TTL + advisor
 *    display name + intro text. Submit hits the indexer's POST
 *    /reports/:id/share-token.
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
      // useCopyToClipboard already surfaces failures via toast/errorManager;
      // swallow here so a rejected clipboard write can't bubble up as an
      // unhandled rejection.
    }
  };
  const generate = useGenerateShareToken();
  const revoke = useRevokeShareToken();
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [regenerateOpen, setRegenerateOpen] = useState(false);

  const effectiveToken = generatedToken ?? shareToken;
  const expiresAt = shareTokenExpiresAt ? new Date(shareTokenExpiresAt) : null;

  if (!hasShareToken && !generatedToken) {
    return (
      <button
        type="button"
        onClick={async () => {
          const result = await generate.mutateAsync({
            reportId,
            body: { ttlSeconds: DEFAULT_TTL_DAYS * 24 * 60 * 60 },
          });
          setGeneratedToken(result.shareToken);
        }}
        disabled={generate.isPending}
        className="inline-flex items-center gap-2 rounded-md border border-border bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
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
          type="button"
          onClick={async () => {
            if (effectiveToken) {
              await copy(buildShareUrl(effectiveToken));
            }
          }}
          disabled={!effectiveToken}
          className="rounded-md border border-border bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          Copy share link
        </button>
        <button
          type="button"
          onClick={() => setRegenerateOpen(true)}
          disabled={generate.isPending}
          className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
        >
          Regenerate
        </button>
        <button
          type="button"
          onClick={() => setRevokeOpen(true)}
          className="rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-sm text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
        >
          Revoke
        </button>
      </div>
      {expiresAt ? (
        <p className="text-xs text-muted-foreground">Link expires {expiresAt.toLocaleString()}</p>
      ) : null}

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
        deleteFunction={async () => {
          const result = await generate.mutateAsync({
            reportId,
            body: { ttlSeconds: DEFAULT_TTL_DAYS * 24 * 60 * 60 },
          });
          setGeneratedToken(result.shareToken);
        }}
        isLoading={generate.isPending}
        buttonElement={null}
        externalIsOpen={regenerateOpen}
        externalSetIsOpen={setRegenerateOpen}
      />

      <DeleteDialog
        title="Revoke share link?"
        deleteFunction={async () => {
          await revoke.mutateAsync({ reportId });
          setGeneratedToken(null);
        }}
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
