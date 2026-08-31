"use client";

import { cn } from "@/utilities/tailwind";
import { TileFace, TileFaceSkeleton } from "./BentoTileFace";
import type { DashModule } from "./module";
import { TILE_BASE, tileSpanClasses } from "./soft-classes";

/**
 * A single bento tile (design "list" content variant) for the in-place
 * drill-in overview. The whole tile is one button that opens the full module
 * via `onOpen`.
 *
 * The route-based overview uses BentoTileLink instead — same face, but a
 * navigation `<Link>` to `/dashboard/[module]`.
 */
export function BentoTile({
  module,
  wide,
  onOpen,
}: {
  module: DashModule;
  wide?: boolean;
  onOpen: (key: string) => void;
}) {
  const { key, label, status } = module;

  if (status === "loading") {
    return (
      <div
        className={cn(TILE_BASE, tileSpanClasses(wide), "cursor-default")}
        data-comment-anchor={`tile-${key}`}
      >
        <TileFaceSkeleton />
      </div>
    );
  }

  // A stretched button fills the tile to open the module; per-row deep-links
  // (inside TileFace) layer above it. The button is a SIBLING of the row links,
  // so no interactive element nests inside another.
  return (
    <div
      className={cn(TILE_BASE, tileSpanClasses(wide), "relative")}
      data-comment-anchor={`tile-${key}`}
    >
      <button
        aria-label={`Open ${label}`}
        className="absolute inset-0 rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
        onClick={() => onOpen(key)}
        type="button"
      />
      <TileFace module={module} />
    </div>
  );
}
