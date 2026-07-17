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
      <div className="inline-flex items-center gap-2 rounded-full border border-sf-line-strong bg-sf-card px-3 py-1.5 text-[12.5px] text-sf-ink">
        <UserRoundIcon className="h-3.5 w-3.5 text-sf-muted" aria-hidden />
        <span className="font-medium">Commenting as Advisor</span>
      </div>
    );
  }

  if (!displayName) return null;

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-sf-line-strong bg-sf-card px-3 py-1.5 text-[12.5px] text-sf-ink">
      <UserRoundIcon className="h-3.5 w-3.5 text-sf-muted" aria-hidden />
      <span>
        Commenting as <strong className="font-semibold text-sf-heading">{displayName}</strong>
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-auto px-1 py-0.5 text-sf-muted hover:text-sf-heading"
        onClick={onEditName}
        aria-label="Edit display name"
      >
        <PencilIcon className="h-3 w-3" />
      </Button>
      <button
        type="button"
        onClick={onSwitch}
        className="text-[11.5px] text-sf-muted underline-offset-4 hover:text-sf-heading hover:underline focus-visible:outline-none focus-visible:underline"
      >
        Not me — switch
      </button>
    </div>
  );
}
