"use client";

import { Flag, Loader2, Search, X } from "lucide-react";
import React, { useMemo, useState } from "react";
import { cn } from "@/utilities/tailwind";
import { useBulkJobResult } from "../hooks/useBulkJob";
import { BulkResultTable } from "./BulkResultTable";

interface BulkResultsDashboardProps {
  sessionId: string;
  jobId: string;
  enabled: boolean;
}

type DecisionBucket = "approve" | "needs-review" | "reject";

interface NormalizedRow {
  id: string;
  name: string;
  score: number | null;
  decision: DecisionBucket;
  summary: string;
  raw: Record<string, unknown>;
  flags: number;
}

const SCORE_BUCKETS: ReadonlyArray<{ label: string; min: number; max: number }> = [
  { label: "0-20", min: 0, max: 20 },
  { label: "20-40", min: 20, max: 40 },
  { label: "40-60", min: 40, max: 60 },
  { label: "60-80", min: 60, max: 80 },
  { label: "80-100", min: 80, max: 101 },
];

const NAME_COLUMN_CANDIDATES = [
  "name",
  "project",
  "project name",
  "project_name",
  "title",
  "application",
  "applicant",
  "company",
];

function pickNameColumn(columns: string[]): string | null {
  const lower = new Map(columns.map((c) => [c.toLowerCase(), c]));
  for (const candidate of NAME_COLUMN_CANDIDATES) {
    const match = lower.get(candidate);
    if (match) return match;
  }
  return columns.find((c) => !c.startsWith("eval_")) ?? null;
}

function valueToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function parseScore(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const num = Number.parseFloat(value);
    return Number.isFinite(num) ? num : null;
  }
  return null;
}

const APPROVE_TOKENS = new Set(["approve", "approved", "pass", "accept", "accepted"]);
const REJECT_TOKENS = new Set(["reject", "rejected", "fail", "deny", "denied"]);

function classifyDecision(rawDecision: unknown, score: number | null): DecisionBucket {
  const text = valueToString(rawDecision).trim().toLowerCase();
  if (APPROVE_TOKENS.has(text)) return "approve";
  if (REJECT_TOKENS.has(text)) return "reject";
  if (text.includes("review")) return "needs-review";
  if (text === "" && score !== null) {
    if (score >= 70) return "approve";
    if (score >= 40) return "needs-review";
    return "reject";
  }
  return "needs-review";
}

function rowKey(row: Record<string, unknown>, fallbackIndex: number): string {
  const candidate =
    valueToString(row.id) || valueToString(row.uid) || valueToString(row.application_id);
  return candidate || `APP-${String(fallbackIndex + 1).padStart(3, "0")}`;
}

function normalize(
  rows: ReadonlyArray<Record<string, unknown>>,
  nameColumn: string | null
): NormalizedRow[] {
  return rows.map((row, idx) => {
    const score = parseScore(row.eval_score);
    const decision = classifyDecision(row.eval_decision, score);
    const errorText = valueToString(row.eval_error);
    return {
      id: rowKey(row, idx),
      name: nameColumn ? valueToString(row[nameColumn]) || "Untitled" : "Untitled",
      score,
      decision,
      summary: valueToString(row.eval_summary),
      raw: row,
      flags: errorText.length > 0 ? 1 : 0,
    };
  });
}

const DECISION_META: Record<
  DecisionBucket,
  { label: string; pillCls: string; cardCls: string; dot: string; sub: string }
> = {
  approve: {
    label: "Approve",
    pillCls:
      "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-900",
    cardCls: "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-border",
    dot: "bg-brand-500",
    sub: "Score ≥ 70",
  },
  "needs-review": {
    label: "Needs review",
    pillCls:
      "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-900",
    cardCls:
      "bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300 border-border",
    dot: "bg-yellow-400",
    sub: "Mid-range or flagged",
  },
  reject: {
    label: "Reject",
    pillCls:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900",
    cardCls: "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-border",
    dot: "bg-red-500",
    sub: "Score < 40 or flagged",
  },
};

const COLUMN_ORDER: ReadonlyArray<DecisionBucket> = ["approve", "needs-review", "reject"];

export function BulkResultsDashboard({ sessionId, jobId, enabled }: BulkResultsDashboardProps) {
  const query = useBulkJobResult(sessionId, jobId, enabled);
  const [view, setView] = useState<"triage" | "table">("triage");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const data = query.data;

  const { rows, nameColumn } = useMemo(() => {
    if (!data) return { rows: [] as NormalizedRow[], nameColumn: null as string | null };
    const name = pickNameColumn(data.columns);
    return { rows: normalize(data.rows, name), nameColumn: name };
  }, [data]);

  const buckets = useMemo(() => {
    return SCORE_BUCKETS.map((b) => ({
      ...b,
      count: rows.filter((r) => r.score !== null && r.score >= b.min && r.score < b.max).length,
    }));
  }, [rows]);

  const grouped = useMemo(() => {
    return COLUMN_ORDER.reduce(
      (acc, key) => {
        acc[key] = rows.filter((r) => r.decision === key);
        return acc;
      },
      { approve: [], "needs-review": [], reject: [] } as Record<DecisionBucket, NormalizedRow[]>
    );
  }, [rows]);

  const stats = useMemo(() => {
    const scores = rows.map((r) => r.score).filter((s): s is number => s !== null);
    const sorted = [...scores].sort((a, b) => a - b);
    const median =
      sorted.length === 0
        ? null
        : sorted.length % 2 === 1
          ? sorted[(sorted.length - 1) / 2]
          : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
    const mean = scores.length === 0 ? null : scores.reduce((a, b) => a + b, 0) / scores.length;
    return { median, mean };
  }, [rows]);

  const filteredGrouped = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return grouped;
    return COLUMN_ORDER.reduce(
      (acc, key) => {
        acc[key] = grouped[key].filter(
          (r) =>
            r.name.toLowerCase().includes(term) ||
            r.summary.toLowerCase().includes(term) ||
            r.id.toLowerCase().includes(term)
        );
        return acc;
      },
      { approve: [], "needs-review": [], reject: [] } as Record<DecisionBucket, NormalizedRow[]>
    );
  }, [grouped, search]);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    return rows.find((r) => r.id === selectedId) ?? null;
  }, [rows, selectedId]);

  if (!enabled) {
    return (
      <p className="text-sm text-muted-foreground">
        Results will appear once the bulk job completes.
      </p>
    );
  }

  if (query.isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading results…
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="flex flex-col gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
        <span>Couldn't load results: {query.error?.message ?? "unknown error"}</span>
        <button
          type="button"
          className="self-start rounded border border-red-300 px-2 py-1 text-xs hover:bg-red-100 dark:border-red-800 dark:hover:bg-red-900/40"
          onClick={() => query.refetch()}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data || data.rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No rows in this result.</p>;
  }

  return (
    <div className="space-y-4">
      <Stats buckets={buckets} grouped={grouped} stats={stats} />

      <div className="flex flex-wrap items-center gap-2">
        <ViewToggle view={view} onChange={setView} />
        <span className="text-xs text-muted-foreground">
          {rows.length} {rows.length === 1 ? "application" : "applications"}
        </span>
        <div className="ml-auto relative w-full sm:w-60">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search applications…"
            className="w-full rounded-md border border-border bg-background py-1.5 pl-8 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-brand-500 focus:outline-none"
          />
        </div>
      </div>

      {view === "table" ? (
        <BulkResultTable sessionId={sessionId} jobId={jobId} enabled={enabled} />
      ) : (
        <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-3">
            {COLUMN_ORDER.map((key) => (
              <KanbanColumn
                key={key}
                bucket={key}
                rows={filteredGrouped[key]}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            ))}
          </div>

          <DetailDrawer
            row={selected}
            nameColumn={nameColumn}
            onClose={() => setSelectedId(null)}
          />
        </div>
      )}
    </div>
  );
}

interface StatsProps {
  buckets: ReadonlyArray<{ label: string; count: number; min: number }>;
  grouped: Record<DecisionBucket, NormalizedRow[]>;
  stats: { median: number | null; mean: number | null };
}

function Stats({ buckets, grouped, stats }: StatsProps) {
  const maxCount = Math.max(1, ...buckets.map((b) => b.count));
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
      <div className="rounded-xl border border-border bg-background p-4">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Score distribution
          </span>
          <span className="text-[10px] text-muted-foreground">
            {stats.median !== null
              ? `Median ${Math.round(stats.median)} · Mean ${Math.round(stats.mean ?? 0)}`
              : "No scored rows"}
          </span>
        </div>
        <div className="mt-3 flex h-16 items-end gap-2">
          {buckets.map((b) => {
            const h = (b.count / maxCount) * 100;
            const isHigh = b.min >= 60;
            const isMid = b.min >= 40 && b.min < 60;
            return (
              <div key={b.label} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">
                  {b.count}
                </span>
                <div
                  className={cn(
                    "w-full min-h-[4px] rounded-t",
                    isHigh ? "bg-brand-500" : isMid ? "bg-brand-300" : "bg-muted"
                  )}
                  style={{ height: `${h}%` }}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-1 flex">
          {buckets.map((b) => (
            <span key={b.label} className="flex-1 text-center text-[9px] text-muted-foreground">
              {b.label}
            </span>
          ))}
        </div>
      </div>

      {COLUMN_ORDER.map((key) => {
        const meta = DECISION_META[key];
        const count = grouped[key].length;
        return (
          <div key={key} className={cn("rounded-xl border p-4", meta.cardCls)}>
            <div className="text-[10px] font-semibold uppercase tracking-wide">{meta.label}</div>
            <div className="mt-2 text-3xl font-bold leading-none tabular-nums">{count}</div>
            <div className="mt-1 text-[11px] text-muted-foreground">{meta.sub}</div>
          </div>
        );
      })}
    </div>
  );
}

interface ViewToggleProps {
  view: "triage" | "table";
  onChange: (next: "triage" | "table") => void;
}

function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-border">
      {(["triage", "table"] as const).map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={cn(
            "px-3 py-1 text-xs font-medium capitalize",
            view === id
              ? "bg-foreground text-background"
              : "bg-background text-muted-foreground hover:text-foreground"
          )}
        >
          {id}
        </button>
      ))}
    </div>
  );
}

interface KanbanColumnProps {
  bucket: DecisionBucket;
  rows: ReadonlyArray<NormalizedRow>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function KanbanColumn({ bucket, rows, selectedId, onSelect }: KanbanColumnProps) {
  const meta = DECISION_META[bucket];
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-background p-3">
      <div className="flex items-center gap-2 border-b border-border/50 pb-2">
        <span className={cn("inline-block h-1.5 w-1.5 rounded-full", meta.dot)} />
        <span className="text-sm font-semibold">{meta.label}</span>
        <span className="text-xs tabular-nums text-muted-foreground">{rows.length}</span>
      </div>

      {rows.length === 0 ? (
        <p className="px-1 py-3 text-xs text-muted-foreground">No applications in this bucket.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <KanbanCard
              key={row.id}
              row={row}
              isSelected={selectedId === row.id}
              onSelect={() => onSelect(row.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

interface KanbanCardProps {
  row: NormalizedRow;
  isSelected: boolean;
  onSelect: () => void;
}

const KanbanCard = React.memo(function KanbanCard({ row, isSelected, onSelect }: KanbanCardProps) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "flex w-full flex-col gap-1.5 rounded-lg border bg-background p-3 text-left transition-colors",
          isSelected
            ? "border-brand-300 bg-brand-50/50 dark:border-brand-700 dark:bg-brand-500/10"
            : "border-border hover:border-muted-foreground/40"
        )}
      >
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-muted-foreground">{row.id}</span>
          <span className="ml-auto">
            <ScorePill score={row.score} />
          </span>
        </div>
        <div className="line-clamp-1 text-sm font-semibold text-foreground">{row.name}</div>
        {row.summary ? (
          <div className="line-clamp-2 text-xs text-muted-foreground">{row.summary}</div>
        ) : null}
        {row.flags > 0 ? (
          <div className="flex items-center gap-1 text-[11px] text-yellow-700 dark:text-yellow-300">
            <Flag className="h-3 w-3" /> {row.flags} {row.flags === 1 ? "flag" : "flags"}
          </div>
        ) : null}
      </button>
    </li>
  );
});

function ScorePill({ score, big = false }: { score: number | null; big?: boolean }) {
  if (score === null) {
    return (
      <span
        className={cn(
          "inline-flex items-baseline gap-0.5 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums",
          big && "rounded-xl px-3 py-1.5 text-base"
        )}
      >
        —
      </span>
    );
  }
  const cls =
    score >= 70
      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
      : score >= 50
        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200"
        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-0.5 font-semibold tabular-nums",
        big ? "rounded-xl px-3 py-1.5 text-base" : "rounded-full px-2 py-0.5 text-xs",
        cls
      )}
    >
      {Math.round(score)}
      <span className={cn("font-medium opacity-70", big ? "text-xs" : "text-[10px]")}>/100</span>
    </span>
  );
}

interface DetailDrawerProps {
  row: NormalizedRow | null;
  nameColumn: string | null;
  onClose: () => void;
}

function DetailDrawer({ row, nameColumn, onClose }: DetailDrawerProps) {
  if (!row) {
    return (
      <aside className="hidden flex-col rounded-xl border border-dashed border-border bg-background p-6 text-sm text-muted-foreground lg:flex">
        Pick an application to see details, criteria breakdown, and the original submission.
      </aside>
    );
  }

  const meta = DECISION_META[row.decision];
  const errorText = typeof row.raw.eval_error === "string" ? row.raw.eval_error : "";
  const originalEntries = Object.entries(row.raw)
    .filter(([key]) => !key.startsWith("eval_"))
    .filter(([key]) => key !== nameColumn);

  return (
    <aside className="flex flex-col rounded-xl border border-border bg-background">
      <div className="flex flex-col gap-3 border-b border-border p-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-muted-foreground">{row.id}</span>
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
              meta.pillCls
            )}
          >
            {meta.label}
          </span>
          {row.flags > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-yellow-200 bg-yellow-50 px-2 py-0.5 text-[11px] font-medium text-yellow-700 dark:border-yellow-900 dark:bg-yellow-950/40 dark:text-yellow-300">
              <Flag className="h-3 w-3" /> {row.flags}
            </span>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="ml-auto rounded p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <h2 className="text-base font-semibold leading-snug text-foreground">{row.name}</h2>
        <div className="flex items-center gap-3">
          <ScorePill score={row.score} big />
          {row.summary ? (
            <p className="text-xs leading-snug text-muted-foreground">{row.summary}</p>
          ) : null}
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {errorText ? (
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-yellow-700 dark:text-yellow-300">
              Why flagged
            </div>
            <p className="mt-1 whitespace-pre-wrap text-xs text-foreground">{errorText}</p>
          </div>
        ) : null}

        {originalEntries.length > 0 ? (
          <div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Original application
            </div>
            <dl className="space-y-2">
              {originalEntries.map(([key, value]) => (
                <div key={key}>
                  <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {key}
                  </dt>
                  <dd className="whitespace-pre-wrap break-words text-xs text-foreground">
                    {valueToString(value) || "—"}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
