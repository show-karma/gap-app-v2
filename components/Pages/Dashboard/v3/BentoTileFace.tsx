"use client";

import { CheckCircle2 } from "lucide-react";
import { cn } from "@/utilities/tailwind";
import type { DashModule } from "./module";
import { SoftIcon } from "./SoftIcon";
import {
  BTN_BASE,
  BTN_PRIMARY,
  BTN_SM,
  badgeClasses,
  SK,
  THUMB_BASE,
  THUMB_BRAND,
} from "./soft-classes";

/**
 * The visual contents of a bento tile (icon row + summary rows / empty / error),
 * independent of whether the tile is a drill-in button (BentoTile) or a route
 * link (BentoTileLink). Kept separate so both wrappers render an identical face.
 */
export function TileFace({ module }: { module: DashModule }) {
  const { key, label, icon, brand, status, summary } = module;

  const isEmpty = status === "empty";
  const isError = status === "error";
  const rows =
    summary && summary.rows.length > 0
      ? summary.rows.slice(0, 3)
      : [
          {
            icon: CheckCircle2,
            label: "All caught up",
            badge: { tone: "gray" as const, label: "Clear" },
          },
        ];
  const showHeadcount = status === "ready" && Boolean(summary);

  return (
    <>
      <div className="flex items-center gap-2.5">
        <div className={cn("h-[34px] w-[34px] rounded-[10px]", THUMB_BASE, brand && THUMB_BRAND)}>
          <SoftIcon name={icon} className="h-5 w-5" />
        </div>
        <span className="text-[14.5px] font-[650] tracking-[-0.01em] text-sf-heading">{label}</span>
        {showHeadcount && summary ? (
          <span className={cn(badgeClasses("gray"), "ml-auto")}>{summary.big}</span>
        ) : null}
        <SoftIcon
          name="arrow"
          className={cn("h-4 w-4 text-sf-muted", showHeadcount ? "ml-2.5" : "ml-auto")}
        />
      </div>

      {isError ? (
        <p className="my-0.5 text-[12.5px] leading-[1.5] text-sf-muted">
          Couldn&apos;t load this section. Open to retry.
        </p>
      ) : isEmpty ? (
        <>
          <p className="my-0.5 text-[12.5px] leading-[1.5] text-sf-muted">{module.empty.prompt}</p>
          <span className={cn(BTN_BASE, BTN_SM, BTN_PRIMARY, "mt-auto self-start")}>
            {module.empty.cta.icon ? (
              <SoftIcon name={module.empty.cta.icon} className="h-4 w-4" />
            ) : null}
            {module.empty.cta.label}
          </span>
        </>
      ) : (
        <div className="mt-auto flex flex-col gap-2.5">
          {rows.map((r, i) => (
            <div
              className="flex min-w-0 items-center gap-[9px] text-[13px] font-[550] text-sf-ink-soft"
              key={`${key}-row-${i}`}
            >
              {r.imageUrl ? (
                <img
                  className="h-[18px] w-[18px] flex-none rounded-[5px] bg-sf-chip object-cover"
                  src={r.imageUrl}
                  alt=""
                />
              ) : (
                <r.icon className="h-[13px] w-[13px] flex-none text-sf-muted" aria-hidden />
              )}
              <span className="overflow-hidden text-ellipsis whitespace-nowrap">{r.label}</span>
              {r.badge ? (
                <span className={cn(badgeClasses(r.badge.tone), "ml-auto flex-none")}>
                  {r.badge.label}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/** The loading (skeleton) face — a tile with no data yet. */
export function TileFaceSkeleton() {
  return (
    <>
      <div className="flex items-center gap-2.5">
        <span className={cn(SK, "h-[34px] w-[34px] !rounded-[10px]")} />
        <span className={cn(SK, "h-[13px] w-[110px]")} />
      </div>
      <span className={cn(SK, "h-[30px] w-16")} />
      <span className={cn(SK, "h-[11px] w-[85%]")} />
    </>
  );
}
