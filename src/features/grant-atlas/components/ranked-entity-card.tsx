"use client";

import { Building2, HandCoins, Landmark, MapPin } from "lucide-react";
import Link from "next/link";
import { PAGES } from "@/utilities/pages";
import type { RankedEntity } from "../types/philanthropy";

function formatCurrency(amount: number | null): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getEntityHref(entity: RankedEntity): string {
  switch (entity.entityType) {
    case "foundation":
      return PAGES.GRANT_ATLAS.FOUNDATION(entity.id);
    case "nonprofit":
      return PAGES.GRANT_ATLAS.NONPROFIT(entity.id);
    case "grant":
      return PAGES.GRANT_ATLAS.GRANT(entity.id);
  }
}

function EntityTypeBadge({ type }: { type: RankedEntity["entityType"] }) {
  const config = {
    foundation: {
      icon: Landmark,
      label: "Foundation",
      bg: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    },
    nonprofit: {
      icon: Building2,
      label: "Nonprofit",
      bg: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    },
    grant: {
      icon: HandCoins,
      label: "Grant",
      bg: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    },
  }[type];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${config.bg}`}
    >
      <config.icon className="size-3" />
      {config.label}
    </span>
  );
}

function getTitle(entity: RankedEntity): string {
  if (entity.name) return entity.name;
  if (entity.description) return entity.description;
  return "Untitled";
}

function getSubtitle(entity: RankedEntity): string | null {
  // For grants, show description if name exists (won't be used as title)
  // For foundations/nonprofits, show description
  if (entity.entityType === "grant" && entity.name && entity.description) {
    return entity.description;
  }
  if (entity.entityType !== "grant" && entity.description && entity.name) {
    return entity.description;
  }
  return null;
}

interface RankedEntityCardProps {
  entity: RankedEntity;
  rank: number;
}

export function RankedEntityCard({ entity, rank }: RankedEntityCardProps) {
  const href = getEntityHref(entity);
  const title = getTitle(entity);
  const subtitle = getSubtitle(entity);
  const grantFoundationLabel = entity.entityType === "grant" ? entity.foundationName : null;

  return (
    <Link
      href={href}
      className="block rounded-lg border border-zinc-200 bg-white p-5 transition-colors hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {/* Type badge + EIN */}
          <div className="flex items-center gap-2">
            <EntityTypeBadge type={entity.entityType} />
            {entity.ein && <span className="text-xs text-zinc-400">EIN: {entity.ein}</span>}
          </div>

          {/* Title */}
          <h3 className="mt-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>

          {/* Subtitle / description */}
          {subtitle && <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{subtitle}</p>}

          {grantFoundationLabel && (
            <p className="mt-1 text-sm text-zinc-500">
              From{" "}
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                {grantFoundationLabel}
              </span>
            </p>
          )}

          {/* Location */}
          {entity.location && (
            <div className="mt-2 flex items-center gap-1 text-sm text-zinc-500">
              <MapPin className="size-3.5" />
              {entity.location}
            </div>
          )}
        </div>

        {/* Rank number */}
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          {rank}
        </span>
      </div>

      {/* Financial data row — Candid-style */}
      {(entity.totalAssets != null || entity.amount != null || entity.filingYear) && (
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          {entity.totalAssets != null && (
            <div>
              <span className="text-xs text-zinc-400">Total assets</span>
              <p className="text-sm font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
                {formatCurrency(entity.totalAssets)}
              </p>
            </div>
          )}
          {entity.amount != null && (
            <div>
              <span className="text-xs text-zinc-400">Grant amount</span>
              <p className="text-sm font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
                {formatCurrency(entity.amount)}
              </p>
            </div>
          )}
          {entity.filingYear && (
            <div>
              <span className="text-xs text-zinc-400">Filing year</span>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {entity.filingYear}
              </p>
            </div>
          )}
        </div>
      )}
    </Link>
  );
}
