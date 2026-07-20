"use client";

/**
 * Soft dashboard primitives (v3). Styling is Tailwind utilities driven by the
 * `--sf-*` tokens (registered in tailwind.config.js as the `sf` scale); the
 * token definitions + `.dark` overrides live in dashboard-soft.css.
 */

import type { LucideIcon } from "lucide-react";
import type React from "react";
import { Link } from "@/src/components/navigation/Link";
import { cn } from "@/utilities/tailwind";
import { SoftIcon } from "./SoftIcon";
import { BTN_BASE, BTN_MD, BTN_OUTLINE, BTN_PRIMARY, BTN_SM, SK } from "./soft-classes";

export type BadgeTone = "brand" | "green" | "amber" | "orange" | "red" | "blue" | "gray";

export type ModuleStatus = "loading" | "empty" | "error" | "ready";

export interface TileRow {
  icon: LucideIcon;
  /** Optional logo (project/community). Falls back to `icon` when absent. */
  imageUrl?: string;
  label: string;
  badge?: { tone: BadgeTone; label: string };
  /**
   * Deep-link to the page this row's work lives on (e.g. a project's milestones,
   * a community's pending applications). When set, the row renders as its own
   * link on the overview tile — layered above the tile's "open module" click so
   * the pill/row navigates straight to the item instead of the module overview.
   */
  href?: string;
}

export interface ModuleSummary {
  big: number | string;
  rows: TileRow[];
}

/* ── Section (drill-in wrapper) ───────────────────────────────── */

export function Section({
  id,
  icon,
  title,
  sub,
  action,
  soft,
  children,
}: {
  id?: string;
  icon?: string;
  title: string;
  sub?: string;
  action?: React.ReactNode;
  /** Reserved for callers that want to opt into the card treatment explicitly; the
   *  base Section now always matches the platform's standard card (border + subtle
   *  shadow), so this is currently a no-op kept for call-site compatibility. */
  soft?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex scroll-mt-5 flex-col gap-4 rounded-sf-card border border-sf-line bg-sf-card px-6 py-[22px]",
        soft && "border-sf-line"
      )}
      id={id}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-[3px]">
          <h2 className="m-0 flex items-center gap-[11px] text-2xl font-bold tracking-[-0.02em] text-sf-heading">
            {icon ? <SoftIcon name={icon} className="h-[22px] w-[22px] text-brand-600" /> : null}
            {title}
          </h2>
          {sub ? <p className="m-0 text-[13.5px] text-sf-muted">{sub}</p> : null}
        </div>
        {action ?? null}
      </div>
      {children}
    </section>
  );
}

/* ── Empty / error / warn ─────────────────────────────────────── */

/** A primary/secondary CTA — either a route (`href`) or a click handler (`onClick`). */
export type EmptyAction = { label: string; icon?: string } & (
  | { href: string }
  | { onClick: () => void }
);

function EmptyActionButton({ action, variant }: { action: EmptyAction; variant: string }) {
  const className = cn(BTN_BASE, BTN_MD, variant);
  const inner = (
    <>
      {action.icon ? <SoftIcon name={action.icon} className="h-4 w-4" /> : null}
      {action.label}
    </>
  );
  return "href" in action ? (
    <Link className={className} href={action.href}>
      {inner}
    </Link>
  ) : (
    <button className={className} onClick={action.onClick} type="button">
      {inner}
    </button>
  );
}

export function EmptyState({
  icon,
  brand,
  title,
  body,
  primary,
  secondary,
  action,
  subtleLink,
}: {
  icon: string;
  brand?: boolean;
  title: string;
  body: string;
  primary?: EmptyAction;
  secondary?: EmptyAction;
  /** Custom action node (e.g. a dialog trigger) rendered in the actions row. */
  action?: React.ReactNode;
  /** Muted underlined link below the CTAs — either a route (`href`) or a click handler (e.g. open a modal). */
  subtleLink?: { label: string; href: string } | { label: string; onClick: () => void };
}) {
  const subtleClass =
    "mt-3.5 text-[13px] text-sf-muted underline underline-offset-2 hover:text-sf-heading";
  return (
    <div className="flex flex-col items-center gap-1 rounded-sf-tile border-[1.5px] border-dashed border-sf-line-strong bg-sf-elev px-6 py-11 text-center">
      <div
        className={cn(
          "mb-4 grid h-14 w-14 place-items-center rounded-[17px]",
          brand ? "bg-brand-100" : "bg-sf-chip"
        )}
      >
        <SoftIcon
          name={icon}
          className={cn("h-[26px] w-[26px]", brand ? "text-brand-600" : "text-sf-muted")}
        />
      </div>
      <h3 className="m-0 text-lg font-bold tracking-[-0.01em] text-sf-heading">{title}</h3>
      <p className="mx-0 mb-0 mt-1.5 max-w-[390px] text-[13.5px] leading-[1.55] text-sf-muted">
        {body}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2.5">
        {primary ? <EmptyActionButton action={primary} variant={BTN_PRIMARY} /> : null}
        {secondary ? <EmptyActionButton action={secondary} variant={BTN_OUTLINE} /> : null}
        {action ?? null}
      </div>
      {subtleLink ? (
        "href" in subtleLink ? (
          <Link className={subtleClass} href={subtleLink.href}>
            {subtleLink.label}
          </Link>
        ) : (
          <button type="button" className={subtleClass} onClick={subtleLink.onClick}>
            {subtleLink.label}
          </button>
        )
      ) : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center gap-[14px] rounded-sf-tile border border-red-200 bg-red-50 px-[18px] py-4 dark:border-red-500/[.34] dark:bg-red-500/[.12]">
      <SoftIcon name="alert" className="h-5 w-5 flex-none text-red-600 dark:text-red-300" />
      <p className="m-0 flex-1 text-[13.5px] font-medium text-red-600 dark:text-red-300">
        {message}
      </p>
      {onRetry ? (
        <button type="button" className={cn(BTN_BASE, BTN_SM, BTN_PRIMARY)} onClick={onRetry}>
          <SoftIcon name="refresh" className="h-4 w-4" />
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function WarnBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-3 rounded-sf-tile border border-amber-200 bg-amber-50 px-4 py-[13px] dark:border-amber-500/[.34] dark:bg-amber-500/[.12]">
      <SoftIcon
        name="alert"
        className="h-[18px] w-[18px] flex-none text-amber-700 dark:text-amber-400"
      />
      <p className="m-0 text-[13px] font-medium text-amber-700 dark:text-amber-400">{children}</p>
    </div>
  );
}

/* ── Stat tiles ───────────────────────────────────────────────── */

export interface StatItem {
  n: React.ReactNode;
  l: string;
  // Colors mirror the platform's application-status palette: pending → blue,
  // approved → green (see applicationStatusBadge.tsx). `brand` is the mint accent.
  tone?: "brand" | "amber" | "green" | "blue";
}

function statSurface(tone: StatItem["tone"]): string {
  if (tone === "brand") {
    return "border-sf-ink bg-sf-ink dark:border-brand-500/[.32] dark:bg-brand-500/[.15]";
  }
  return "border-sf-line bg-sf-elev";
}

function statNumber(tone: StatItem["tone"]): string {
  if (tone === "brand") return "text-white";
  if (tone === "amber") return "text-amber-700 dark:text-amber-400";
  if (tone === "blue") return "text-blue-700 dark:text-blue-400";
  if (tone === "green") return "text-green-700 dark:text-green-400";
  return "text-sf-heading";
}

export function StatTiles({ items }: { items: StatItem[] }) {
  return (
    <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(148px,1fr))]">
      {items.map((s) => (
        <div key={s.l} className={cn("rounded-sf-tile border p-[18px]", statSurface(s.tone))}>
          <div
            className={cn(
              "text-[34px] font-[750] leading-none tracking-[-0.03em]",
              statNumber(s.tone)
            )}
          >
            {s.n}
          </div>
          <div
            className={cn(
              "mt-2 text-[13px] font-medium",
              s.tone === "brand" ? "text-white/[.66]" : "text-sf-muted"
            )}
          >
            {s.l}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Skeleton ─────────────────────────────────────────────────── */

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-sf-tile border border-sf-line bg-sf-card">
      {Array.from({ length: count }, (_, i) => (
        <div
          className="flex items-center gap-[14px] px-4 py-[15px] [&+&]:border-t [&+&]:border-sf-line"
          key={`sk-li-${i}`}
        >
          <span className={cn(SK, "h-9 w-9 !rounded-[9px]")} />
          <div className="min-w-0 flex-1">
            <span className={cn(SK, "mb-2 block h-[13px] w-3/5")} />
            <span className={cn(SK, "block h-[11px] w-[35%]")} />
          </div>
          <span className={cn(SK, "h-[22px] w-[70px] !rounded-full")} />
        </div>
      ))}
    </div>
  );
}
