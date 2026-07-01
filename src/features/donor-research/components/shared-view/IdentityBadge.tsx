"use client";

import { PencilIcon, UserRoundIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

interface IdentityBadgeProps {
  /** Display name from useCommenterIdentity. */
  displayName: string | null;
  /** True when viewer is the report's advisor. */
  isAdvisor: boolean;
  /** Opens IdentityCaptureDialog in edit-name-only mode. */
  onEditName: () => void;
  /** Q2 "Not me — switch" — clears cookies and forces a fresh prompt. */
  onSwitch: () => void;
}

/**
 * Renders "Commenting as <name>" with an edit pencil and a "Not me —
 * switch" link. Visible above the comment composer / overlay opener
 * once the donor has posted (or the advisor is authenticated).
 */
export function IdentityBadge({
  displayName,
  isAdvisor,
  onEditName,
  onSwitch,
}: IdentityBadgeProps) {
  if (isAdvisor) {
    return (
      <div className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-sm">
        <UserRoundIcon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        <span>Commenting as Advisor</span>
      </div>
    );
  }

  if (!displayName) return null;

  return (
    <div className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-sm">
      <UserRoundIcon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      <span>
        Commenting as <strong className="font-medium">{displayName}</strong>
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-auto px-1 py-0.5"
        onClick={onEditName}
        aria-label="Edit display name"
      >
        <PencilIcon className="h-3 w-3" />
      </Button>
      <button
        type="button"
        onClick={onSwitch}
        className="text-xs text-muted-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
      >
        Not me — switch
      </button>
    </div>
  );
}
