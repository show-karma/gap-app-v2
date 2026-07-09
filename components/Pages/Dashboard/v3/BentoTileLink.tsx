"use client";

import { Link } from "@/src/components/navigation/Link";
import { cn } from "@/utilities/tailwind";
import { TileFace, TileFaceSkeleton } from "./BentoTileFace";
import type { DashModule } from "./module";
import { TILE_BASE, tileSpanClasses } from "./soft-classes";

/**
 * A bento tile as a navigation link to `/dashboard/[module]` — the route-based
 * counterpart to BentoTile. Same face; a real `<Link>` instead of a drill-in
 * button, so browser Back/Forward work natively.
 *
 * The tile→drill-in morph animation is intentionally not wired here yet — a
 * CSS hover lift stands in until the cross-route View Transition is added.
 */
export function BentoTileLink({ module, wide }: { module: DashModule; wide?: boolean }) {
  const { key, status } = module;

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

  return (
    <Link
      href={`/dashboard/${key}`}
      className={cn(
        TILE_BASE,
        tileSpanClasses(wide),
        "transition-transform duration-150 hover:-translate-y-[3px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
      )}
      data-comment-anchor={`tile-${key}`}
    >
      <TileFace module={module} />
    </Link>
  );
}
