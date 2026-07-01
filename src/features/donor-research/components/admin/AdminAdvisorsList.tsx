"use client";

import { ChevronDown, Eye, Mail, RefreshCw, Search, Share2 } from "lucide-react";
import { useQueryState } from "nuqs";
import pluralize from "pluralize";
import { memo, useMemo, useState } from "react";
import TablePagination from "@/components/Utilities/TablePagination";
import { Skeleton } from "@/components/ui/skeleton";
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

  const search = q.trim();
  const { data, isLoading, isError, refetch, isFetching } = useAdminAdvisors({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
  });

  // Filter + sort are applied to the loaded page (server handles search +
  // pagination). At beta scale advisors fit on one page, so this matches the
  // single-view design; revisit if the population outgrows a page.
  const visible = useMemo(() => {
    const items = data?.items ?? [];
    const filtered =
      filter === "shared"
        ? items.filter((a) => a.donors.some((d) => d.reports.some((r) => r.hasShareToken)))
        : items;
    const sorted = [...filtered];
    if (sort === "name")
      sorted.sort((a, b) => (a.name || a.displayName).localeCompare(b.name || b.displayName));
    if (sort === "reports") sorted.sort((a, b) => b.reportCount - a.reportCount);
    return sorted;
  }, [data?.items, filter, sort]);

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
      </div>

      {isLoading ? <AdvisorsSkeleton /> : null}

      {isError ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">
            We couldn&apos;t load the advisors. Please try again.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
        </div>
      ) : null}

      {!isLoading && !isError && data ? (
        visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-16 text-center">
            <p className="text-sm font-semibold text-foreground">No advisors match your search</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Try a different wallet, email, name, or donor.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-3.5 flex items-center justify-between">
              <p className="text-sm text-muted-foreground" aria-live="polite">
                <span className="font-semibold text-foreground">{visible.length}</span>{" "}
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
  const cards = [
    { label: "Advisors", value: stats.advisors, hint: `${stats.betaAdvisors} in beta` },
    { label: "Donors tracked", value: stats.donors, hint: "across all advisors" },
    {
      label: "Reports generated",
      value: stats.reports,
      hint: `${stats.completedReports} completed`,
    },
    {
      label: "Shared reports",
      value: stats.sharedReports,
      hint: "visible to donors",
      accent: true,
    },
  ];
  return (
    <section className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="text-xs font-medium text-muted-foreground">{c.label}</div>
          <div
            className={`mt-1.5 text-2xl font-semibold tracking-tight ${
              c.accent ? "text-indigo-500 dark:text-indigo-400" : "text-foreground"
            }`}
          >
            {c.value}
          </div>
          <div className="text-xs text-muted-foreground">{c.hint}</div>
        </div>
      ))}
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
    <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
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
            <span className="truncate text-base font-semibold text-foreground" title={name}>
              {name}
            </span>
            {advisor.rateLimitTier === "beta" ? (
              <span className="flex-shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Beta
              </span>
            ) : null}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex min-w-0 items-center gap-1.5 text-foreground/80">
              <Mail className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
              <span className="truncate">{advisor.email || "No email on file"}</span>
            </span>
            {advisor.orgName ? (
              <>
                <span aria-hidden>·</span>
                <span className="truncate text-foreground/80">{advisor.orgName}</span>
              </>
            ) : null}
            <span aria-hidden>·</span>
            <span
              className="rounded-md bg-muted px-2 py-0.5 font-mono text-[11px]"
              title={advisor.walletAddress}
            >
              {truncateAddress(advisor.walletAddress)}
            </span>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-5">
          <StatColumn value={advisor.donorCount} label="donors" />
          <StatColumn value={advisor.reportCount} label="reports" />
          <div className="hidden h-8 w-px bg-border sm:block" />
          <div className="hidden text-right sm:block">
            <div className="text-xs text-foreground/80">{formatDate(advisor.createdAt)}</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">joined</div>
          </div>
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-border px-5 pb-5 pt-1">
          <div className="mb-2.5 mt-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {advisor.donorCount} {pluralize("donor", advisor.donorCount)}
          </div>
          {advisor.donors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No donors yet.</p>
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
      <div className="text-[15px] font-semibold leading-none text-foreground">{value}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

const DonorCard = memo(function DonorCard({ donor }: { donor: AdminAdvisorDonor }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-muted/40">
      <div className="flex items-center gap-2.5 px-3.5 py-2.5">
        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border border-border bg-background text-[11px] font-semibold text-foreground/80">
          {initials(donor.opaqueLabel).slice(0, 1)}
        </div>
        <span className="truncate text-sm font-semibold text-foreground" title={donor.opaqueLabel}>
          {donor.opaqueLabel}
        </span>
        {donor.reportCount > 0 ? (
          <span className="flex-shrink-0 text-xs text-muted-foreground">
            {donor.reportCount} {pluralize("report", donor.reportCount)}
          </span>
        ) : null}
      </div>
      {donor.reports.length === 0 ? (
        <div className="px-3.5 pb-3 pl-12 text-xs italic text-muted-foreground">
          No reports yet.
        </div>
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
    <div className="flex items-center gap-3 border-t border-border px-3.5 py-2.5">
      <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${status.dot}`} />
      <span
        className={`inline-flex h-5 flex-shrink-0 items-center rounded-md px-2 text-[11px] font-semibold ${
          isDeep ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
        }`}
      >
        {isDeep ? "Deep" : "Fast"}
      </span>
      <span className="text-[13px] text-foreground/80">{status.label}</span>
      <div className="flex-1" />
      {report.hasShareToken ? (
        <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
          <Share2 className="h-2.5 w-2.5" />
          Shared
        </span>
      ) : null}
      <span className="flex-shrink-0 text-right text-xs text-muted-foreground">
        {formatDate(report.createdAt)}
      </span>
      <Link
        href={PAGES.DONOR_RESEARCH.ADMIN_REPORT(report.id)}
        className="inline-flex h-7 flex-shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground/80 transition-colors hover:border-primary hover:text-primary"
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
        <div key={i} className="rounded-2xl border border-border bg-card p-5">
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
