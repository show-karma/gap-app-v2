"use client";

/**
 * Grant detail page component — ported from
 * grant-atlas src/features/grant-atlas/components/grant-detail.tsx.
 *
 * Key adaptations:
 * - TanStack Router `Link` → Next.js `Link`
 * - PAGES.* → NON_PROFITS_PAGES.*
 * - ~/... → @/...
 * - searchId read via useSearchParams
 * - Related grants "See all" links use pluralize for counts
 */

import "@/src/features/non-profits/styles/non-profits-detail.css";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import pluralize from "pluralize";
import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { NON_PROFITS_PAGES } from "@/utilities/pages";
import { useFoundation, useFoundationGrants } from "../hooks/use-foundation";
import { useGrant } from "../hooks/use-grant";
import { useNonprofit, useNonprofitGrants } from "../hooks/use-nonprofit";
import { formatCurrency } from "../lib/utils";
import type { Grant } from "../types/philanthropy";
import { PageBreadcrumbs } from "./page-breadcrumbs";

const RELATED_LIMIT = 8;

function RelatedSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-3.5 w-36" />
      {Array.from({ length: 5 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows
        <div key={i} className="flex justify-between gap-4">
          <Skeleton className="h-3.5 w-full" style={{ maxWidth: `${60 + (i % 3) * 10}%` }} />
          <Skeleton className="h-3.5 w-16 shrink-0" />
        </div>
      ))}
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="w-full px-4 py-6">
      {/* Breadcrumb */}
      <Skeleton className="mb-4 h-4 w-48" />

      {/* Amount + Purpose */}
      <div className="flex items-baseline gap-3">
        <Skeleton className="h-10 w-44" />
        <Skeleton className="h-5 w-80" />
      </div>

      {/* FROM / TO rows */}
      <div className="mt-4 space-y-1.5">
        <div className="flex gap-4">
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-4 w-72" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>

      {/* Metadata line */}
      <Skeleton className="mt-4 h-3.5 w-64" />

      {/* Related grants */}
      <div className="mt-8 border-t border-zinc-100 pt-6 dark:border-zinc-800">
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
          <RelatedSkeleton />
          <RelatedSkeleton />
        </div>
      </div>
    </div>
  );
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function truncateHash(hash: string): string {
  if (hash.length <= 14) return hash;
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

function formatAssets(totalAssets: number | null): string {
  if (totalAssets == null) return "";
  if (totalAssets >= 1_000_000_000) {
    return `$${(totalAssets / 1_000_000_000).toFixed(1)}B assets`;
  }
  if (totalAssets >= 1_000_000) {
    return `$${(totalAssets / 1_000_000).toFixed(1)}M assets`;
  }
  return `${formatCurrency(totalAssets)} assets`;
}

function formatPct(amount: number | null, total: number | null): string | null {
  if (amount == null || total == null || total === 0) return null;
  const pct = (amount / total) * 100;
  if (pct < 0.01) return "<0.01%";
  return `${pct.toFixed(pct < 1 ? 3 : 2)}% of assets`;
}

// ---------------------------------------------------------------------------
// Related grants list
// ---------------------------------------------------------------------------

const RelatedGrantRow = React.memo(function RelatedGrantRow({
  grant,
  currentGrantId,
}: {
  grant: Grant;
  currentGrantId: string;
}) {
  const isCurrent = grant.id === currentGrantId;
  return (
    <tr
      className={`border-b border-zinc-100 last:border-0 dark:border-zinc-800/50 ${
        isCurrent ? "bg-zinc-50 dark:bg-zinc-800/30" : ""
      }`}
    >
      <td className={`py-1.5 pr-3 ${isCurrent ? "px-2" : ""}`}>
        {isCurrent ? (
          <span className="text-xs text-zinc-400 dark:text-zinc-500">This grant</span>
        ) : (
          <Link
            href={NON_PROFITS_PAGES.GRANT(grant.id)}
            className="line-clamp-1 text-xs text-zinc-700 hover:text-zinc-900 hover:underline dark:text-zinc-300 dark:hover:text-zinc-100"
          >
            {grant.purposeText ?? "Untitled"}
          </Link>
        )}
      </td>
      <td className="whitespace-nowrap py-1.5 text-right text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
        {formatCurrency(grant.amount)}
      </td>
    </tr>
  );
});

function RelatedGrantsList({
  title,
  grants,
  isLoading,
  currentGrantId,
  seeAllLink,
  totalCount,
  className = "",
}: {
  title: string;
  grants: Grant[] | undefined;
  isLoading: boolean;
  currentGrantId: string;
  seeAllLink: React.ReactNode;
  totalCount: number | undefined;
  className?: string;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    );
  }

  if (!grants || grants.length === 0) {
    return (
      <div className={className}>
        <p className="text-xs text-zinc-400">{title}: none found.</p>
      </div>
    );
  }

  // Sort by amount desc, take top N
  const sorted = [...grants].sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0));
  const visible = sorted.slice(0, RELATED_LIMIT);
  const hasMore = (totalCount ?? grants.length) > RELATED_LIMIT;

  return (
    <div className={className}>
      <div className="mb-2 flex items-baseline gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          {title}
        </span>
        {totalCount !== undefined && (
          <span className="text-xs tabular-nums text-zinc-300 dark:text-zinc-600">
            {totalCount}
          </span>
        )}
      </div>
      <table className="w-full">
        <tbody>
          {visible.map((g) => (
            <RelatedGrantRow key={g.id} grant={g} currentGrantId={currentGrantId} />
          ))}
        </tbody>
      </table>
      {hasMore && <div className="mt-2">{seeAllLink}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Grant detail renders multiple related data panels with conditional states; complexity reflects domain logic, not poor structure
export function GrantDetail({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const searchId = searchParams.get("searchId") ?? undefined;

  const { data: grant, isLoading: grantLoading } = useGrant(id);
  const { data: foundation, isLoading: foundationLoading } = useFoundation(
    grant?.foundationId ?? ""
  );
  const { data: nonprofit, isLoading: nonprofitLoading } = useNonprofit(grant?.nonprofitId ?? "");
  const { data: funderGrants, isLoading: funderGrantsLoading } = useFoundationGrants(
    grant?.foundationId ?? ""
  );
  const { data: recipientGrants, isLoading: recipientGrantsLoading } = useNonprofitGrants(
    grant?.nonprofitId ?? ""
  );

  if (grantLoading) {
    return <PageSkeleton />;
  }

  if (!grant) {
    return (
      <div className="w-full px-4 py-6">
        <p className="text-sm text-zinc-500">Grant not found.</p>
        <Link
          href={NON_PROFITS_PAGES.HOME}
          className="mt-2 inline-block text-xs text-blue-600 hover:underline dark:text-blue-400"
        >
          Back to Non-Profits
        </Link>
      </div>
    );
  }

  const amountDisplay = grant.amount != null ? formatCurrency(grant.amount) : "—";
  const assetPct = formatPct(grant.amount, foundation?.totalAssets ?? null);

  const metaParts: string[] = ["Grant"];
  if (grant.filingYear) metaParts.push(`FY ${grant.filingYear}`);
  if (grant.date) metaParts.push(formatDate(grant.date));
  metaParts.push(truncateHash(grant.sourceRowHash));

  const foundationAssets =
    foundation?.totalAssets != null ? formatAssets(foundation.totalAssets) : "";
  const foundationEin = foundation?.ein ? `EIN ${foundation.ein}` : "";

  return (
    <div className="w-full px-4 py-6">
      {/* Breadcrumb — index 0 */}
      <div className="animate-entrance" style={{ animationDelay: "0s" }}>
        <PageBreadcrumbs
          currentLabel={grant.purposeText ?? "Grant"}
          searchId={searchId}
          middle={
            foundation
              ? {
                  label: foundation.name,
                  href: NON_PROFITS_PAGES.FOUNDATION(foundation.id, searchId),
                }
              : undefined
          }
        />
      </div>

      {/* Row 1: Amount + Purpose — index 1 */}
      <div
        className="animate-entrance flex min-w-0 items-baseline gap-3"
        style={{ animationDelay: "0.07s" }}
      >
        <span className="shrink-0 text-4xl font-extrabold tabular-nums text-zinc-900 dark:text-zinc-50">
          {amountDisplay}
        </span>
        {grant.purposeText && (
          <span className="min-w-0 truncate text-lg font-normal text-zinc-600 dark:text-zinc-400">
            {grant.purposeText}
          </span>
        )}
      </div>

      {/* Row 2: Entity ledger */}
      <div className="mt-4 space-y-1.5">
        {/* FROM row — index 2 */}
        <div
          className="animate-entrance flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-0.5"
          style={{ animationDelay: "0.14s" }}
        >
          <span className="w-8 shrink-0 text-xs font-normal uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            FROM
          </span>
          {foundationLoading ? (
            <Skeleton className="inline-block h-4 w-64" />
          ) : foundation ? (
            <Link
              href={NON_PROFITS_PAGES.FOUNDATION(foundation.id, searchId)}
              className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
            >
              {foundation.name}
            </Link>
          ) : (
            <span className="text-zinc-500 dark:text-zinc-400">Unknown Foundation</span>
          )}
          {foundation?.location && (
            <span className="text-sm text-zinc-500 dark:text-zinc-400">{foundation.location}</span>
          )}
          {foundationEin && (
            <span className="text-sm tabular-nums text-zinc-500 dark:text-zinc-400">
              {foundationEin}
            </span>
          )}
          {foundationAssets && (
            <span className="text-sm tabular-nums text-zinc-500 dark:text-zinc-400">
              {foundationAssets}
            </span>
          )}
          {assetPct && (
            <span className="text-sm tabular-nums text-zinc-400 dark:text-zinc-500">
              ({assetPct})
            </span>
          )}
        </div>

        {/* TO row — index 3 */}
        <div
          className="animate-entrance flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-0.5"
          style={{ animationDelay: "0.21s" }}
        >
          <span className="w-8 shrink-0 text-xs font-normal uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            TO
          </span>
          {nonprofit && !nonprofitLoading ? (
            <Link
              href={NON_PROFITS_PAGES.NONPROFIT(nonprofit.id, {
                searchId,
                grantId: id,
              })}
              className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
            >
              {nonprofit.name}
            </Link>
          ) : grant.nonprofitId && nonprofitLoading ? (
            <Skeleton className="inline-block h-4 w-48" />
          ) : (
            <span className="text-zinc-500 dark:text-zinc-400">Unknown Recipient</span>
          )}
          {nonprofit?.location && (
            <span className="text-sm text-zinc-500 dark:text-zinc-400">{nonprofit.location}</span>
          )}
        </div>
      </div>

      {/* Row 3: Metadata line — index 4 */}
      <p
        className="animate-entrance mt-4 text-sm text-zinc-400 dark:text-zinc-500"
        style={{ animationDelay: "0.28s" }}
      >
        {metaParts.join(" · ")}
      </p>

      {/* Related grants — index 5 / 6 */}
      <div className="mt-8 border-t border-zinc-100 pt-6 dark:border-zinc-800">
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
          <div className="animate-entrance" style={{ animationDelay: "0.35s" }}>
            <RelatedGrantsList
              title="More from this funder"
              grants={funderGrants}
              isLoading={funderGrantsLoading}
              currentGrantId={id}
              totalCount={funderGrants?.length}
              seeAllLink={
                foundation && funderGrants && funderGrants.length > RELATED_LIMIT ? (
                  <Link
                    href={NON_PROFITS_PAGES.FOUNDATION(foundation.id, searchId)}
                    className="text-xs text-zinc-400 hover:text-zinc-600 hover:underline dark:text-zinc-500 dark:hover:text-zinc-300"
                  >
                    See all {pluralize("grant", funderGrants.length, true)} →
                  </Link>
                ) : null
              }
            />
          </div>
          {grant.nonprofitId && (
            <div className="animate-entrance" style={{ animationDelay: "0.42s" }}>
              <RelatedGrantsList
                title="More to this recipient"
                grants={recipientGrants}
                isLoading={recipientGrantsLoading}
                currentGrantId={id}
                totalCount={recipientGrants?.length}
                seeAllLink={
                  nonprofit && recipientGrants && recipientGrants.length > RELATED_LIMIT ? (
                    <Link
                      href={NON_PROFITS_PAGES.NONPROFIT(nonprofit.id, {
                        searchId,
                        grantId: id,
                      })}
                      className="text-xs text-zinc-400 hover:text-zinc-600 hover:underline dark:text-zinc-500 dark:hover:text-zinc-300"
                    >
                      See all {pluralize("grant", recipientGrants.length, true)} →
                    </Link>
                  ) : null
                }
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
