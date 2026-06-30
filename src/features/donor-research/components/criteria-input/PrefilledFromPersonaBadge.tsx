"use client";

import { type Control, useFormState } from "react-hook-form";
import type { CriteriaFormValues } from "./CriteriaInputPanel";

/** Report-create fields that the persona prefill can seed. */
export type PersonaPrefillField =
  | "criteriaText"
  | "geography"
  | "amountMin"
  | "amountMax"
  | "weights";

interface PrefilledFromPersonaBadgeProps {
  control: Control<CriteriaFormValues>;
  name: PersonaPrefillField;
}

/**
 * Per-field "Prefilled from persona" badge. Dismisses itself the moment the
 * advisor edits that specific field — driven by the field's own dirty state
 * (`useFormState({ name })`), so editing geography never dismisses the weights
 * badge, etc.
 */
export function PrefilledFromPersonaBadge({ control, name }: PrefilledFromPersonaBadgeProps) {
  const { dirtyFields } = useFormState({ control, name });
  const edited = Boolean((dirtyFields as Record<string, unknown>)[name]);
  if (edited) return null;

  return (
    <span className="inline-flex items-center rounded-full border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
      Prefilled from persona
    </span>
  );
}
