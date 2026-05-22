"use client";

/**
 * Foundation detail page component — ported from grant-atlas.
 * Key adaptations: Next.js Link, NON_PROFITS_PAGES constants, @/ imports,
 * client-local sort state, searchId via useSearchParams, inline not-found.
 */

import "@/src/features/non-profits/styles/non-profits-detail.css";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ArrowUpRight,
  Building2,
  Calendar,
  ChevronDown,
  DollarSign,
  HandCoins,
  Landmark,
  MapPin,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { MotionConfig, motion } from "motion/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import pluralize from "pluralize";
import React, { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { NON_PROFITS_PAGES } from "@/utilities/pages";
import {
  useFoundation,
  useFoundationFinancials,
  useFoundationGrants,
  useFoundationOfficers,
} from "../hooks/use-foundation";
import { formatCurrency } from "../lib/utils";
import type { Financials, Grant, Officer } from "../types/philanthropy";
import { EntityNotFound } from "./entity-not-found";
import { HeroTransitionOverlay } from "./hero-transition-overlay";
import { PageBreadcrumbs } from "./page-breadcrumbs";

interface SortOption {
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string;
  value: string | number | null | undefined;
  icon: React.ReactNode;
  iconBg: string;
  trend?: "up" | "down" | "neutral";
  subLabel?: string;
  loading?: boolean;
}

const StatCard = React.memo(function StatCard({
  label,
  value,
  icon,
  iconBg,
  trend,
  subLabel,
  loading = false,
}: StatCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {label}
        </span>
        <div className={`flex size-8 items-center justify-center rounded-lg ${iconBg}`}>{icon}</div>
      </div>
      {loading ? (
        <Skeleton className="h-7 w-32" />
      ) : (
        <span className="text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
          {value ?? "—"}
        </span>
      )}
      {(subLabel || trend) && (
        <div className="flex items-center gap-1.5">
          {trend === "up" && <TrendingUp className="size-3.5 text-emerald-500" />}
          {trend === "down" && <TrendingDown className="size-3.5 text-red-500" />}
          {trend === "neutral" && <Minus className="size-3.5 text-zinc-400" />}
          {subLabel && <span className="text-xs text-zinc-400 dark:text-zinc-500">{subLabel}</span>}
        </div>
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Section header
// ---------------------------------------------------------------------------

function SectionHeader({
  title,
  count,
  icon,
  expanded,
  onToggleExpand,
  trailing,
}: {
  title: string;
  count?: number;
  icon: React.ReactNode;
  expanded?: boolean;
  onToggleExpand?: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <div className="flex size-7 items-center justify-center rounded-md bg-zinc-100 dark:bg-zinc-800">
        {icon}
      </div>
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
      {count !== undefined && (
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          {count}
        </span>
      )}
      {(trailing || onToggleExpand) && (
        <div className="ml-auto flex items-center gap-1.5">
          {trailing}
          {onToggleExpand && (
            <button
              type="button"
              onClick={onToggleExpand}
              aria-label={expanded ? "Exit full width" : "Expand to full width"}
              className={`rounded-md p-1.5 transition-all duration-300 ${
                expanded
                  ? "bg-brand-50 text-brand-600 hover:bg-brand-100 dark:bg-brand-950 dark:text-brand-400 dark:hover:bg-brand-900"
                  : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              }`}
            >
              <span
                className={`block transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
              >
                {expanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty / loading states
// ---------------------------------------------------------------------------

function TableSkeleton({ rows = 5, cols = 3 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, rowIdx) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows have no identity
        <div key={rowIdx} className="flex gap-3">
          {Array.from({ length: cols }).map((_, colIdx) => (
            <Skeleton
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton cols have no identity
              key={colIdx}
              className="h-5 flex-1"
              style={{ flexBasis: colIdx === 0 ? "40%" : undefined }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
        <Minus className="size-4 text-zinc-400" />
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{message}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sortable column header
// ---------------------------------------------------------------------------

function SortableHeader({
  label,
  field,
  sort,
  onSort,
  align = "left",
}: {
  label: string;
  field: string;
  sort: SortOption;
  onSort: (field: string) => void;
  align?: "left" | "right";
}) {
  const active = sort.sortBy === field;
  return (
    <th
      className={`cursor-pointer select-none pb-2 pt-3 pr-4 text-xs font-medium uppercase tracking-wide transition-colors ${
        active
          ? "text-zinc-700 dark:text-zinc-200"
          : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
      } ${align === "right" ? "text-right" : "text-left"}`}
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          sort.sortOrder === "asc" ? (
            <ArrowUp className="size-3" />
          ) : (
            <ArrowDown className="size-3" />
          )
        ) : (
          <ArrowUpDown className="size-3 opacity-40" />
        )}
      </span>
    </th>
  );
}

// ---------------------------------------------------------------------------
// Grants table
// ---------------------------------------------------------------------------

const GrantRow = React.memo(function GrantRow({
  grant,
  searchId,
}: {
  grant: Grant;
  searchId?: string;
}) {
  return (
    <tr className="group border-b border-zinc-100 last:border-0 dark:border-zinc-800/60">
      <td className="py-3 pr-4">
        <Link
          href={NON_PROFITS_PAGES.GRANT(grant.id, searchId)}
          className="flex items-start gap-1 text-sm leading-snug text-zinc-800 hover:text-brand-600 dark:text-zinc-200 dark:hover:text-brand-400"
        >
          <span className="line-clamp-2">{grant.purposeText ?? "No purpose listed"}</span>
          <ArrowUpRight className="mt-0.5 size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
        </Link>
      </td>
      <td className="py-3 pr-4 text-sm text-zinc-600 dark:text-zinc-400">
        {grant.recipientName && grant.nonprofitId ? (
          <Link
            href={NON_PROFITS_PAGES.NONPROFIT(grant.nonprofitId)}
            className="line-clamp-1 hover:text-brand-600 hover:underline dark:hover:text-brand-400"
          >
            {grant.recipientName}
          </Link>
        ) : (
          <span className="text-zinc-400 dark:text-zinc-500">{grant.recipientName ?? "—"}</span>
        )}
      </td>
      <td className="whitespace-nowrap py-3 pr-4 text-right text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
        {formatCurrency(grant.amount)}
      </td>
      <td className="whitespace-nowrap py-3 text-right text-sm text-zinc-500 dark:text-zinc-400">
        {grant.filingYear}
      </td>
    </tr>
  );
});

function GrantYearFilter({
  years,
  selected,
  onChange,
}: {
  years: number[];
  selected: number | null;
  onChange: (year: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (years.length <= 1) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
          open
            ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-950 dark:text-brand-300"
            : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-600"
        }`}
      >
        <Calendar className="size-3" />
        {selected ?? "All"}
        <ChevronDown
          className={`size-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 max-h-48 min-w-[5rem] overflow-y-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className={`flex w-full items-center px-3 py-1.5 text-xs transition-colors ${
              selected === null
                ? "bg-brand-50 font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300"
                : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
          >
            All
          </button>
          {years.map((year) => (
            <button
              key={year}
              type="button"
              onClick={() => {
                onChange(year);
                setOpen(false);
              }}
              className={`flex w-full items-center px-3 py-1.5 text-xs transition-colors ${
                year === selected
                  ? "bg-brand-50 font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300"
                  : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function GrantsTable({
  grants,
  isLoading,
  searchId,
  expanded,
  onToggleExpand,
  sort,
  onSort,
  availableYears,
  selectedYear,
  onYearChange,
}: {
  grants: Grant[] | undefined;
  isLoading: boolean;
  searchId?: string;
  expanded?: boolean;
  onToggleExpand?: () => void;
  sort: SortOption;
  onSort: (field: string) => void;
  availableYears: number[];
  selectedYear: number | null;
  onYearChange: (year: number | null) => void;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <SectionHeader
          title={pluralize("Grant", grants?.length ?? 0)}
          count={grants?.length}
          icon={<HandCoins className="size-4 text-brand-600 dark:text-brand-400" />}
          expanded={expanded}
          onToggleExpand={onToggleExpand}
          trailing={
            <GrantYearFilter
              years={availableYears}
              selected={selectedYear}
              onChange={onYearChange}
            />
          }
        />
      </div>
      <div className="overflow-x-auto px-5 pb-4">
        {isLoading ? (
          <div className="py-4">
            <TableSkeleton rows={6} cols={3} />
          </div>
        ) : !grants || grants.length === 0 ? (
          <EmptyState message="No grants found for this foundation." />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800/60">
                <SortableHeader label="Purpose" field="actionDate" sort={sort} onSort={onSort} />
                <th className="pb-2 pt-3 pr-4 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Recipient
                </th>
                <SortableHeader
                  label="Amount"
                  field="amount"
                  sort={sort}
                  onSort={onSort}
                  align="right"
                />
                <SortableHeader
                  label="Year"
                  field="filingYear"
                  sort={sort}
                  onSort={onSort}
                  align="right"
                />
              </tr>
            </thead>
            <tbody>
              {grants.map((grant) => (
                <GrantRow key={grant.id} grant={grant} searchId={searchId} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Officers table
// ---------------------------------------------------------------------------

const OfficerRow = React.memo(function OfficerRow({ officer }: { officer: Officer }) {
  const totalComp =
    (officer.compensation ?? 0) + (officer.benefits ?? 0) + (officer.expenseAccount ?? 0);

  return (
    <tr className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60">
      <td className="py-2.5 pr-3">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{officer.name}</p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">{officer.title ?? "—"}</p>
      </td>
      <td className="whitespace-nowrap py-2.5 pr-3 text-right text-sm tabular-nums text-zinc-700 dark:text-zinc-300">
        {formatCurrency(officer.compensation)}
      </td>
      <td className="whitespace-nowrap py-2.5 pr-3 text-right text-sm tabular-nums text-zinc-500 dark:text-zinc-400">
        {formatCurrency(officer.benefits)}
      </td>
      <td className="whitespace-nowrap py-2.5 pr-3 text-right text-sm tabular-nums text-zinc-500 dark:text-zinc-400">
        {formatCurrency(officer.expenseAccount)}
      </td>
      <td className="whitespace-nowrap py-2.5 pr-3 text-right text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
        {totalComp > 0 ? formatCurrency(totalComp) : "—"}
      </td>
      <td className="whitespace-nowrap py-2.5 text-right text-xs text-zinc-400 dark:text-zinc-500">
        {officer.filingYear}
      </td>
    </tr>
  );
});

function OfficersTable({
  officers,
  isLoading,
  expanded,
  onToggleExpand,
  sort,
  onSort,
  yearLabel,
}: {
  officers: Officer[] | undefined;
  isLoading: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
  sort: SortOption;
  onSort: (field: string) => void;
  yearLabel?: number | null;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <SectionHeader
          title={pluralize("Officer", officers?.length ?? 0)}
          count={officers?.length}
          icon={<Users className="size-4 text-violet-500" />}
          expanded={expanded}
          onToggleExpand={onToggleExpand}
        />
        {yearLabel && (
          <div className="-mt-3 mb-1 flex items-center gap-1.5">
            <Calendar className="size-3 text-zinc-400" />
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              Filing year {yearLabel}
            </span>
          </div>
        )}
      </div>
      <div className="overflow-x-auto px-5 pb-4">
        {isLoading ? (
          <div className="py-4">
            <TableSkeleton rows={4} cols={5} />
          </div>
        ) : !officers || officers.length === 0 ? (
          <EmptyState message="No officers found for this foundation." />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800/60">
                <SortableHeader label="Name / Title" field="name" sort={sort} onSort={onSort} />
                <SortableHeader
                  label="Compensation"
                  field="compensation"
                  sort={sort}
                  onSort={onSort}
                  align="right"
                />
                <SortableHeader
                  label="Benefits"
                  field="benefits"
                  sort={sort}
                  onSort={onSort}
                  align="right"
                />
                <th className="pb-2 pt-3 pr-3 text-right text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Expense Acct
                </th>
                <th className="pb-2 pt-3 pr-3 text-right text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Total
                </th>
                <SortableHeader
                  label="Year"
                  field="filingYear"
                  sort={sort}
                  onSort={onSort}
                  align="right"
                />
              </tr>
            </thead>
            <tbody>
              {officers.map((officer) => (
                <OfficerRow key={officer.id} officer={officer} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Financials table
// ---------------------------------------------------------------------------

const FinancialRow = React.memo(function FinancialRow({ fin }: { fin: Financials }) {
  const netPositive = fin.netAssets !== null && fin.netAssets >= 0;

  return (
    <tr className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60">
      <td className="whitespace-nowrap py-2.5 pr-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        {fin.filingYear}
      </td>
      <td className="whitespace-nowrap py-2.5 pr-4 text-right text-sm tabular-nums text-zinc-700 dark:text-zinc-300">
        {formatCurrency(fin.totalRevenue)}
      </td>
      <td className="whitespace-nowrap py-2.5 pr-4 text-right text-sm tabular-nums text-zinc-700 dark:text-zinc-300">
        {formatCurrency(fin.totalExpenses)}
      </td>
      <td className="whitespace-nowrap py-2.5 pr-4 text-right text-sm tabular-nums text-zinc-700 dark:text-zinc-300">
        {formatCurrency(fin.totalAssets)}
      </td>
      <td className="whitespace-nowrap py-2.5 pr-4 text-right text-sm tabular-nums">
        <span
          className={
            fin.netAssets === null
              ? "text-zinc-400"
              : netPositive
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-500 dark:text-red-400"
          }
        >
          {fin.netAssets !== null && <span className="mr-0.5">{netPositive ? "+" : ""}</span>}
          {formatCurrency(fin.netAssets)}
        </span>
      </td>
      <td className="whitespace-nowrap py-2.5 pr-4 text-right text-sm tabular-nums text-zinc-600 dark:text-zinc-400">
        {formatCurrency(fin.qualifyingDistributions)}
      </td>
      <td className="whitespace-nowrap py-2.5 pr-4 text-right text-sm tabular-nums text-zinc-500 dark:text-zinc-500">
        {formatCurrency(fin.minimumInvestmentReturn)}
      </td>
      <td className="whitespace-nowrap py-2.5 pr-4 text-right text-sm tabular-nums text-zinc-500 dark:text-zinc-500">
        {formatCurrency(fin.distributableAmount)}
      </td>
      <td className="whitespace-nowrap py-2.5 pr-4 text-right text-sm tabular-nums text-zinc-500 dark:text-zinc-500">
        {formatCurrency(fin.undistributedIncome)}
      </td>
      <td className="whitespace-nowrap py-2.5 text-right text-sm tabular-nums text-zinc-500 dark:text-zinc-500">
        {formatCurrency(fin.excessDistributions)}
      </td>
    </tr>
  );
});

const FINANCIALS_COLUMNS: { label: string; field: string }[] = [
  { label: "Year", field: "filingYear" },
  { label: "Revenue", field: "totalRevenue" },
  { label: "Expenses", field: "totalExpenses" },
  { label: "Total Assets", field: "totalAssets" },
  { label: "Net Assets", field: "netAssets" },
  { label: "Qualifying Dist.", field: "qualifyingDistributions" },
  { label: "Min. Investment Return", field: "minimumInvestmentReturn" },
  { label: "Distributable Amt.", field: "distributableAmount" },
  { label: "Undistributed Income", field: "undistributedIncome" },
  { label: "Excess Dist.", field: "excessDistributions" },
];

function FinancialsTable({
  financials,
  isLoading,
  expanded,
  onToggleExpand,
  sort,
  onSort,
}: {
  financials: Financials[] | undefined;
  isLoading: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
  sort: SortOption;
  onSort: (field: string) => void;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <SectionHeader
          title="Financials"
          count={financials?.length || undefined}
          icon={<DollarSign className="size-4 text-amber-500" />}
          expanded={expanded}
          onToggleExpand={onToggleExpand}
        />
      </div>
      <div className="overflow-x-auto px-5 pb-4">
        {isLoading ? (
          <div className="py-4">
            <TableSkeleton rows={4} cols={6} />
          </div>
        ) : !financials || financials.length === 0 ? (
          <EmptyState message="No financial data found for this foundation." />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800/60">
                {FINANCIALS_COLUMNS.map((col, i) => (
                  <SortableHeader
                    key={col.field}
                    label={col.label}
                    field={col.field}
                    sort={sort}
                    onSort={onSort}
                    align={i === 0 ? "left" : "right"}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {financials.map((fin) => (
                <FinancialRow key={fin.id} fin={fin} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hero loading skeleton
// ---------------------------------------------------------------------------

function HeroSkeleton() {
  return (
    <div className="border-b border-zinc-200 bg-white px-4 py-8 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-12 rounded-xl" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Skeleton className="h-4 w-full max-w-2xl" />
        <Skeleton className="h-4 w-3/4 max-w-xl" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat grid loading skeleton
// ---------------------------------------------------------------------------

const STAT_SKELETON_KEYS = [
  "assets",
  "net",
  "revenue",
  "expenses",
  "dist",
  "grants",
  "officers",
] as const;

function StatGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
      {STAT_SKELETON_KEYS.map((key) => (
        <div
          key={key}
          className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="flex items-start justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="size-8 rounded-lg" />
          </div>
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Net assets helpers
// ---------------------------------------------------------------------------

function netAssetsIsPositive(value: number | null | undefined): boolean {
  return value !== null && value !== undefined && value >= 0;
}

function netAssetsIcon(value: number | null | undefined): React.ReactNode {
  if (netAssetsIsPositive(value)) {
    return <Plus className="size-4 text-emerald-600" />;
  }
  return <Minus className="size-4 text-red-500" />;
}

function netAssetsIconBg(value: number | null | undefined): string {
  return netAssetsIsPositive(value)
    ? "bg-emerald-50 dark:bg-emerald-950"
    : "bg-red-50 dark:bg-red-950";
}

function netAssetsTrend(value: number | null | undefined): "up" | "down" | undefined {
  if (value === null || value === undefined) return undefined;
  return value >= 0 ? "up" : "down";
}

// ---------------------------------------------------------------------------
// Foundation hero
// ---------------------------------------------------------------------------

interface FoundationHeroProps {
  id: string;
  name: string;
  ein: string;
  location: string | null;
  description: string | null;
  latestFilingYear: number | null | undefined;
  breadcrumbs: React.ReactNode;
}

function FoundationHero({
  id,
  name,
  ein,
  location,
  description,
  latestFilingYear,
  breadcrumbs,
}: FoundationHeroProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const fieldStyle = isAnimating ? { opacity: 0 } : undefined;
  const fieldTransition = isAnimating ? undefined : { transition: "opacity 200ms ease-in" };

  return (
    <div className="relative border-b border-zinc-200 bg-white px-4 py-8 dark:border-zinc-800 dark:bg-zinc-900">
      <HeroTransitionOverlay entityId={id} onAnimatingChange={setIsAnimating} />

      {breadcrumbs}

      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-950">
            <Landmark className="size-6 text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <h1
              data-hero-field="name"
              style={{ ...fieldStyle, ...fieldTransition }}
              className="text-2xl font-bold leading-tight text-zinc-900 dark:text-zinc-50"
            >
              {name}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-500">
              <span className="flex items-center gap-1">
                <Building2 className="size-3.5" />
                EIN {ein}
              </span>
              {location && (
                <span
                  data-hero-field="location"
                  style={{ ...fieldStyle, ...fieldTransition }}
                  className="flex items-center gap-1"
                >
                  <MapPin className="size-3.5" />
                  {location}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 flex shrink-0 flex-wrap gap-2 sm:mt-0">
          {latestFilingYear && (
            <span
              data-hero-field="year"
              style={{ ...fieldStyle, ...fieldTransition }}
              className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            >
              Latest filing: {latestFilingYear}
            </span>
          )}
          <span
            data-hero-field="badge"
            style={{ ...fieldStyle, ...fieldTransition }}
            className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300"
          >
            Private Foundation
          </span>
        </div>
      </div>

      {description && (
        <p className="mt-4 max-w-4xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          {description}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Year selector
// ---------------------------------------------------------------------------

function YearSelector({
  years,
  selected,
  onChange,
}: {
  years: number[];
  selected: number;
  onChange: (year: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-all ${
          open
            ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-950 dark:text-brand-300"
            : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:border-zinc-600"
        }`}
      >
        <Calendar className="size-3.5" />
        {selected}
        <ChevronDown
          className={`size-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          {years.map((year) => (
            <button
              key={year}
              type="button"
              onClick={() => {
                onChange(year);
                setOpen(false);
              }}
              className={`flex w-full items-center px-4 py-2 text-sm transition-colors ${
                year === selected
                  ? "bg-brand-50 font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300"
                  : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat grid
// ---------------------------------------------------------------------------

interface FoundationStatGridProps {
  selectedFinancials: Financials | null;
  totalAssets: number | null | undefined;
  grantsCount: number | undefined;
  totalGrantAmount: number | null;
  grantsLoading: boolean;
  officersCount: number | undefined;
  officersLoading: boolean;
  availableYears: number[];
  selectedYear: number | null;
  onYearChange: (year: number) => void;
}

function FoundationStatGrid({
  selectedFinancials,
  totalAssets,
  grantsCount,
  totalGrantAmount,
  grantsLoading,
  officersCount,
  officersLoading,
  availableYears,
  selectedYear,
  onYearChange,
}: FoundationStatGridProps) {
  const grantsValue =
    grantsCount !== undefined
      ? `${grantsCount}${totalGrantAmount ? ` · ${formatCurrency(totalGrantAmount)}` : ""}`
      : "—";

  return (
    <div className="flex flex-col gap-3">
      {availableYears.length > 0 && selectedYear && (
        <div className="flex items-center gap-2">
          <YearSelector years={availableYears} selected={selectedYear} onChange={onYearChange} />
          <span className="text-xs text-zinc-400 dark:text-zinc-500">Financial data year</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        <StatCard
          label="Total Assets"
          value={formatCurrency(selectedFinancials?.totalAssets ?? totalAssets ?? null)}
          icon={<DollarSign className="size-4 text-brand-600 dark:text-brand-400" />}
          iconBg="bg-brand-50 dark:bg-brand-950"
        />
        <StatCard
          label="Net Assets"
          value={formatCurrency(selectedFinancials?.netAssets ?? null)}
          icon={netAssetsIcon(selectedFinancials?.netAssets)}
          iconBg={netAssetsIconBg(selectedFinancials?.netAssets)}
          trend={netAssetsTrend(selectedFinancials?.netAssets)}
        />
        <StatCard
          label="Revenue"
          value={formatCurrency(selectedFinancials?.totalRevenue ?? null)}
          icon={<TrendingUp className="size-4 text-sky-600" />}
          iconBg="bg-sky-50 dark:bg-sky-950"
        />
        <StatCard
          label="Expenses"
          value={formatCurrency(selectedFinancials?.totalExpenses ?? null)}
          icon={<TrendingDown className="size-4 text-orange-500" />}
          iconBg="bg-orange-50 dark:bg-orange-950"
        />
        <StatCard
          label="Qualifying Dist."
          value={formatCurrency(selectedFinancials?.qualifyingDistributions ?? null)}
          icon={<HandCoins className="size-4 text-violet-600" />}
          iconBg="bg-violet-50 dark:bg-violet-950"
        />
        <StatCard
          label={pluralize("Grant", grantsCount ?? 0)}
          value={grantsLoading ? undefined : grantsValue}
          icon={<HandCoins className="size-4 text-amber-600" />}
          iconBg="bg-amber-50 dark:bg-amber-950"
          loading={grantsLoading}
          subLabel="Total grants awarded"
        />
        <StatCard
          label={pluralize("Officer", officersCount ?? 0)}
          value={officersLoading ? undefined : (officersCount ?? "—")}
          icon={<Users className="size-4 text-pink-600" />}
          iconBg="bg-pink-50 dark:bg-pink-950"
          loading={officersLoading}
          subLabel="On record"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Not found state
// ---------------------------------------------------------------------------

function FoundationNotFound() {
  return (
    <EntityNotFound
      icon={<Landmark className="size-6 text-zinc-400" />}
      title="Foundation not found"
      description="The foundation with this ID could not be found."
    />
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

type ExpandedSection = "grants" | "officers" | "financials" | null;
type MobileTab = "grants" | "officers" | "financials";

const mobileTabs: { key: MobileTab; label: string; icon: React.ReactNode }[] = [
  { key: "grants", label: "Grants", icon: <HandCoins className="size-4" /> },
  { key: "officers", label: "Officers", icon: <Users className="size-4" /> },
  { key: "financials", label: "Financials", icon: <DollarSign className="size-4" /> },
];

const GRANTS_DEFAULT: SortOption = { sortBy: "amount", sortOrder: "desc" };
const OFFICERS_DEFAULT: SortOption = { sortBy: "name", sortOrder: "asc" };
const FINANCIALS_DEFAULT: SortOption = { sortBy: "filingYear", sortOrder: "desc" };

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Foundation detail requires multi-section state orchestration; splitting further would harm readability without reducing actual complexity
export function FoundationDetail({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const searchId = searchParams.get("searchId") ?? undefined;

  const { data: foundation, isLoading: foundationLoading } = useFoundation(id);

  // Sort state — client-local (not URL params per spec)
  const [grantsSort, setGrantsSort] = useState<SortOption>(GRANTS_DEFAULT);
  const [officersSort, setOfficersSort] = useState<SortOption>(OFFICERS_DEFAULT);
  const [financialsSort, setFinancialsSort] = useState<SortOption>(FINANCIALS_DEFAULT);

  const { data: grants, isLoading: grantsLoading } = useFoundationGrants(id, grantsSort);
  const { data: officers, isLoading: officersLoading } = useFoundationOfficers(id, officersSort);
  const { data: financials, isLoading: financialsLoading } = useFoundationFinancials(
    id,
    financialsSort
  );

  const toggleGrantsSort = React.useCallback((field: string) => {
    setGrantsSort((prev) => ({
      sortBy: field,
      sortOrder: prev.sortBy === field ? (prev.sortOrder === "desc" ? "asc" : "desc") : "desc",
    }));
  }, []);

  const toggleOfficersSort = React.useCallback((field: string) => {
    setOfficersSort((prev) => ({
      sortBy: field,
      sortOrder: prev.sortBy === field ? (prev.sortOrder === "asc" ? "desc" : "asc") : "asc",
    }));
  }, []);

  const toggleFinancialsSort = React.useCallback((field: string) => {
    setFinancialsSort((prev) => ({
      sortBy: field,
      sortOrder: prev.sortBy === field ? (prev.sortOrder === "desc" ? "asc" : "desc") : "desc",
    }));
  }, []);

  const [expanded, setExpanded] = useState<ExpandedSection>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>("grants");
  const [grantsYearFilter, setGrantsYearFilter] = useState<number | null>(null);

  const toggleExpand = (section: ExpandedSection) =>
    setExpanded((prev) => (prev === section ? null : section));

  const sortedYears = React.useMemo(() => {
    if (!financials || financials.length === 0) return [];
    return [...new Set(financials.map((f) => f.filingYear))].sort((a, b) => b - a);
  }, [financials]);

  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  // Auto-select the latest year when financials load
  React.useEffect(() => {
    if (sortedYears.length > 0 && selectedYear === null) {
      setSelectedYear(sortedYears[0]);
    }
  }, [sortedYears, selectedYear]);

  const selectedFinancials = React.useMemo(() => {
    if (!financials || !selectedYear) return null;
    return financials.find((f) => f.filingYear === selectedYear) ?? null;
  }, [financials, selectedYear]);

  const latestFinancials = React.useMemo(() => {
    if (!financials || financials.length === 0) return null;
    return [...financials].sort((a, b) => b.filingYear - a.filingYear)[0];
  }, [financials]);

  // Officers filtered by selected financial year
  const filteredOfficers = React.useMemo(() => {
    if (!officers || !selectedYear) return officers;
    const byYear = officers.filter((o) => o.filingYear === selectedYear);
    return byYear.length > 0 ? byYear : officers;
  }, [officers, selectedYear]);

  // Grants: available years + filtered list
  const grantYears = React.useMemo(() => {
    if (!grants || grants.length === 0) return [];
    return [...new Set(grants.map((g) => g.filingYear).filter((y): y is number => y != null))].sort(
      (a, b) => b - a
    );
  }, [grants]);

  const filteredGrants = React.useMemo(() => {
    if (!grants || grantsYearFilter === null) return grants;
    return grants.filter((g) => g.filingYear === grantsYearFilter);
  }, [grants, grantsYearFilter]);

  const totalGrantAmount = React.useMemo(() => {
    const source = filteredGrants;
    if (!source || source.length === 0) return null;
    const sum = source.reduce((acc, g) => acc + (g.amount ?? 0), 0);
    return sum > 0 ? sum : null;
  }, [filteredGrants]);

  if (!foundationLoading && !foundation) {
    return <FoundationNotFound />;
  }

  const grantsTable = (
    <GrantsTable
      grants={filteredGrants}
      isLoading={grantsLoading}
      searchId={searchId}
      expanded={expanded === "grants"}
      onToggleExpand={() => toggleExpand("grants")}
      sort={grantsSort}
      onSort={toggleGrantsSort}
      availableYears={grantYears}
      selectedYear={grantsYearFilter}
      onYearChange={setGrantsYearFilter}
    />
  );

  const officersTable = (
    <OfficersTable
      officers={filteredOfficers}
      isLoading={officersLoading}
      expanded={expanded === "officers"}
      onToggleExpand={() => toggleExpand("officers")}
      sort={officersSort}
      onSort={toggleOfficersSort}
      yearLabel={selectedYear}
    />
  );

  const financialsTable = (
    <FinancialsTable
      financials={financials}
      isLoading={financialsLoading}
      expanded={expanded === "financials"}
      onToggleExpand={() => toggleExpand("financials")}
      sort={financialsSort}
      onSort={toggleFinancialsSort}
    />
  );

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-full">
        {/* Hero header */}
        <div className="animate-entrance" style={{ animationDelay: "0s" }}>
          {foundationLoading ? (
            <HeroSkeleton />
          ) : (
            <FoundationHero
              id={id}
              name={foundation?.name ?? ""}
              ein={foundation?.ein ?? ""}
              location={foundation?.location ?? null}
              description={foundation?.description ?? null}
              latestFilingYear={latestFinancials?.filingYear}
              breadcrumbs={
                <PageBreadcrumbs
                  currentLabel={foundation?.name ?? "Foundation"}
                  searchId={searchId}
                />
              }
            />
          )}
        </div>

        {/* Stat cards grid */}
        <div
          className="animate-entrance border-b border-zinc-200 bg-zinc-50 px-4 py-6 dark:border-zinc-800 dark:bg-zinc-950"
          style={{ animationDelay: "0.07s" }}
        >
          {foundationLoading || financialsLoading ? (
            <StatGridSkeleton />
          ) : (
            <FoundationStatGrid
              selectedFinancials={selectedFinancials}
              totalAssets={foundation?.totalAssets}
              grantsCount={filteredGrants?.length}
              totalGrantAmount={totalGrantAmount}
              grantsLoading={grantsLoading}
              officersCount={filteredOfficers?.length}
              officersLoading={officersLoading}
              availableYears={sortedYears}
              selectedYear={selectedYear}
              onYearChange={setSelectedYear}
            />
          )}
        </div>

        {/* Mobile tab bar — visible below xl */}
        <div
          className="animate-entrance sticky top-0 z-10 border-b border-zinc-200 bg-white px-4 xl:hidden dark:border-zinc-800 dark:bg-zinc-950"
          style={{ animationDelay: `${2 * 0.07}s` }}
        >
          <nav className="flex gap-1" aria-label="Data sections">
            {mobileTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setMobileTab(tab.key)}
                className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
                  mobileTab === tab.key
                    ? "border-brand-500 text-brand-600 dark:border-brand-400 dark:text-brand-400"
                    : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Mobile tabbed content — visible below xl */}
        <div
          className="animate-entrance px-4 py-6 xl:hidden"
          style={{ animationDelay: `${3 * 0.07}s` }}
        >
          {mobileTab === "grants" && grantsTable}
          {mobileTab === "officers" && officersTable}
          {mobileTab === "financials" && financialsTable}
        </div>

        {/* Desktop side-by-side layout — visible at xl and above */}
        <div
          className="animate-entrance hidden px-4 py-6 xl:block"
          style={{ animationDelay: `${3 * 0.07}s` }}
        >
          {/* Collapsed section pills — visible when a section is expanded */}
          <motion.div
            initial={false}
            animate={{ height: expanded ? "auto" : 0, opacity: expanded ? 1 : 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div className="mb-4 flex gap-2">
              {mobileTabs
                .filter((tab) => tab.key !== expanded)
                .map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setExpanded(tab.key)}
                    className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-medium text-zinc-600 transition-all hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
                  >
                    {tab.icon}
                    {tab.label}
                    <Maximize2 className="ml-1 size-3 text-zinc-400" />
                  </button>
                ))}
            </div>
          </motion.div>

          <div className="flex gap-6 xl:flex-row">
            {/* Grants column */}
            <motion.div
              initial={false}
              animate={{
                flex: expanded === "grants" ? "1 1 100%" : expanded ? "0 0 0%" : "1 1 60%",
                opacity: expanded && expanded !== "grants" ? 0 : 1,
              }}
              transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
              className="min-w-0 overflow-hidden"
            >
              {grantsTable}
            </motion.div>

            {/* Officers + Financials column */}
            <motion.div
              initial={false}
              animate={{
                flex:
                  expanded === "officers" || expanded === "financials"
                    ? "1 1 100%"
                    : expanded
                      ? "0 0 0%"
                      : "1 1 40%",
                opacity: expanded === "grants" ? 0 : 1,
              }}
              transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
              className="flex min-w-0 flex-col gap-6 overflow-hidden"
            >
              <motion.div
                initial={false}
                animate={{
                  height: expanded === "financials" ? 0 : "auto",
                  opacity: expanded === "financials" ? 0 : 1,
                  marginBottom: expanded === "financials" ? 0 : undefined,
                }}
                transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                className="overflow-hidden"
              >
                {officersTable}
              </motion.div>

              <motion.div
                initial={false}
                animate={{
                  height: expanded === "officers" ? 0 : "auto",
                  opacity: expanded === "officers" ? 0 : 1,
                }}
                transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                className="overflow-hidden"
              >
                {financialsTable}
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}
