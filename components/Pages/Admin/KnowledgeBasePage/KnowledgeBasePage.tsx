"use client";

import { AlertCircle, FileBadge, FileText, Globe, Plus, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { AddSourceDialog } from "@/components/Pages/Admin/KnowledgeBasePage/AddSourceDialog";
import { SourceRow } from "@/components/Pages/Admin/KnowledgeBasePage/SourceRow";
import { Button } from "@/components/Utilities/Button";
import { useCommunityAdminAccess } from "@/hooks/communities/useCommunityAdminAccess";
import { useKnowledgeSources } from "@/hooks/knowledge-base/useKnowledgeSources";
import type { Community } from "@/types/v2/community";
import type { KnowledgeSource, KnowledgeSourceKind } from "@/types/v2/knowledge-base";

interface Props {
  community: Community;
}

// The masthead's right-rail "Last sync" pill is a single rolled-up signal
// that matches the topbar pill in the design — much lighter than the
// previous 4-up stat strip while still surfacing the most actionable number.
function lastSyncedAt(list: KnowledgeSource[]): number | null {
  let max: number | null = null;
  for (const s of list) {
    if (!s.lastSyncedAt) continue;
    const ts = new Date(s.lastSyncedAt).getTime();
    if (!max || ts > max) max = ts;
  }
  return max;
}

function failingCount(list: KnowledgeSource[]): number {
  return list.reduce(
    (n, s) => (s.lastSyncStatus === "failed" || s.lastSyncStatus === "partial" ? n + 1 : n),
    0
  );
}

function formatRelative(ms: number | null): string {
  if (!ms) return "Never";
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  return `${Math.round(diff / 86_400_000)}d ago`;
}

export function KnowledgeBasePage({ community }: Props) {
  const slug = community.details?.slug ?? community.uid;
  const { hasAccess, isLoading: isCheckingAdmin } = useCommunityAdminAccess(community.uid);
  const sources = useKnowledgeSources(hasAccess ? slug : undefined);
  const [addOpen, setAddOpen] = useState(false);
  const [addKind, setAddKind] = useState<KnowledgeSourceKind | undefined>();
  const [filter, setFilter] = useState("");

  // Open the dialog without a pre-selected kind (clears any prior quick-pick).
  const openAdd = () => {
    setAddKind(undefined);
    setAddOpen(true);
  };
  // Open the dialog with a specific kind pre-selected (from a quick-pick tile).
  const openAddWithKind = (k: KnowledgeSourceKind) => {
    setAddKind(k);
    setAddOpen(true);
  };

  const list = sources.data ?? [];
  const filtered = useMemo(() => {
    if (!filter.trim()) return list;
    const needle = filter.trim().toLowerCase();
    return list.filter(
      (s) => s.title.toLowerCase().includes(needle) || s.externalId.toLowerCase().includes(needle)
    );
  }, [list, filter]);
  const lastSync = useMemo(() => lastSyncedAt(list), [list]);
  const failing = useMemo(() => failingCount(list), [list]);

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
        communityName={community.details?.name ?? "this community"}
        showHeaderCta={list.length > 0}
        onAdd={openAdd}
        lastSyncedAt={lastSync}
        failing={failing}
      />

      {sources.isLoading ? (
        <ListSkeleton />
      ) : sources.isError ? (
        <ErrorBlock
          message={sources.error instanceof Error ? sources.error.message : "Unknown error"}
          onRetry={() => sources.refetch()}
        />
      ) : list.length === 0 ? (
        <EmptyState onAdd={openAdd} onAddWithKind={openAddWithKind} />
      ) : (
        <>
          {failing > 0 && <FailureBanner sources={list} />}
          <FilterBar
            value={filter}
            onChange={setFilter}
            visibleCount={filtered.length}
            totalCount={list.length}
          />
          {filtered.length === 0 ? (
            <NoMatchesState query={filter} onClear={() => setFilter("")} />
          ) : (
            <ul className="overflow-hidden rounded-xl border border-stone-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40">
              {filtered.map((s, i) => (
                <SourceRow key={s.id} source={s} communityIdOrSlug={slug} isFirst={i === 0} />
              ))}
            </ul>
          )}
        </>
      )}

      <AddSourceDialog
        communityIdOrSlug={slug}
        open={addOpen}
        onOpenChange={setAddOpen}
        initialKind={addKind}
      />
    </PageFrame>
  );
}

// ── Frame ────────────────────────────────────────────────────────────────────

function PageFrame({ children }: { children: React.ReactNode }) {
  // 1240px max-width matches the design's `.page` token.
  return <div className="mx-auto w-full max-w-[1240px] px-6 pb-24 pt-7 sm:px-12">{children}</div>;
}

// ── Header / masthead ────────────────────────────────────────────────────────

function Masthead({
  communityName,
  showHeaderCta,
  onAdd,
  lastSyncedAt,
  failing,
}: {
  communityName: string;
  showHeaderCta: boolean;
  onAdd: () => void;
  lastSyncedAt: number | null;
  failing: number;
}) {
  return (
    <header className="mb-6">
      <div className="grid grid-cols-1 items-end gap-x-6 gap-y-4 sm:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <h1 className="text-[26px] font-semibold leading-[1.2] tracking-[-0.02em] text-stone-900 dark:text-zinc-50">
            Knowledge base
          </h1>
          <p className="mt-1.5 max-w-[68ch] text-sm leading-relaxed text-stone-600 dark:text-zinc-400">
            Documents the{" "}
            <span className="font-medium text-stone-900 dark:text-zinc-100">{communityName}</span>{" "}
            assistant reads from. Each source is fetched, chunked, and embedded on the nightly sync
            at <code className="font-mono text-[12px] text-stone-700 dark:text-zinc-300">02:00</code>{" "}
            UTC.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:justify-end">
          <SyncPill lastSyncedAt={lastSyncedAt} failing={failing} />
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
      </div>
    </header>
  );
}

// Pill mirrors the design's topbar `Last sync · 2h ago` chip — a single
// rolled-up signal rather than a 4-up strip. We surface failures here too,
// so admins still get an at-a-glance "needs attention" cue.
function SyncPill({ lastSyncedAt, failing }: { lastSyncedAt: number | null; failing: number }) {
  if (failing > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11.5px] font-medium text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        {failing === 1 ? "1 sync issue" : `${failing} sync issues`}
      </span>
    );
  }
  if (!lastSyncedAt) {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-[11.5px] font-medium text-stone-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full bg-stone-400 dark:bg-zinc-500"
        />
        No syncs yet
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11.5px] font-medium text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      Last sync · {formatRelative(lastSyncedAt)}
    </span>
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
    <div className="mb-4 flex flex-wrap items-center gap-2.5">
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
          className="h-9 w-full rounded-md border border-stone-200 bg-white pl-9 pr-3 text-[13px] text-stone-900 placeholder-stone-400 transition focus:border-sky-500 focus:outline-none focus:ring-[3px] focus:ring-sky-500/20 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-sky-400 dark:focus:ring-sky-400/20"
        />
      </div>
      <span className="px-1 font-mono text-[11px] tabular-nums text-stone-500 dark:text-zinc-500">
        {visibleCount === totalCount
          ? `${totalCount} ${totalCount === 1 ? "source" : "sources"}`
          : `${visibleCount} of ${totalCount}`}
      </span>
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────
//
// Mirrors the design: a soft gradient tile with two concentric dashed rings
// orbiting a single illustrative glyph, followed by short copy, a primary
// CTA, and a row of quick-pick tiles. Quick-picks only surface the kinds we
// expose today (gdrive_file + pdf_url) — see KIND_OPTIONS in
// AddSourceDialog for the canonical list.
const QUICK_PICKS: Array<{
  kind: KnowledgeSourceKind;
  label: string;
  Icon: typeof FileText;
  fg: string;
}> = [
  {
    kind: "gdrive_file",
    label: "Google Doc",
    Icon: FileText,
    fg: "text-emerald-600 dark:text-emerald-400",
  },
  {
    kind: "url",
    label: "Web page",
    Icon: Globe,
    fg: "text-sky-600 dark:text-sky-400",
  },
  {
    kind: "pdf_url",
    label: "PDF URL",
    Icon: FileBadge,
    fg: "text-rose-600 dark:text-rose-400",
  },
];

function EmptyState({
  onAdd,
  onAddWithKind,
}: {
  onAdd: () => void;
  onAddWithKind: (kind: KnowledgeSourceKind) => void;
}) {
  return (
    <div className="mt-2 flex flex-col items-center rounded-xl border border-dashed border-stone-300 bg-white px-6 py-14 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
      {/* Gradient illo with two concentric dashed orbits */}
      <div className="relative">
        <span
          aria-hidden="true"
          className="absolute -inset-2 rounded-[22px] border border-dashed border-sky-300/40 dark:border-sky-400/30"
        />
        <span
          aria-hidden="true"
          className="absolute -inset-4 rounded-[28px] border border-dashed border-sky-300/20 dark:border-sky-400/15"
        />
        <div className="relative flex h-[72px] w-[72px] items-center justify-center rounded-2xl border border-stone-200 bg-gradient-to-br from-sky-50 to-stone-50 text-sky-700 dark:border-zinc-800 dark:from-sky-950/50 dark:to-zinc-900 dark:text-sky-300">
          <FileText aria-hidden="true" className="h-7 w-7" strokeWidth={1.75} />
        </div>
      </div>

      <h2 className="mt-5 text-[17px] font-semibold tracking-[-0.01em] text-stone-900 dark:text-zinc-100">
        No sources yet
      </h2>
      <p className="mx-auto mt-1.5 max-w-[44ch] text-sm leading-relaxed text-stone-600 dark:text-zinc-400">
        Add a publicly-shared Google Doc, a web page, or a PDF URL and your chatbot will start
        answering questions from it on the next nightly sync.
      </p>

      <Button
        type="button"
        onClick={onAdd}
        className="mt-5 gap-1.5"
        aria-label="Add your first knowledge source"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Add your first source
      </Button>

      <ul
        className="mt-6 grid w-full max-w-[480px] grid-cols-2 gap-2.5"
        aria-label="Suggested source kinds"
      >
        {QUICK_PICKS.map((p) => (
          <li key={p.kind}>
            <button
              type="button"
              onClick={() => onAddWithKind(p.kind)}
              className="group flex w-full flex-col items-center gap-2 rounded-md border border-stone-200 bg-stone-50 px-3 py-3.5 transition hover:border-sky-400 hover:bg-white active:translate-y-[0.5px] dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:border-sky-400 dark:hover:bg-zinc-900"
              aria-label={`Add a ${p.label} source`}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-md border border-stone-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                <p.Icon aria-hidden="true" className={`h-4 w-4 ${p.fg}`} strokeWidth={1.75} />
              </span>
              <span className="text-[12.5px] font-medium text-stone-900 dark:text-zinc-100">
                {p.label}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Page-level grouped failure banner. Replaces the previous per-row red
// excerpt with a single rolled-up signal up top — the row tint plus the
// "Failed" entry in each row's mono meta strip carry the per-row context.
// When all failed sources share the same error message we show that
// message verbatim; otherwise we show a count and prompt the admin to
// expand the rows.
function FailureBanner({ sources }: { sources: KnowledgeSource[] }) {
  const failed = sources.filter(
    (s) => s.lastSyncStatus === "failed" || s.lastSyncStatus === "partial"
  );
  if (failed.length === 0) return null;

  const errors = Array.from(
    new Set(failed.map((s) => s.lastSyncError ?? "Unknown error"))
  );
  const sharedReason = errors.length === 1 ? errors[0] : null;
  const noun = failed.length === 1 ? "source is" : "sources are";

  return (
    <div
      role="status"
      className="mb-4 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/70 px-4 py-3 dark:border-rose-900/50 dark:bg-rose-950/25"
    >
      <AlertCircle
        aria-hidden="true"
        className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400"
        strokeWidth={1.75}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-rose-900 dark:text-rose-200">
          {failed.length} {noun} failing
          {sharedReason ? ` — ${sharedReason}` : ""}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-rose-800/85 dark:text-rose-300/90">
          {sharedReason
            ? "All affected rows share the same error. The next sync will retry."
            : "Hover the row's error tag to read the full message. The next sync will retry."}
        </p>
      </div>
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
    <div className="mb-6 animate-pulse">
      <div className="h-3 w-32 rounded bg-stone-200 dark:bg-zinc-800" />
      <div className="mt-2 h-7 w-64 rounded bg-stone-200 dark:bg-zinc-800" />
      <div className="mt-2 h-4 w-full max-w-xl rounded bg-stone-200 dark:bg-zinc-800" />
    </div>
  );
}

function ListSkeleton() {
  return (
    <ul
      aria-label="Loading knowledge sources"
      className="overflow-hidden rounded-xl border border-stone-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40"
    >
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className={`flex items-center gap-3.5 px-4 py-3.5 ${
            i > 0 ? "border-t border-stone-200 dark:border-zinc-800" : ""
          }`}
        >
          <div className="h-8 w-8 shrink-0 animate-pulse rounded-md bg-stone-200 dark:bg-zinc-800" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-1/3 animate-pulse rounded bg-stone-200 dark:bg-zinc-800" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-stone-200/70 dark:bg-zinc-800/70" />
          </div>
          <div className="hidden h-5 w-20 animate-pulse rounded-full bg-stone-200 dark:bg-zinc-800 sm:block" />
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
