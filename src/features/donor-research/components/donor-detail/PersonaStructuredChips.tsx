"use client";

import { memo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PERSONA_CHIP_FIELDS,
  PERSONA_NULL_LABEL,
  type PersonaChipDescriptor,
  personaChipLabel,
} from "@/src/features/donor-research/utils/persona-enums";
import type { PersonaStructured, PersonaStructuredField } from "@/types/donor-research";
import { AiBadge } from "./AiBadge";

/** Radix Select uses string values; this sentinel stands in for `null`. */
const NULL_VALUE = "__none__";

interface ChipRowProps {
  descriptor: PersonaChipDescriptor;
  field: PersonaStructuredField<string>;
  disabled?: boolean;
  onChange: (key: keyof PersonaStructured, value: string | null) => void;
}

const ChipRow = memo(function ChipRow({ descriptor, field, disabled, onChange }: ChipRowProps) {
  const labelId = `persona-chip-${descriptor.key}`;
  const isExtracted = field.source === "extracted" && field.value !== null;

  return (
    <div className="flex flex-col gap-1.5">
      <span id={labelId} className="flex items-center gap-1.5 text-sm font-medium">
        {descriptor.label}
        {isExtracted ? <AiBadge /> : null}
      </span>
      <Select
        value={field.value ?? NULL_VALUE}
        onValueChange={(next) => onChange(descriptor.key, next === NULL_VALUE ? null : next)}
        disabled={disabled}
      >
        <SelectTrigger aria-labelledby={labelId} className="w-full">
          <SelectValue>{personaChipLabel(descriptor, field.value)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NULL_VALUE}>{PERSONA_NULL_LABEL}</SelectItem>
          {descriptor.values.map((value) => (
            <SelectItem key={value} value={value}>
              {descriptor.labels[value] ?? value}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
});

interface PersonaStructuredChipsProps {
  structured: PersonaStructured;
  disabled?: boolean;
  /** Fired when the advisor changes a chip — the editor flips it to `manual`. */
  onChange: (key: keyof PersonaStructured, value: string | null) => void;
}

/**
 * The five structured persona chips, one Radix Select each, each with an
 * explicit label. A chip whose value was AI-extracted (and not since edited)
 * shows an "AI" badge.
 */
export function PersonaStructuredChips({
  structured,
  disabled,
  onChange,
}: PersonaStructuredChipsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {PERSONA_CHIP_FIELDS.map((descriptor) => (
        <ChipRow
          key={descriptor.key}
          descriptor={descriptor}
          field={structured[descriptor.key]}
          disabled={disabled}
          onChange={onChange}
        />
      ))}
    </div>
  );
}
