"use client";

import { Check, Copy, Globe, Link2Off } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import type { Panel } from "@/types/panels";
import { PAGES } from "@/utilities/pages";

interface Props {
  panel: Panel;
  /** The version the studio is showing; "Publish" freezes this one. */
  currentVersionNumber: number | null;
  publishedVersionNumber: number | null;
  publishing: boolean;
  unpublishing: boolean;
  onPublish: () => void;
  onUnpublish: () => void;
}

function shareUrl(token: string): string {
  const path = PAGES.ADMIN.PANEL_SHARED(token);
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

export function PublishControl({
  panel,
  currentVersionNumber,
  publishedVersionNumber,
  publishing,
  unpublishing,
  onPublish,
  onUnpublish,
}: Props) {
  const [copied, copy] = useCopyToClipboard();
  const published = panel.shareToken !== null && panel.publishedVersionId !== null;
  const stale =
    published &&
    currentVersionNumber !== null &&
    publishedVersionNumber !== null &&
    currentVersionNumber !== publishedVersionNumber;

  if (!published) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onPublish}
        isLoading={publishing}
        disabled={currentVersionNumber === null}
        className="flex items-center gap-2 text-xs"
      >
        <Globe className="size-3.5" aria-hidden />
        Publish
      </Button>
    );
  }

  const url = shareUrl(panel.shareToken as string);

  return (
    <div className="flex items-center gap-1">
      <span className="text-xs" style={{ color: "var(--kp-ink-faint)" }}>
        {stale ? `Published v${publishedVersionNumber}` : "Published"}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => void copy(url, "Share link copied")}
        className="flex items-center gap-1.5 text-xs"
        title={url}
      >
        {copied ? (
          <Check className="size-3.5" aria-hidden />
        ) : (
          <Copy className="size-3.5" aria-hidden />
        )}
        Copy link
      </Button>
      {stale ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onPublish}
          isLoading={publishing}
          className="text-xs"
        >
          Publish v{currentVersionNumber}
        </Button>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onUnpublish}
        isLoading={unpublishing}
        aria-label="Unpublish"
        title="Unpublish"
        className="text-xs"
      >
        <Link2Off className="size-3.5" aria-hidden />
      </Button>
    </div>
  );
}
