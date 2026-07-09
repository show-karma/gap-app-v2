"use client";

import type { MouseEvent } from "react";
import { Link } from "@/src/components/navigation/Link";
import { cn } from "@/utilities/tailwind";
import { TileFace, TileFaceSkeleton } from "./BentoTileFace";
import type { DashModule } from "./module";
import { moduleTransitionName, TILE_BASE, tileSpanClasses } from "./soft-classes";
import { supportsViewTransitions, useDashboardTransition } from "./useDashboardTransition";

/**
 * A bento tile as a navigation link to `/dashboard/[module]` — the route-based
 * counterpart to BentoTile. Same face; a real `<Link>` so browser Back/Forward
 * work natively.
 *
 * The tile and its drill-in share a `view-transition-name`, so opening/closing
 * a module morphs the box across the route change (the cross-route counterpart
 * to the old framer `layoutId`). A plain link click drives the navigation where
 * the View Transitions API is unavailable (or modified/middle clicks), so
 * prefetch, open-in-new-tab and no-JS all keep working.
 */
export function BentoTileLink({ module, wide }: { module: DashModule; wide?: boolean }) {
  const { key, status } = module;
  const navigate = useDashboardTransition();
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

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Defer to the browser for new-tab / middle clicks and where the View
    // Transitions API isn't available — those get a normal link navigation.
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    if (!supportsViewTransitions()) return;
    e.preventDefault();
    navigate(href);
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      style={{ viewTransitionName: moduleTransitionName(key) }}
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
