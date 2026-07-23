"use client";

import { Link } from "@/src/components/navigation/Link";
import { cn } from "@/utilities/tailwind";
import { TileFace, TileFaceSkeleton } from "./BentoTileFace";
import type { DashModule } from "./module";
import { TILE_BASE, tileSpanClasses } from "./soft-classes";

/**
 * A bento tile as a navigation link to `/dashboard/[module]` — the route-based
 * counterpart to BentoTile. Same face; a plain `<Link>` so browser Back/Forward,
 * prefetch, open-in-new-tab and no-JS all work natively with no view-transition
 * box morph.
 */
export function BentoTileLink({ module, wide }: { module: DashModule; wide?: boolean }) {
  const { key, label, status } = module;
  const href = `/dashboard/${key}`;

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

  // The tile is a plain container; a stretched link fills it to open the module,
  // and any per-row deep-links (rendered inside TileFace) layer above it — so
  // clicking a pill/row navigates to that item, clicking elsewhere opens the
  // module. The stretched link is a SIBLING of the row links (not their parent),
  // so there is no invalid <a>-in-<a> nesting.
  return (
    <div
      className={cn(TILE_BASE, tileSpanClasses(wide), "relative")}
      data-comment-anchor={`tile-${key}`}
    >
      <Link
        aria-label={`Open ${label}`}
        className="absolute inset-0 rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
        href={href}
      />
      <TileFace module={module} />
    </div>
  );
}
