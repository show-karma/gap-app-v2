"use client";

import { Button } from "@/components/ui/button";

/** Minimum non-whitespace source length before refine is allowed. */
const MIN_REFINE_LENGTH = 10;

interface RefineButtonProps {
  sourceText: string;
  isRefining: boolean;
  onRefine: () => void;
}

/**
 * Triggers the LLM refine. Disabled until the source has at least
 * {@link MIN_REFINE_LENGTH} non-whitespace characters. Stays enabled after a
 * successful refine so the advisor can re-refine the same source.
 */
export function RefineButton({ sourceText, isRefining, onRefine }: RefineButtonProps) {
  const disabled = sourceText.trim().length < MIN_REFINE_LENGTH || isRefining;

  return (
    <Button type="button" size="sm" onClick={onRefine} disabled={disabled} className="self-start">
      {isRefining ? "Refining…" : "Refine"}
    </Button>
  );
}
