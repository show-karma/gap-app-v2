"use client";

import type { MilestoneData } from "@/types/whitelabel-entities";
import { MilestoneRenderer, ObjectArrayRenderer, SimpleArrayRenderer } from "./MilestoneRenderer";
import {
  BooleanRenderer,
  DateRenderer,
  EmailRenderer,
  KarmaProfileRenderer,
  ObjectRenderer,
  TextRenderer,
  UrlRenderer,
} from "./PrimitiveRenderers";

interface FieldDisplayProps {
  label: string;
  value: unknown;
  fieldLabel: string;
  referenceNumber: string;
  fieldType?: string;
}

function isMilestoneArray(
  value: unknown
): value is Array<{ title: string; [key: string]: unknown }> {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    typeof value[0] === "object" &&
    value[0] !== null &&
    "title" in value[0]
  );
}

function isObjectArray(value: unknown): value is Array<Record<string, unknown>> {
  return (
    Array.isArray(value) && value.length > 0 && typeof value[0] === "object" && value[0] !== null
  );
}

function isSimpleArray(value: unknown): value is Array<string | number> {
  return (
    Array.isArray(value) &&
    (value.length === 0 || typeof value[0] === "string" || typeof value[0] === "number")
  );
}

function isDateString(value: unknown): value is string {
  return typeof value === "string" && Boolean(value.match(/^\d{4}-\d{2}-\d{2}$/));
}

function isUrl(value: unknown): value is string {
  return typeof value === "string" && (value.startsWith("http://") || value.startsWith("https://"));
}

function isValidKarmaProjectUid(value: unknown): value is string {
  return typeof value === "string" && /^0x[a-fA-F0-9]{64}$/.test(value);
}

export function FieldDisplay({
  label,
  value,
  fieldLabel,
  referenceNumber,
  fieldType,
}: FieldDisplayProps) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return null;

    if (isMilestoneArray(value)) {
      return (
        <MilestoneRenderer
          label={label}
          value={value as unknown as MilestoneData[]}
          fieldLabel={fieldLabel}
          referenceNumber={referenceNumber}
        />
      );
    }

    if (isObjectArray(value)) {
      return <ObjectArrayRenderer label={label} value={value} />;
    }

    if (isSimpleArray(value)) {
      return <SimpleArrayRenderer label={label} value={value} />;
    }
  }

  if (typeof value === "object" && value !== null) {
    return <ObjectRenderer label={label} value={value as Record<string, unknown>} />;
  }

  if (typeof value === "boolean") {
    return <BooleanRenderer label={label} value={value} />;
  }

  if (fieldType === "karma_profile_link" && isValidKarmaProjectUid(value)) {
    return <KarmaProfileRenderer label={label} uid={value} />;
  }

  if (isDateString(value)) {
    return <DateRenderer label={label} value={value} />;
  }

  if (isUrl(value)) {
    return <UrlRenderer label={label} value={value} />;
  }

  if (
    (label.toLowerCase().includes("email") || label.toLowerCase().includes("e-mail")) &&
    typeof value === "string"
  ) {
    return <EmailRenderer label={label} value={value} />;
  }

  return <TextRenderer label={label} value={String(value)} />;
}

export default FieldDisplay;
