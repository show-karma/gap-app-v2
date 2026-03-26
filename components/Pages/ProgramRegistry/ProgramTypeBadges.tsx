"use client";

import React from "react";
import { OPPORTUNITY_TYPE_SINGULAR_LABELS } from "@/src/features/funding-map/constants/filter-options";
import type { OpportunityType } from "@/src/features/funding-map/types/funding-program";

interface ProgramTypeBadgesProps {
  type: string | null | undefined;
  legacyTypes: string[];
}

const BADGE_CLASS =
  "mr-1 inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20";

export const ProgramTypeBadges = React.memo(function ProgramTypeBadges({
  type,
  legacyTypes,
}: ProgramTypeBadgesProps) {
  const typeLabel = type ? OPPORTUNITY_TYPE_SINGULAR_LABELS[type as OpportunityType] : null;

  if (typeLabel) {
    return <span className={BADGE_CLASS}>{typeLabel}</span>;
  }

  return (
    <>
      {legacyTypes.map((legacyType) => (
        <span key={legacyType} className={BADGE_CLASS}>
          {legacyType}
        </span>
      ))}
    </>
  );
});
