/**
 * Tailwind class strings for the role-aware dashboard (v3).
 *
 * The design's `--sf-*` tokens (and their `.dark` overrides) live in
 * dashboard-soft.css and are registered in tailwind.config.js as the `sf`
 * color scale + `sf-card`/`sf-tile` radii. Because the palette is driven by
 * those CSS variables, most utilities below theme automatically in dark mode;
 * only the brand/status accents need explicit `dark:` variants.
 */

import type { BadgeTone } from "./primitives";

/* Buttons — size is separate from base so `btn-sm` doesn't fight `h-[42px]`. */
export const BTN_BASE =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border border-transparent font-semibold transition-[background-color,border-color,transform] duration-150 active:translate-y-px";
export const BTN_MD = "h-[42px] px-[18px] text-sm";
export const BTN_SM = "h-9 px-[14px] text-[13px]";
export const BTN_PRIMARY = "bg-brand-500 text-brand-950 hover:bg-brand-400";
export const BTN_OUTLINE = "border-sf-line-strong bg-sf-card text-sf-heading hover:bg-sf-elev";

/* Badges — light values match the tokens exactly; dark uses translucent tints. */
export const BADGE_BASE =
  "inline-flex items-center gap-[5px] whitespace-nowrap rounded-full border border-transparent px-[10px] py-[3px] text-[11.5px] font-[650]";

const BADGE_TONE: Record<BadgeTone, string> = {
  // Real green — matches the platform's application-status "approved" badge
  // (see FundingPlatform/ApplicationList/applicationStatusBadge.tsx). Used for
  // approved applications and "All caught up". `brand` stays the mint accent.
  green: "bg-green-100 text-green-800 dark:bg-green-500/[.16] dark:text-green-400",
  brand: "bg-brand-50 text-brand-700 dark:bg-brand-500/[.16] dark:text-brand-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/[.16] dark:text-amber-400",
  orange: "bg-orange-100 text-orange-600 dark:bg-orange-500/[.18] dark:text-orange-400",
  red: "bg-red-50 text-red-600 dark:bg-red-500/[.15] dark:text-red-300",
  blue: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300",
  gray: "bg-sf-chip text-sf-muted",
};

export const badgeClasses = (tone: BadgeTone) => `${BADGE_BASE} ${BADGE_TONE[tone]}`;

/* Icon-chip ("thumb"). Sizes come from the caller since they vary per context. */
export const THUMB_BASE =
  "flex-none grid place-items-center overflow-hidden bg-sf-chip text-sf-ink";
// Emphasis thumb: dark ink chip in light mode, brand chip in dark (ink inverts).
export const THUMB_BRAND = "bg-sf-ink text-white dark:bg-brand-500 dark:text-brand-950";

/* Skeleton block. */
export const SK = "animate-dashv3-pulse rounded-lg bg-sf-skeleton";

/* Bento tile shell — shared by the button (BentoTile) and link (BentoTileLink)
   variants so both render an identical face. Flat bordered card (rounded-xl +
   border, no shadow), theme-driven via the --sf-* tokens. */
export const TILE_BASE =
  "relative flex flex-col gap-3 rounded-sf-card border border-sf-line bg-sf-card p-5 text-left transition-colors hover:bg-sf-hover";

/**
 * Shared `view-transition-name` for a module's tile and its `/dashboard/[module]`
 * drill-in route.
 */
export const moduleTransitionName = (key: string) => `dash-module-${key}`;
export function tileSpanClasses(wide?: boolean): string {
  return wide
    ? "col-span-2 min-[640px]:col-span-1 min-[980px]:col-span-3"
    : "col-span-2 min-[640px]:col-span-1 min-[980px]:col-span-2";
}
