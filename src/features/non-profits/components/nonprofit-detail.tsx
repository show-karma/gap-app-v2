"use client";

/**
 * Nonprofit detail page component — ported from
 * grant-atlas src/features/grant-atlas/components/nonprofit-detail.tsx.
 *
 * Key adaptations:
 * - TanStack Router `Link` → Next.js `Link`
 * - PAGES.* → NON_PROFITS_PAGES.*
 * - ~/... → @/...
 * - Sort state is client-local `useState`
 * - searchId read via useSearchParams
 * - `useQueries` stays (it's from @tanstack/react-query, unchanged)
 * - Foundation concentration panel uses pluralize
 */

import "@/src/features/non-profits/styles/non-profits-detail.css";

import { useQueries } from "@tanstack/react-query";
import { Building2, DollarSign, HandCoins, Heart, MapPin, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import pluralize from "pluralize";
import React, { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { NON_PROFITS_PAGES } from "@/utilities/pages";
import { foundationKeys } from "../hooks/use-foundation";
import { useGrant } from "../hooks/use-grant";
import { useNonprofit, useNonprofitGrants } from "../hooks/use-nonprofit";
import { resultToPromise } from "../lib/result-to-promise";
import { formatCurrency } from "../lib/utils";
import { philanthropyService } from "../services/philanthropy.service";
import type { Grant } from "../types/philanthropy";
import { EntityNotFound } from "./entity-not-found";
import { type BreadcrumbItem, PageBreadcrumbs } from "./page-breadcrumbs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SortField = "amount" | "year" | "foundation" | "purpose";
type SortDir = "asc" | "desc";

interface SortState {
  field: SortField;
  dir: SortDir;
}

// ---------------------------------------------------------------------------
// KPI mini-card
// ---------------------------------------------------------------------------

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}

const KpiCard = React.memo(function KpiCard({ icon, label, value, accent = false }: KpiCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800">
      <div className="flex items-center gap-2">
        <span className="text-zinc-400 dark:text-zinc-500">{icon}</span>
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {label}
        </span>
      </div>
      <span
        className={
          accent
            ? "text-2xl font-bold text-brand-600 dark:text-brand-400"
            : "text-2xl font-bold text-zinc-900 dark:text-zinc-100"
        }
      >
        {value}
      </span>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Sort button helper
// ---------------------------------------------------------------------------

interface SortButtonProps {
  label: string;
  field: SortField;
  sort: SortState;
  onSort: (field: SortField) => void;
}

const SortButton = React.memo(function SortButton({ label, field, sort, onSort }: SortButtonProps) {
  const active = sort.field === field;
  const arrow = active ? (sort.dir === "asc" ? " ↑" : " ↓") : "";
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={
        "select-none whitespace-nowrap text-xs font-medium uppercase tracking-wide transition-colors " +
        (active
          ? "text-brand-600 dark:text-brand-400"
          : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200")
      }
      aria-label={`Sort by ${label}${active ? (sort.dir === "asc" ? ", ascending" : ", descending") : ""}`}
    >
      {label}
      {arrow}
    </button>
  );
});

// ---------------------------------------------------------------------------
// Grants table with inline proportional bars
// ---------------------------------------------------------------------------

interface GrantsTableProps {
  grants: Grant[];
  searchId?: string;
  foundationNames: Record<string, string>;
  sort: SortState;
  onSort: (field: SortField) => void;
}

const GrantsTable = React.memo(function GrantsTable({
  grants,
  searchId,
  foundationNames,
  sort,
  onSort,
}: GrantsTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sorted = [...grants].sort((a, b) => {
    let cmp = 0;
    if (sort.field === "amount") {
      cmp = (a.amount ?? 0) - (b.amount ?? 0);
    } else if (sort.field === "year") {
      cmp = a.filingYear - b.filingYear;
    } else if (sort.field === "foundation") {
      const nameA = foundationNames[a.foundationId] ?? a.foundationId;
      const nameB = foundationNames[b.foundationId] ?? b.foundationId;
      cmp = nameA.localeCompare(nameB);
    } else if (sort.field === "purpose") {
      cmp = (a.purposeText ?? "").localeCompare(b.purposeText ?? "");
    }
    return sort.dir === "asc" ? cmp : -cmp;
  });

  const maxAmount = Math.max(...grants.map((g) => g.amount ?? 0), 1);
  const totalAmount = grants.reduce((sum, g) => sum + (g.amount ?? 0), 0);

  if (grants.length === 0) {
    return <p className="text-sm text-zinc-500">No grants received.</p>;
  }

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="py-3 pl-4 pr-2 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">
                #
              </th>
              <th className="py-3 pr-3 text-left">
                <SortButton label="Foundation" field="foundation" sort={sort} onSort={onSort} />
              </th>
              <th className="py-3 pr-3 text-left">
                <SortButton label="Purpose" field="purpose" sort={sort} onSort={onSort} />
              </th>
              <th className="py-3 pr-3 text-left">
                <SortButton label="Year" field="year" sort={sort} onSort={onSort} />
              </th>
              <th className="py-3 pr-4 text-right">
                <SortButton label="Amount" field="amount" sort={sort} onSort={onSort} />
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((grant, idx) => {
              const isExpanded = expandedId === grant.id;
              const barWidth =
                grant.amount != null ? Math.max(2, (grant.amount / maxAmount) * 100) : 0;
              const foundationName = foundationNames[grant.foundationId];
              const purposePreview = grant.purposeText
                ? grant.purposeText.length > 60
                  ? `${grant.purposeText.slice(0, 60)}…`
                  : grant.purposeText
                : "—";

              return (
                <React.Fragment key={grant.id}>
                  <tr
                    className="cursor-pointer border-b border-zinc-100 transition-colors last:border-0 hover:bg-zinc-50 dark:border-zinc-800/50 dark:hover:bg-zinc-800/40"
                    onClick={() => setExpandedId(isExpanded ? null : grant.id)}
                    aria-expanded={isExpanded}
                  >
                    <td className="py-2 pl-4 pr-2 text-xs tabular-nums text-zinc-400">{idx + 1}</td>
                    <td className="py-2 pr-3">
                      <Link
                        href={NON_PROFITS_PAGES.FOUNDATION(grant.foundationId, searchId)}
                        className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {foundationName ?? "View foundation"}
                      </Link>
                    </td>
                    <td className="py-2 pr-3 text-zinc-600 dark:text-zinc-400">{purposePreview}</td>
                    <td className="py-2 pr-3 tabular-nums text-zinc-500">{grant.filingYear}</td>
                    {/* Amount cell with proportional bar */}
                    <td className="relative py-2 pr-4 text-right">
                      {/* Proportional bar — behind the text */}
                      <span
                        className="absolute inset-y-1 right-0 rounded-r bg-brand-100 dark:bg-brand-900/40"
                        style={{ width: `${barWidth}%` }}
                        aria-hidden
                      />
                      {/* Text on top */}
                      <span className="relative z-10 tabular-nums font-medium text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(grant.amount)}
                      </span>
                    </td>
                  </tr>
                  {isExpanded && grant.purposeText && (
                    <tr className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800/50 dark:bg-zinc-800/20">
                      <td />
                      <td
                        colSpan={4}
                        className="py-3 pr-4 text-sm text-zinc-600 dark:text-zinc-400"
                      >
                        {grant.purposeText}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-zinc-200 dark:border-zinc-800">
              <td
                colSpan={4}
                className="py-3 pl-4 text-xs font-medium uppercase tracking-wide text-zinc-400"
              >
                Total
              </td>
              <td className="py-3 pr-4 text-right tabular-nums font-semibold text-zinc-900 dark:text-zinc-100">
                {formatCurrency(totalAmount)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Foundation concentration panel
// ---------------------------------------------------------------------------

interface FoundationConcentrationProps {
  grants: Grant[];
  foundationNames: Record<string, string>;
  searchId?: string;
}

const FoundationConcentrationPanel = React.memo(function FoundationConcentrationPanel({
  grants,
  foundationNames,
  searchId,
}: FoundationConcentrationProps) {
  const totals: Record<string, number> = {};
  for (const grant of grants) {
    totals[grant.foundationId] = (totals[grant.foundationId] ?? 0) + (grant.amount ?? 0);
  }

  const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0);
  const sorted = Object.entries(totals).sort(([, a], [, b]) => b - a);

  return (
    <div className="mt-6 rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
      <div className="mb-4 flex items-center gap-2">
        <Heart className="size-4 text-rose-500" aria-hidden />
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Foundation Concentration
        </h2>
        <span className="ml-auto text-xs text-zinc-400">
          {pluralize("foundation", sorted.length, true)}
        </span>
      </div>
      <div className="space-y-3">
        {sorted.map(([foundationId, total]) => {
          const pct = grandTotal > 0 ? (total / grandTotal) * 100 : 0;
          const name = foundationNames[foundationId];
          return (
            <div key={foundationId}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <Link
                  href={NON_PROFITS_PAGES.FOUNDATION(foundationId, searchId)}
                  className="truncate font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  {name ?? "Unknown Foundation"}
                </Link>
                <span className="ml-3 shrink-0 tabular-nums text-zinc-500">
                  {formatCurrency(total)}
                  <span className="ml-2 text-xs text-zinc-400">{pct.toFixed(0)}%</span>
                </span>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
                role="progressbar"
                aria-valuenow={Math.round(pct)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${name ?? foundationId}: ${pct.toFixed(0)}% of total`}
              >
                <div
                  className="h-full rounded-full bg-teal-500 transition-all dark:bg-teal-400"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

const LoadingSkeleton = React.memo(function LoadingSkeleton() {
  return (
    <div className="w-full px-4 py-8" aria-busy="true">
      {/* Masthead skeleton */}
      <div className="mb-6 flex items-start gap-3 border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <Skeleton className="size-10 shrink-0 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      {/* Two-column skeleton */}
      <div className="flex flex-col gap-6 xl:flex-row">
        <div className="w-full space-y-3 xl:w-[30%]">
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <div className="min-w-0 xl:w-[70%]">
          <Skeleton className="mb-3 h-5 w-32" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

const VALID_SORT_FIELDS = new Set<SortField>(["amount", "year", "foundation", "purpose"]);
const VALID_SORT_DIRS = new Set<SortDir>(["asc", "desc"]);

function parseSortField(v?: string): SortField {
  return VALID_SORT_FIELDS.has(v as SortField) ? (v as SortField) : "amount";
}
function parseSortDir(v?: string): SortDir {
  return VALID_SORT_DIRS.has(v as SortDir) ? (v as SortDir) : "desc";
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Nonprofit detail orchestrates multi-foundation KPI aggregation and breadcrumb chain resolution; inherent domain complexity
export function NonprofitDetail({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const searchId = searchParams.get("searchId") ?? undefined;
  const grantId = searchParams.get("grantId") ?? undefined;

  const { data: nonprofit, isLoading } = useNonprofit(id);
  const { data: grants, isLoading: grantsLoading } = useNonprofitGrants(id);

  // Sort state — client-local per spec
  const [sortField, setSortField] = useState<string>("amount");
  const [sortDirStr, setSortDirStr] = useState<string>("desc");

  // Fetch grant for breadcrumb, then derive foundation from it.
  const { data: rawBreadcrumbGrant } = useGrant(grantId ?? "");
  const breadcrumbGrant = rawBreadcrumbGrant?.nonprofitId === id ? rawBreadcrumbGrant : undefined;
  const breadcrumbFoundationId = breadcrumbGrant?.foundationId ?? "";
  const foundationQuery = useQueries({
    queries: [
      {
        queryKey: foundationKeys.detail(breadcrumbFoundationId),
        queryFn: () => resultToPromise(philanthropyService.getFoundation(breadcrumbFoundationId)),
        enabled: Boolean(breadcrumbFoundationId),
        staleTime: 5 * 60 * 1000,
      },
    ],
  });
  const breadcrumbFoundation = foundationQuery[0]?.data;

  const resolvedGrants = grants ?? [];

  const uniqueFoundationIds = React.useMemo(
    () => [...new Set(resolvedGrants.map((g) => g.foundationId))],
    [resolvedGrants]
  );

  const foundationQueries = useQueries({
    queries: uniqueFoundationIds.map((fId) => ({
      queryKey: foundationKeys.detail(fId),
      queryFn: () => resultToPromise(philanthropyService.getFoundation(fId)),
      enabled: Boolean(fId),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const foundationNames: Record<string, string> = React.useMemo(() => {
    const map: Record<string, string> = {};
    for (let i = 0; i < uniqueFoundationIds.length; i++) {
      const fId = uniqueFoundationIds[i];
      const data = foundationQueries[i]?.data;
      map[fId] = data?.name ?? `Foundation ${fId.slice(0, 8)}`;
    }
    return map;
  }, [uniqueFoundationIds, foundationQueries]);

  const sort: SortState = {
    field: parseSortField(sortField),
    dir: parseSortDir(sortDirStr),
  };

  const handleSort = React.useCallback(
    (field: SortField) => {
      const newDir = sort.field === field ? (sort.dir === "asc" ? "desc" : "asc") : "desc";
      setSortField(field);
      setSortDirStr(newDir);
    },
    [sort.field, sort.dir]
  );

  if (isLoading || grantsLoading) {
    return <LoadingSkeleton />;
  }

  if (!nonprofit) {
    return (
      <EntityNotFound
        icon={<Heart className="size-6 text-zinc-400" />}
        title="Nonprofit not found"
        description="The nonprofit with this ID could not be found."
      />
    );
  }

  // Derived KPIs
  const totalReceived = resolvedGrants.reduce((sum, g) => sum + (g.amount ?? 0), 0);
  const grantCount = resolvedGrants.length;
  const avgGrantSize = grantCount > 0 ? totalReceived / grantCount : 0;
  const uniqueFoundations = uniqueFoundationIds.length;

  // Build breadcrumb chain: search > foundation > grant > nonprofit
  const breadcrumbMiddle: BreadcrumbItem[] = [];
  if (breadcrumbFoundation && breadcrumbGrant?.foundationId) {
    breadcrumbMiddle.push({
      label: breadcrumbFoundation.name,
      href: NON_PROFITS_PAGES.FOUNDATION(breadcrumbGrant.foundationId, searchId),
    });
  }
  if (breadcrumbGrant && grantId) {
    breadcrumbMiddle.push({
      label: breadcrumbGrant.purposeText ?? "Grant",
      href: NON_PROFITS_PAGES.GRANT(grantId, searchId),
    });
  }

  return (
    <div className="w-full px-4 py-8">
      {/* Breadcrumbs — index 0 */}
      <div className="animate-entrance" style={{ animationDelay: "0s" }}>
        <PageBreadcrumbs
          currentLabel={nonprofit.name ?? "Nonprofit"}
          searchId={searchId}
          middle={breadcrumbMiddle.length > 0 ? breadcrumbMiddle : undefined}
        />
      </div>

      {/* Masthead — index 1 */}
      <div
        className="animate-entrance mb-6 flex items-start gap-3 border-b border-zinc-200 pb-6 dark:border-zinc-800"
        style={{ animationDelay: "0.07s" }}
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/30">
          <Building2 className="size-5 text-green-600 dark:text-green-400" aria-hidden />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold leading-tight text-zinc-900 dark:text-zinc-100">
            {nonprofit.name}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
            {nonprofit.ein && (
              <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono dark:bg-zinc-800">
                EIN {nonprofit.ein}
              </span>
            )}
            {nonprofit.location && (
              <span className="flex items-center gap-1">
                <MapPin className="size-3" aria-hidden />
                {nonprofit.location}
              </span>
            )}
          </div>
          {nonprofit.description && (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {nonprofit.description}
            </p>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col gap-6 xl:flex-row">
        {/* Left sidebar — KPIs + concentration */}
        <div className="w-full xl:w-[30%] xl:shrink-0 xl:sticky xl:top-20 xl:self-start">
          {/* KPI cards — index 2 */}
          <div
            className="animate-entrance grid grid-cols-2 gap-3"
            style={{ animationDelay: "0.14s" }}
          >
            <KpiCard
              icon={<DollarSign className="size-4" aria-hidden />}
              label="Total Received"
              value={formatCurrency(totalReceived)}
              accent
            />
            <KpiCard
              icon={<HandCoins className="size-4" aria-hidden />}
              label={pluralize("Grant", grantCount)}
              value={String(grantCount)}
            />
            <KpiCard
              icon={<TrendingUp className="size-4" aria-hidden />}
              label="Avg Grant Size"
              value={formatCurrency(avgGrantSize)}
            />
            <KpiCard
              icon={<Users className="size-4" aria-hidden />}
              label={pluralize("Foundation", uniqueFoundations)}
              value={String(uniqueFoundations)}
            />
          </div>

          {/* Concentration panel — index 3 */}
          {resolvedGrants.length > 0 && (
            <div className="animate-entrance" style={{ animationDelay: "0.21s" }}>
              <FoundationConcentrationPanel
                grants={resolvedGrants}
                foundationNames={foundationNames}
                searchId={searchId}
              />
            </div>
          )}
        </div>

        {/* Right main — grants table */}
        <div className="min-w-0 xl:w-[70%]">
          {/* Table header — index 4 */}
          <div
            className="animate-entrance mb-3 flex items-center gap-2"
            style={{ animationDelay: "0.28s" }}
          >
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Grants Received
            </h2>
            <span className="text-xs text-zinc-400">({grantCount})</span>
          </div>

          {/* Grants table — index 5 */}
          <div className="animate-entrance" style={{ animationDelay: "0.35s" }}>
            <GrantsTable
              grants={resolvedGrants}
              searchId={searchId}
              foundationNames={foundationNames}
              sort={sort}
              onSort={handleSort}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
