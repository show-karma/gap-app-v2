"use client";

import type { RefCallback } from "react";
import { KarmaLogo } from "@/components/Icons/Karma";

interface SharedTopBarProps {
  /**
   * Ref callback wired to the DOM node `CommentOverlay` portals the
   * `IdentityBadge` into (spec 2.3: "IdentityBadge right"). Kept as a portal
   * target rather than lifting `useCommenting` state up here, so the
   * comment/identity state machine keeps exactly one owner.
   */
  identitySlotRef: RefCallback<HTMLDivElement>;
}

/**
 * Slim standalone top bar for the donor share view (spec 2.3): the Karma
 * mark and a slot on the right that `CommentOverlay` portals the
 * `IdentityBadge` into.
 *
 * There is no "Prepared by {advisor}" line: the unauthenticated share
 * payload never carries the report's advisor identity (KTD12 redaction —
 * see `SharedReportApiPayload` in types/donor-research.ts), and an
 * onboarded-advisor viewer only proves the viewer IS some advisor, not the
 * author of THIS report — rendering their own name here would misattribute
 * authorship whenever an advisor previews a colleague's share link.
 */
export function SharedTopBar({ identitySlotRef }: SharedTopBarProps) {
  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-sf-line pb-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <KarmaLogo className="h-6 w-6 flex-none text-sf-ink" />
        <span className="text-[13.5px] font-[650] tracking-[-0.01em] text-sf-heading">Karma</span>
      </div>
      <div className="flex flex-none items-center" ref={identitySlotRef} />
    </header>
  );
}
