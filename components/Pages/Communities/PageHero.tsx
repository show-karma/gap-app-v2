"use client";

import type { ReactNode } from "react";
import { cn } from "@/utilities/tailwind";

export interface KpiItem {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: "default" | "danger" | "success" | "warning" | "brand";
}

interface PageHeroProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  kpis?: KpiItem[];
  rightSlot?: ReactNode;
  className?: string;
  compact?: boolean;
}

const ACCENT_CLASS: Record<NonNullable<KpiItem["accent"]>, string> = {
  default: "text-foreground",
  danger: "text-red-600 dark:text-red-400",
  success: "text-emerald-600 dark:text-emerald-400",
  warning: "text-amber-600 dark:text-amber-400",
  brand: "text-brand-700 dark:text-brand-400",
};

export function PageHero({
  eyebrow,
  title,
  description,
  kpis,
  rightSlot,
  className,
  compact = false,
}: PageHeroProps) {
  const hasKpis = !!kpis && kpis.length > 0;
  const hasRight = hasKpis || !!rightSlot;

  return (
    <section
      className={cn("relative overflow-hidden", compact ? "mb-8" : "mb-10 md:mb-12", className)}
      aria-labelledby="page-hero-title"
    >
      <div
        className={cn(
          "grid gap-8 md:gap-12",
          hasRight ? "md:grid-cols-[1.3fr_1fr]" : "grid-cols-1"
        )}
      >
        <div>
          {eyebrow ? (
            <div className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-brand-700 dark:text-brand-400">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden />
              {eyebrow}
            </div>
          ) : null}

          <h1
            id="page-hero-title"
            className={cn(
              "font-semibold leading-[1.05] tracking-[-0.03em] text-foreground",
              compact ? "text-3xl md:text-4xl" : "text-4xl md:text-5xl lg:text-[52px]"
            )}
          >
            {title}
          </h1>

          {description ? (
            <p className="mt-4 max-w-prose text-base md:text-[17px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>

        {hasRight ? (
          <div className="flex flex-col justify-end gap-5">
            {rightSlot}
            {hasKpis ? <KpiStrip items={kpis!} /> : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function KpiStrip({ items }: { items: KpiItem[] }) {
  const cols = items.length >= 4 ? "sm:grid-cols-2 lg:grid-cols-2" : "sm:grid-cols-2";
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border",
        cols
      )}
    >
      {items.map((item, i) => (
        <div key={`${item.label}-${i}`} className="bg-background p-4 md:p-5">
          <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
            {item.label}
          </div>
          <div
            className={cn(
              "mt-1.5 text-2xl md:text-[26px] font-semibold tracking-[-0.02em]",
              ACCENT_CLASS[item.accent ?? "default"]
            )}
          >
            {item.value}
          </div>
          {item.sub ? <div className="mt-0.5 text-xs text-muted-foreground">{item.sub}</div> : null}
        </div>
      ))}
    </div>
  );
}
