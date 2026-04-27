"use client";

import { Library, Plus, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/Utilities/Button";
import { useCommunityAdminAccess } from "@/hooks/communities/useCommunityAdminAccess";
import { useKnowledgeSources } from "@/hooks/knowledge-base/useKnowledgeSources";
import type { Community } from "@/types/v2/community";
import type { KnowledgeSource } from "@/types/v2/knowledge-base";
import { AddSourceDialog } from "./AddSourceDialog";
import { SourceRow } from "./SourceRow";

interface Props {
  community: Community;
}

interface Aggregates {
  total: number;
  active: number;
  failing: number;
  lastSyncedAt: number | null;
}

function aggregate(list: KnowledgeSource[]): Aggregates {
  return list.reduce<Aggregates>(
    (acc, s) => {
      acc.total += 1;
      if (s.isActive) acc.active += 1;
      if (s.lastSyncStatus === "failed" || s.lastSyncStatus === "partial") {
        acc.failing += 1;
      }
      const ts = s.lastSyncedAt ? new Date(s.lastSyncedAt).getTime() : null;
      if (ts && (!acc.lastSyncedAt || ts > acc.lastSyncedAt)) {
        acc.lastSyncedAt = ts;
      }
      return acc;
    },
    { total: 0, active: 0, failing: 0, lastSyncedAt: null }
  );
}

function formatRelative(ms: number | null): string {
  if (!ms) return "Never";
  const diff = Date.now() - ms;
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)} hr ago`;
  return `${Math.round(diff / 86_400_000)} days ago`;
}

export function KnowledgeBasePage({ community }: Props) {
  const slug = community.details?.data?.slug ?? community.uid;
  const { hasAccess, isLoading: isCheckingAdmin } = useCommunityAdminAccess(community.uid);
  const sources = useKnowledgeSources(hasAccess ? slug : undefined);
  const [addOpen, setAddOpen] = useState(false);
  const [filter, setFilter] = useState("");

  const list = sources.data ?? [];
  const filtered = useMemo(() => {
    if (!filter.trim()) return list;
    const needle = filter.trim().toLowerCase();
    return list.filter(
      (s) => s.title.toLowerCase().includes(needle) || s.externalId.toLowerCase().includes(needle)
    );
  }, [list, filter]);
  const stats = useMemo(() => aggregate(list), [list]);

  if (isCheckingAdmin) {
    return (
      <PageFrame>
        <HeaderSkeleton />
      </PageFrame>
    );
  }

  if (!hasAccess) {
    return (
      <PageFrame>
        <AccessDeniedCard />
      </PageFrame>
    );
  }

  return (
    <PageFrame>
      <Masthead
        communityName={community.details?.data?.name ?? "this community"}
        showHeaderCta={list.length > 0}
        onAdd={() => setAddOpen(true)}
        stats={stats}
      />

      {sources.isLoading ? (
        <ListSkeleton />
      ) : sources.isError ? (
        <ErrorBlock
          message={sources.error instanceof Error ? sources.error.message : "Unknown error"}
          onRetry={() => sources.refetch()}
        />
      ) : list.length === 0 ? (
        <EmptyState onAdd={() => setAddOpen(true)} />
      ) : (
        <>
          <FilterBar
            value={filter}
            onChange={setFilter}
            visibleCount={filtered.length}
            totalCount={list.length}
          />
          {filtered.length === 0 ? (
            <NoMatchesState query={filter} onClear={() => setFilter("")} />
          ) : (
            <ul className="mt-4 divide-y divide-stone-200/70 overflow-hidden rounded-2xl border border-stone-200 bg-white dark:divide-zinc-800/80 dark:border-zinc-800 dark:bg-zinc-900/40">
              {filtered.map((s) => (
                <SourceRow key={s.id} source={s} communityIdOrSlug={slug} />
              ))}
            </ul>
          )}
        </>
      )}

      <AddSourceDialog communityIdOrSlug={slug} open={addOpen} onOpenChange={setAddOpen} />
    </PageFrame>
  );
}

// ── Frame ────────────────────────────────────────────────────────────────────

function PageFrame({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-6xl px-6 pb-16 pt-10">{children}</div>;
}

// ── Header / masthead ────────────────────────────────────────────────────────

function Masthead({
  communityName,
  showHeaderCta,
  onAdd,
  stats,
}: {
  communityName: string;
  showHeaderCta: boolean;
  onAdd: () => void;
  stats: Aggregates;
}) {
  return (
    <header className="mb-8">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-zinc-500">
        <span className="text-stone-400 dark:text-zinc-600">Karma</span>
        <span className="mx-1.5 text-stone-300 dark:text-zinc-700">/</span>
        Knowledge
      </p>

      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-[34px] font-semibold leading-[1.05] tracking-tight text-stone-900 dark:text-zinc-50 sm:text-[40px]">
            Knowledge base
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-stone-600 dark:text-zinc-400">
            Curate the documents your chatbot reads from for{" "}
            <span className="font-medium text-stone-900 dark:text-zinc-100">{communityName}</span>.
            Each source is fetched, chunked, and embedded automatically on the nightly sync.
          </p>
        </div>

        {showHeaderCta && (
          <Button
            type="button"
            onClick={onAdd}
            className="shrink-0 gap-1.5"
            aria-label="Add a knowledge source"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add source
          </Button>
        )}
      </div>

      <StatStrip stats={stats} />
    </header>
  );
}

function StatStrip({ stats }: { stats: Aggregates }) {
  if (stats.total === 0) return null;
  const inactive = stats.total - stats.active;
  const items = [
    {
      label: "Sources",
      value: stats.total.toString(),
      hint: "registered",
      tone: "neutral" as const,
    },
    {
      label: "Active",
      value: stats.active.toString(),
      hint: inactive > 0 ? `${inactive} paused` : "all running",
      tone: stats.active > 0 ? ("good" as const) : ("muted" as const),
    },
    {
      label: "Needs attention",
      value: stats.failing.toString(),
      hint: stats.failing === 1 ? "sync issue" : "sync issues",
      tone: stats.failing > 0 ? ("warn" as const) : ("good" as const),
    },
    {
      label: "Last sync",
      value: formatRelative(stats.lastSyncedAt),
      hint: stats.lastSyncedAt ? new Date(stats.lastSyncedAt).toLocaleString() : "no syncs yet",
      tone: "neutral" as const,
    },
  ];

  return (
    <dl className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-stone-200 bg-stone-200 dark:border-zinc-800 dark:bg-zinc-800 sm:grid-cols-4">
      {items.map((it) => (
        <div key={it.label} className="flex flex-col gap-1 bg-white px-5 py-4 dark:bg-zinc-900/60">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500 dark:text-zinc-500">
            {it.label}
          </dt>
          <dd
            className={`text-2xl font-semibold tabular-nums ${
              it.tone === "warn"
                ? "text-amber-600 dark:text-amber-400"
                : it.tone === "good"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-stone-900 dark:text-zinc-100"
            }`}
          >
            {it.value}
          </dd>
          <p className="truncate text-xs text-stone-500 dark:text-zinc-500" title={it.hint}>
            {it.hint}
          </p>
        </div>
      ))}
    </dl>
  );
}

// ── Filter bar ───────────────────────────────────────────────────────────────

function FilterBar({
  value,
  onChange,
  visibleCount,
  totalCount,
}: {
  value: string;
  onChange: (v: string) => void;
  visibleCount: number;
  totalCount: number;
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-3">
      <div className="relative min-w-[240px] flex-1">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 dark:text-zinc-500"
        />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Filter by title or URL"
          aria-label="Filter knowledge sources"
          className="h-10 w-full rounded-lg border border-stone-200 bg-white pl-10 pr-3 text-sm text-stone-900 placeholder-stone-400 transition focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300/60 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-600 dark:focus:ring-zinc-700/60"
        />
      </div>
      <p className="text-xs tabular-nums text-stone-500 dark:text-zinc-500">
        {visibleCount === totalCount
          ? `${totalCount} ${totalCount === 1 ? "source" : "sources"}`
          : `${visibleCount} of ${totalCount}`}
      </p>
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div
      className="relative mt-2 flex flex-col items-center overflow-hidden rounded-2xl border border-stone-200 bg-white px-8 py-16 text-center dark:border-zinc-800 dark:bg-zinc-900/40"
      style={{
        backgroundImage:
          "radial-gradient(circle at 1px 1px, rgba(120,113,108,0.18) 1px, transparent 0)",
        backgroundSize: "20px 20px",
      }}
    >
      {/* concentric rings around the icon */}
      <div className="relative flex h-28 w-28 items-center justify-center">
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full border border-stone-200 dark:border-zinc-800"
        />
        <span
          aria-hidden="true"
          className="absolute inset-3 rounded-full border border-stone-200 dark:border-zinc-800"
        />
        <span
          aria-hidden="true"
          className="absolute inset-6 rounded-full border border-stone-300/70 bg-white shadow-sm dark:border-zinc-700/70 dark:bg-zinc-900"
        />
        <Library
          aria-hidden="true"
          className="relative h-7 w-7 text-stone-700 dark:text-zinc-200"
          strokeWidth={1.6}
        />
      </div>

      <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500 dark:text-zinc-500">
        Empty shelf
      </p>
      <h2 className="mt-2 max-w-md text-xl font-semibold tracking-tight text-stone-900 dark:text-zinc-100">
        No knowledge sources yet
      </h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-stone-600 dark:text-zinc-400">
        Register a publicly-shared Google Doc or a PDF URL — Karma will fetch and index it for your
        chatbot to cite.
      </p>

      <Button
        type="button"
        onClick={onAdd}
        className="mt-6 gap-1.5"
        aria-label="Add your first knowledge source"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Add your first source
      </Button>

      <ul className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[11px] font-medium uppercase tracking-[0.14em] text-stone-400 dark:text-zinc-600">
        <li>· Google Docs</li>
        <li>· PDFs</li>
      </ul>
    </div>
  );
}

function NoMatchesState({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <div className="mt-4 flex flex-col items-center rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
      <Search aria-hidden="true" className="mb-3 h-5 w-5 text-stone-400 dark:text-zinc-600" />
      <p className="text-sm font-medium text-stone-900 dark:text-zinc-100">
        No matches for &ldquo;{query}&rdquo;
      </p>
      <button
        type="button"
        onClick={onClear}
        className="mt-3 text-xs font-medium text-stone-600 underline-offset-4 hover:underline dark:text-zinc-400"
      >
        Clear filter
      </button>
    </div>
  );
}

// ── Skeleton & error & access denied ─────────────────────────────────────────

function HeaderSkeleton() {
  return (
    <div className="mb-8 animate-pulse">
      <div className="mb-2 h-3 w-32 rounded bg-stone-200 dark:bg-zinc-800" />
      <div className="h-9 w-64 rounded bg-stone-200 dark:bg-zinc-800" />
      <div className="mt-3 h-4 w-full max-w-xl rounded bg-stone-200 dark:bg-zinc-800" />
      <div className="mt-7 grid h-[88px] grid-cols-4 gap-px overflow-hidden rounded-xl bg-stone-200 dark:bg-zinc-800">
        <div className="bg-white dark:bg-zinc-900/60" />
        <div className="bg-white dark:bg-zinc-900/60" />
        <div className="bg-white dark:bg-zinc-900/60" />
        <div className="bg-white dark:bg-zinc-900/60" />
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <ul
      aria-label="Loading knowledge sources"
      className="mt-4 divide-y divide-stone-200/70 overflow-hidden rounded-2xl border border-stone-200 bg-white dark:divide-zinc-800/80 dark:border-zinc-800 dark:bg-zinc-900/40"
    >
      {[0, 1, 2].map((i) => (
        <li key={i} className="flex items-center gap-4 px-5 py-5">
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-stone-200 dark:bg-zinc-800" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 animate-pulse rounded bg-stone-200 dark:bg-zinc-800" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-stone-200/70 dark:bg-zinc-800/70" />
          </div>
          <div className="hidden h-6 w-20 animate-pulse rounded-full bg-stone-200 dark:bg-zinc-800 sm:block" />
        </li>
      ))}
    </ul>
  );
}

function ErrorBlock({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mt-2 flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-900/15 dark:text-red-200 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold">Could not load knowledge sources</p>
        <p className="mt-0.5 text-red-700 dark:text-red-300/90">{message}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="shrink-0 self-start rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/70"
      >
        Retry
      </button>
    </div>
  );
}

function AccessDeniedCard() {
  return (
    <div className="mx-auto mt-12 max-w-lg rounded-2xl border border-stone-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
      <Sparkles
        aria-hidden="true"
        className="mx-auto mb-3 h-6 w-6 text-stone-400 dark:text-zinc-600"
      />
      <h2 className="text-lg font-semibold text-stone-900 dark:text-zinc-100">Admin only</h2>
      <p className="mt-2 text-sm text-stone-600 dark:text-zinc-400">
        Only community admins can manage knowledge sources. Ask a community admin if you need
        access.
      </p>
    </div>
  );
}
