"use client";

import { ChartBarIcon, ClockIcon } from "@heroicons/react/24/outline";
import type { FC } from "react";
import { KarmaProfileContextSection } from "./KarmaProfileContextSection";

type KarmaProfileStatus = "pending" | "in_progress" | "completed" | "failed" | "skipped";

type KarmaProfileSkipReason =
  | "no_field_configured"
  | "uid_empty"
  | "uid_invalid"
  | "project_not_found"
  | "aggregator_failed";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

interface KarmaProfileEvaluationDisplayProps {
  evaluation: string | null;
  context: string | null;
  status: KarmaProfileStatus | undefined;
  evaluatedAt: string | Date | undefined;
  skipReason?: KarmaProfileSkipReason;
  programName?: string;
}

const SKIP_COPY: Record<KarmaProfileSkipReason, string> = {
  no_field_configured:
    "This program doesn't ask for a Karma project link, or the Insights prompt isn't configured for this environment.",
  uid_empty:
    "The applicant didn't link a Karma project on their application, so there's no track record to evaluate.",
  uid_invalid:
    "The applicant provided a value in the Karma project field, but it isn't a valid project UID.",
  project_not_found:
    "The linked Karma project couldn't be loaded (deleted, not yet indexed, or no public data).",
  aggregator_failed:
    "The track-record aggregator failed to build the context. Try Re-evaluate, or check Sentry for the underlying error.",
};

function formatEvaluatedAt(value: string | Date | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function safeParse(json: string): JsonValue | null {
  try {
    return JSON.parse(json) as JsonValue;
  } catch {
    return null;
  }
}

/**
 * Renders the Karma Profile (track-record) AI evaluation. The component is
 * schema-agnostic: whatever shape the LLM returns gets rendered through a
 * generic JSON walker. Strings get a paragraph treatment, primitives get a
 * label/value row, string arrays get bullet lists, nested primitive maps get
 * a stats tile grid, nested objects recurse. No field names are hardcoded —
 * the prompt can evolve without the renderer following along.
 */
export const KarmaProfileEvaluationDisplay: FC<KarmaProfileEvaluationDisplayProps> = ({
  evaluation,
  context,
  status,
  evaluatedAt,
  skipReason,
}) => {
  const evaluatedAtLabel = formatEvaluatedAt(evaluatedAt);

  return (
    <div>
      <div className="flex flex-col gap-1 pb-4 items-start">
        <div className="flex items-start justify-start gap-2">
          <ChartBarIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-semibold">Applications Insights</h3>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          AI verdict on the applicant's delivery history across past Karma grants, milestones, and
          impact indicators. Independent of the application proposal: use this to weigh track record
          alongside the Internal evaluation.
        </p>
        {evaluatedAtLabel ? (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Evaluated {evaluatedAtLabel}
          </p>
        ) : null}
      </div>

      {status === "skipped" ? (
        <SkippedState reason={skipReason} />
      ) : status === "failed" ? (
        <FailedState />
      ) : status === "pending" || status === "in_progress" ? (
        <PendingState />
      ) : evaluation ? (
        <CompletedState evaluation={evaluation} context={context} />
      ) : (
        <PendingState />
      )}
    </div>
  );
};

function SkippedState({ reason }: { reason?: KarmaProfileSkipReason }) {
  const fallback = "Track-record evaluation didn't run for this application.";
  const copy = reason ? (SKIP_COPY[reason] ?? fallback) : fallback;
  return (
    <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Not evaluated</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{copy}</p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
        If the underlying issue is fixed (applicant linked a project, program added the field), use
        Re-evaluate above to retry.
      </p>
    </div>
  );
}

function FailedState() {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
      <p className="text-sm text-red-600 dark:text-red-400">
        Track-record evaluation failed. Try Re-evaluate above, or check server logs.
      </p>
    </div>
  );
}

function PendingState() {
  return (
    <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 text-center">
      <ClockIcon className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
      <p className="text-gray-500 dark:text-gray-400 text-sm">Track-record evaluation pending</p>
      <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
        Fires automatically after submission. Check back in a few moments.
      </p>
    </div>
  );
}

function CompletedState({ evaluation, context }: { evaluation: string; context: string | null }) {
  const parsed = safeParse(evaluation);

  if (parsed === null) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
        <p className="text-sm text-red-600 dark:text-red-400">
          Failed to parse evaluation data. Re-run the evaluation.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <JsonNode value={parsed} depth={0} />

      <p className="text-xs text-gray-400 dark:text-gray-500">
        AI-generated. Verify counts and dates against the source data below before quoting them.
      </p>

      {context ? (
        <KarmaProfileContextSection
          context={context}
          title="Source data used"
          hint="Raw Karma project markdown the AI evaluated. Use this to audit any claim above."
        />
      ) : null}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────
// Generic JSON renderer
// ───────────────────────────────────────────────────────────────────

function humanize(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function isPlainObject(v: unknown): v is Record<string, JsonValue> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isPrimitive(v: unknown): v is JsonPrimitive {
  return v === null || ["string", "number", "boolean"].includes(typeof v);
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === "string");
}

function isPrimitiveMap(v: unknown): v is Record<string, JsonPrimitive> {
  return isPlainObject(v) && Object.keys(v).length > 0 && Object.values(v).every(isPrimitive);
}

/**
 * Build a content-derived React key for an arbitrary array item so reorders
 * don't reuse stale state. Truncated to keep keys small; idx + parentKey
 * disambiguate duplicates.
 */
function stableKey(item: unknown, idx: number, parentKey?: string): string {
  const seed = parentKey ?? "item";
  if (isPrimitive(item)) return `${seed}-${idx}-${String(item).slice(0, 40)}`;
  try {
    return `${seed}-${idx}-${JSON.stringify(item).slice(0, 64)}`;
  } catch {
    return `${seed}-${idx}`;
  }
}

function formatPrimitive(value: JsonPrimitive): string {
  if (value === null) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") return value.trim().length === 0 ? "—" : humanizeValue(value);
  return String(value);
}

/**
 * If a string looks like an enum slug (snake_case, no spaces, short), humanize
 * it — "no_history" → "No history". Plain prose stays untouched.
 */
function humanizeValue(value: string): string {
  if (value.length > 40) return value;
  if (/\s/.test(value)) return value;
  if (!/^[a-z][a-z0-9_-]*$/i.test(value)) return value;
  return humanize(value);
}

/** Recursive renderer entry. Picks a layout based on the value's shape. */
function JsonNode({
  value,
  depth,
  parentKey,
}: {
  value: JsonValue;
  depth: number;
  parentKey?: string;
}) {
  if (isPrimitive(value)) {
    return <ValueLine value={value} />;
  }
  if (isStringArray(value)) {
    return <BulletList items={value} />;
  }
  if (isPrimitiveMap(value)) {
    return <StatsGrid entries={value} />;
  }
  if (Array.isArray(value)) {
    return (
      <div className="space-y-3">
        {value.map((item, idx) => (
          // Derive the key from the item's content so reorders / inserts
          // don't reuse stale React state. Falls back to a hash of the
          // serialized form for primitives, otherwise the index is the
          // only signal we have.
          <ArrayItem key={stableKey(item, idx, parentKey)} value={item} depth={depth + 1} />
        ))}
      </div>
    );
  }
  if (isPlainObject(value)) {
    const entries = Object.entries(value);
    return (
      <div className="space-y-5">
        {entries.map(([key, child]) => (
          <Section key={key} title={humanize(key)} keyName={key}>
            <JsonNode value={child} depth={depth + 1} parentKey={key} />
          </Section>
        ))}
      </div>
    );
  }
  return null;
}

function Section({
  title,
  keyName,
  children,
}: {
  title: string;
  keyName: string;
  children: React.ReactNode;
}) {
  // Heading style scales with key depth in a subtle way — top-level sections
  // get a stronger title. We don't switch on the key name itself.
  return (
    <section aria-label={keyName} className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {title}
      </h4>
      <div>{children}</div>
    </section>
  );
}

function ValueLine({ value }: { value: JsonPrimitive }) {
  if (typeof value === "string" && value.length > 80) {
    // Long string → paragraph in a soft card so prose has room to breathe.
    return (
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-4">
        <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-200 whitespace-pre-wrap">
          {value}
        </p>
      </div>
    );
  }
  return <p className="text-sm text-gray-900 dark:text-gray-100">{formatPrimitive(value)}</p>;
}

function BulletList({ items }: { items: string[] }) {
  // Deduplicate identical bullets so React keys don't collide. LLM output
  // can repeat itself; we'd rather show one bullet than warn at runtime.
  const unique = Array.from(new Set(items));
  return (
    <ul className="space-y-1.5">
      {unique.map((item) => (
        <li key={item} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-200">
          <span className="mt-2 w-1 h-1 flex-shrink-0 rounded-full bg-gray-400 dark:bg-gray-500" />
          <span className="leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function StatsGrid({ entries }: { entries: Record<string, JsonPrimitive> }) {
  const tiles = Object.entries(entries);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
      {tiles.map(([key, value]) => (
        <div
          key={key}
          className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/40 px-3 py-2"
        >
          <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100 leading-tight">
            {formatPrimitive(value)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{humanize(key)}</div>
        </div>
      ))}
    </div>
  );
}

function ArrayItem({ value, depth }: { value: JsonValue; depth: number }) {
  if (isPrimitive(value)) {
    return (
      <div className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-200">
        <span className="mt-2 w-1 h-1 flex-shrink-0 rounded-full bg-gray-400 dark:bg-gray-500" />
        <span className="leading-relaxed">{formatPrimitive(value)}</span>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/40 p-3">
      <JsonNode value={value} depth={depth} />
    </div>
  );
}
