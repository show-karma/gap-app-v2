"use client";

import { ChevronDown, Eye, Mail, RefreshCw, Search, Share2 } from "lucide-react";
import { useQueryState } from "nuqs";
import pluralize from "pluralize";
import { memo, useMemo, useState } from "react";
import { StatTiles } from "@/components/Pages/Dashboard/v3/primitives";
import TablePagination from "@/components/Utilities/TablePagination";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/use-debounce";
import { useAdminAdvisors } from "@/hooks/useAdminDonorResearch";
import { Link } from "@/src/components/navigation/Link";
import type {
  AdminAdvisor,
  AdminAdvisorDonor,
  AdminAdvisorReportSummary,
  AdminAdvisorStats,
} from "@/types/donor-research";
import { PAGES } from "@/utilities/pages";

const PAGE_SIZE = 20;
type SortKey = "recent" | "name" | "reports";
type FilterKey = "all" | "shared";

// Deterministic avatar gradient per advisor — Tailwind classes only (no
// hardcoded hex), picked by a stable hash of the id.
const AVATAR_GRADIENTS = [
  "from-emerald-500 to-teal-700",
  "from-sky-500 to-indigo-700",
  "from-violet-500 to-fuchsia-700",
  "from-amber-500 to-orange-700",
  "from-rose-500 to-pink-700",
  "from-cyan-500 to-blue-700",
];

function hashIndex(id: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h) % mod;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function truncateAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}

function reportStatusMeta(status: string): { dot: string; label: string } {
  if (status === "complete" || status === "fast_complete")
    return { dot: "bg-emerald-500", label: "Complete" };
  if (status === "failed") return { dot: "bg-red-500", label: "Failed" };
  if (status === "pending") return { dot: "bg-muted-foreground", label: "Queued" };
  return { dot: "bg-amber-500", label: "Running" };
}

export function AdminAdvisorsList() {
  const [page, setPage] = useQueryState("page", {
    defaultValue: 1,
    clearOnDefault: true,
    parse: (value) => {
      const parsed = Number.parseInt(value, 10);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    },
    serialize: (value) => String(value),
  });
  const [q, setQ] = useQueryState("q", {
    defaultValue: "",
    clearOnDefault: true,
    throttleMs: 300,
  });
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("recent");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Debounce the value that drives the query key: nuqs `throttleMs` only rate-limits
  // the URL write, so `q` still changes on every keystroke and would refetch each time.
  const search = useDebounce(q.trim(), 300);
  const { data, isLoading, isError, refetch, isFetching } = useAdminAdvisors({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
  });

  // The server owns search + pagination; client-side filter/sort only make
  // sense when the whole result set is on one page. Across multiple pages they
  // would operate on a 20-row slice and desync the count + pager, so they're
  // only applied (and shown) while everything fits on a single page.
  const singlePage = (data?.total ?? 0) <= PAGE_SIZE;
  const visible = useMemo(() => {
    const items = data?.items ?? [];
    if (!singlePage) return items;
    const filtered =
      filter === "shared"
        ? items.filter((a) => a.donors.some((d) => d.reports.some((r) => r.hasShareToken)))
        : items;
    const sorted = [...filtered];
    if (sort === "name")
      sorted.sort((a, b) => (a.name || a.displayName).localeCompare(b.name || b.displayName));
    if (sort === "reports") sorted.sort((a, b) => b.reportCount - a.reportCount);
    return sorted;
  }, [data?.items, filter, sort, singlePage]);

  const allExpanded = visible.length > 0 && visible.every((a) => expanded[a.id]);
  const toggleAll = () => {
    const next: Record<string, boolean> = { ...expanded };
    for (const a of visible) next[a.id] = !allExpanded;
    setExpanded(next);
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-7">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Nonprofit research
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
          Donor advisors
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Every donor advisor, the donors they manage, and the reports they&apos;ve generated. Open
          any report to see exactly what the advisor sees.
        </p>
      </header>

      {data?.stats ? <StatCards stats={data.stats} /> : null}

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative flex min-w-[260px] flex-1 items-center">
          <Search className="absolute left-3.5 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            placeholder="Search by wallet, email, name, org, or donor…"
            aria-label="Search advisors"
            className="h-11 w-full rounded-xl border border-border bg-background pr-3 pl-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        {singlePage ? (
          <>
            <div className="inline-flex gap-1 rounded-xl bg-muted p-1">
              {(["all", "shared"] as const).map((key) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`h-9 rounded-lg px-4 text-sm font-medium capitalize transition-colors ${
                    filter === key
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label="Sort advisors"
              className="h-11 rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground focus:border-primary focus:outline-none"
            >
              <option value="recent">Recently joined</option>
              <option value="name">Name (A–Z)</option>
              <option value="reports">Most reports</option>
            </select>
          </>
        ) : null}
      </div>

      {isLoading ? <AdvisorsSkeleton /> : null}

      {isError ? (
        <div className="flex flex-col items-center gap-4 rounded-sf-card border border-sf-line p-10 text-center">
          <p className="text-sm text-sf-muted">
            We couldn&apos;t load the advisors. Please try again.
          </p>
          <Button type="button" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        </div>
      ) : null}

      {!isLoading && !isError && data ? (
        visible.length === 0 ? (
          <div className="rounded-sf-card border border-dashed border-sf-line-strong p-16 text-center">
            <p className="text-sm font-semibold text-sf-heading">No advisors match your search</p>
            <p className="mt-1.5 text-sm text-sf-muted">
              Try a different wallet, email, name, or donor.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-3.5 flex items-center justify-between">
              <p className="text-sm text-sf-muted" aria-live="polite">
                <span className="font-semibold text-sf-heading">{visible.length}</span>{" "}
                {pluralize("advisor", visible.length)}
                {isFetching ? " · refreshing…" : ""}
              </p>
              <button
                type="button"
                onClick={toggleAll}
                className="px-1.5 py-1 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                {allExpanded ? "Collapse all" : "Expand all"}
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {visible.map((advisor) => (
                <AdvisorCard
                  key={advisor.id}
                  advisor={advisor}
                  expanded={!!expanded[advisor.id]}
                  onToggle={() => setExpanded((s) => ({ ...s, [advisor.id]: !s[advisor.id] }))}
                />
              ))}
            </div>
            {data.total > PAGE_SIZE ? (
              <div className="mt-6">
                <TablePagination
                  currentPage={page}
                  setCurrentPage={setPage}
                  totalPosts={data.total}
                  postsPerPage={PAGE_SIZE}
                />
              </div>
            ) : null}
          </>
        )
      ) : null}
    </div>
  );
}

function StatCards({ stats }: { stats: AdminAdvisorStats }) {
  return (
    <section className="mb-7">
      <StatTiles
        items={[
          { n: stats.advisors, l: `Advisors · ${stats.betaAdvisors} in beta` },
          { n: stats.donors, l: "Donors tracked" },
          { n: stats.reports, l: `Reports · ${stats.completedReports} completed` },
          { n: stats.sharedReports, l: "Shared with donors", tone: "brand" },
        ]}
      />
    </section>
  );
}

const AdvisorCard = memo(function AdvisorCard({
  advisor,
  expanded,
  onToggle,
}: {
  advisor: AdminAdvisor;
  expanded: boolean;
  onToggle: () => void;
}) {
  const name = advisor.name || advisor.displayName;
  const gradient = AVATAR_GRADIENTS[hashIndex(advisor.id, AVATAR_GRADIENTS.length)];
  return (
    <article className="overflow-hidden rounded-sf-card border border-sf-line bg-sf-card shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center gap-4 px-5 py-4 text-left"
      >
        <div
          className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-sm font-semibold text-white`}
        >
          {initials(name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-base font-semibold text-sf-heading" title={name}>
              {name}
            </span>
            {advisor.rateLimitTier === "beta" ? (
              <span className="flex-shrink-0 rounded-full bg-sf-chip px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-sf-muted">
                Beta
              </span>
            ) : null}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-sf-muted">
            <span className="inline-flex min-w-0 items-center gap-1.5 text-sf-heading/80">
              <Mail className="h-3.5 w-3.5 flex-shrink-0 text-sf-muted" />
              <span className="truncate">{advisor.email || "No email on file"}</span>
            </span>
            {advisor.orgName ? (
              <>
                <span aria-hidden>·</span>
                <span className="truncate text-sf-heading/80">{advisor.orgName}</span>
              </>
            ) : null}
            <span aria-hidden>·</span>
            <span
              className="rounded-md bg-sf-chip px-2 py-0.5 font-mono text-[11px]"
              title={advisor.walletAddress}
            >
              {truncateAddress(advisor.walletAddress)}
            </span>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-5">
          <StatColumn value={advisor.donorCount} label="donors" />
          <StatColumn value={advisor.reportCount} label="reports" />
          <div className="hidden h-8 w-px bg-sf-line sm:block" />
          <div className="hidden text-right sm:block">
            <div className="text-xs text-sf-heading/80">{formatDate(advisor.createdAt)}</div>
            <div className="mt-0.5 text-[11px] text-sf-muted">joined</div>
          </div>
          <ChevronDown
            className={`h-4 w-4 text-sf-muted transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-sf-line px-5 pb-5 pt-1">
          <div className="mb-2.5 mt-4 text-[11px] font-semibold uppercase tracking-wider text-sf-muted">
            {advisor.donorCount} {pluralize("donor", advisor.donorCount)}
          </div>
          {advisor.donors.length === 0 ? (
            <p className="text-sm text-sf-muted">No donors yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {advisor.donors.map((donor) => (
                <DonorCard key={donor.handleId} donor={donor} />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </article>
  );
});

function StatColumn({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-right">
      <div className="text-[15px] font-semibold leading-none text-sf-heading">{value}</div>
      <div className="mt-1 text-[11px] text-sf-muted">{label}</div>
    </div>
  );
}

const DonorCard = memo(function DonorCard({ donor }: { donor: AdminAdvisorDonor }) {
  return (
    <div className="overflow-hidden rounded-xl border border-sf-line bg-sf-elev">
      <div className="flex items-center gap-2.5 px-3.5 py-2.5">
        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border border-sf-line bg-sf-card text-[11px] font-semibold text-sf-heading/80">
          {initials(donor.opaqueLabel).slice(0, 1)}
        </div>
        <span className="truncate text-sm font-semibold text-sf-heading" title={donor.opaqueLabel}>
          {donor.opaqueLabel}
        </span>
        {donor.reportCount > 0 ? (
          <span className="flex-shrink-0 text-xs text-sf-muted">
            {donor.reportCount} {pluralize("report", donor.reportCount)}
          </span>
        ) : null}
      </div>
      {donor.reports.length === 0 ? (
        <div className="px-3.5 pb-3 pl-12 text-xs italic text-sf-muted">No reports yet.</div>
      ) : (
        <div className="flex flex-col">
          {donor.reports.map((report) => (
            <ReportRow key={report.id} report={report} />
          ))}
        </div>
      )}
    </div>
  );
});

const ReportRow = memo(function ReportRow({ report }: { report: AdminAdvisorReportSummary }) {
  const status = reportStatusMeta(report.status);
  const isDeep = report.mode === "deep";
  return (
    <div className="flex items-center gap-3 border-t border-sf-line px-3.5 py-2.5">
      <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${status.dot}`} />
      <span
        className={`inline-flex h-5 flex-shrink-0 items-center rounded-md px-2 text-[11px] font-semibold ${
          isDeep ? "bg-sf-chip text-sf-muted" : "bg-primary/10 text-primary"
        }`}
      >
        {isDeep ? "Deep" : "Fast"}
      </span>
      <span className="text-[13px] text-sf-heading/80">{status.label}</span>
      <div className="flex-1" />
      {report.hasShareToken ? (
        <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
          <Share2 className="h-2.5 w-2.5" />
          Shared
        </span>
      ) : null}
      <span className="flex-shrink-0 text-right text-xs text-sf-muted">
        {formatDate(report.createdAt)}
      </span>
      <Link
        href={PAGES.DONOR_RESEARCH.REPORT(report.id)}
        className="inline-flex h-7 flex-shrink-0 items-center gap-1.5 rounded-lg border border-sf-line bg-sf-card px-3 text-xs font-medium text-sf-heading/80 transition-colors hover:border-primary hover:text-primary"
      >
        <Eye className="h-3 w-3" />
        View
      </Link>
    </div>
  );
});

function AdvisorsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-sf-card border border-sf-line bg-sf-card p-5">
          <div className="flex items-center gap-4">
            <Skeleton className="h-11 w-11 rounded-xl" />
            <div className="flex-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="mt-2 h-3 w-64" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
