"use client";

import { CheckCircle, Mail, XCircle } from "lucide-react";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { formatDate } from "@/utilities/formatDate";
import { KarmaProjectLink } from "../KarmaProjectLink";

interface BooleanRendererProps {
  label: string;
  value: boolean;
}

export function BooleanRenderer({ label, value }: BooleanRendererProps) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</p>
      {value ? (
        <CheckCircle className="w-4 h-4 text-green-500" />
      ) : (
        <XCircle className="w-4 h-4 text-red-500" />
      )}
    </div>
  );
}

interface KarmaProfileRendererProps {
  label: string;
  uid: string;
}

export function KarmaProfileRenderer({ label, uid }: KarmaProfileRendererProps) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</p>
      <KarmaProjectLink uid={uid} />
    </div>
  );
}

interface DateRendererProps {
  label: string;
  value: string;
}

export function DateRenderer({ label, value }: DateRendererProps) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</p>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
        {formatDate(value)}
      </p>
    </div>
  );
}

interface UrlRendererProps {
  label: string;
  value: string;
}

export function UrlRenderer({ label, value }: UrlRendererProps) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</p>
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-primary hover:underline"
      >
        {value}
      </a>
    </div>
  );
}

interface EmailRendererProps {
  label: string;
  value: string;
}

export function EmailRenderer({ label, value }: EmailRendererProps) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</p>
      <a
        href={`mailto:${value}`}
        className="text-sm text-primary hover:underline flex items-center gap-1"
      >
        <Mail className="w-3 h-3" />
        {value}
      </a>
    </div>
  );
}

interface ObjectRendererProps {
  label: string;
  value: Record<string, unknown>;
}

export function ObjectRenderer({ label, value }: ObjectRendererProps) {
  const displayValue = value.name
    ? String(value.name)
    : value.title
      ? String(value.title)
      : JSON.stringify(value);

  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</p>
      <div className="text-sm text-zinc-600 dark:text-zinc-400">
        <MarkdownPreview source={displayValue} />
      </div>
    </div>
  );
}

interface TextRendererProps {
  label: string;
  value: string;
}

export function TextRenderer({ label, value }: TextRendererProps) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</p>
      <div className="text-sm text-zinc-600 dark:text-zinc-400">
        <MarkdownPreview source={value} />
      </div>
    </div>
  );
}
