"use client";

import { motion } from "motion/react";
import { cn } from "@/utilities/tailwind";
import { TileFace, TileFaceSkeleton } from "./BentoTileFace";
import type { DashModule } from "./module";
import { BENTO_LAYOUT_TRANSITION, bentoLayoutId, TILE_BASE, tileSpanClasses } from "./soft-classes";

/**
 * A single bento tile (design "list" content variant) for the in-place
 * drill-in overview. The whole tile is one button that opens the full module
 * via `onOpen`, morphing into the drill-in through a shared `layoutId`.
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
    <motion.button
      type="button"
      layout
      layoutId={bentoLayoutId(key)}
      className={cn(TILE_BASE, tileSpanClasses(wide))}
      onClick={() => onOpen(key)}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      transition={BENTO_LAYOUT_TRANSITION}
      data-comment-anchor={`tile-${key}`}
    >
      <TileFace module={module} />
    </motion.button>
  );
}
