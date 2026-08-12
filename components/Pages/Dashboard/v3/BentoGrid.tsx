"use client";

import { BentoTileLink } from "./BentoTileLink";
import type { DashModule } from "./module";

/**
 * Route-based bento overview: one link tile per active module, laid out in the
 * design's 6-column grid. Each tile navigates to `/dashboard/[module]`.
 *
 * (The `wide` heuristic — first two tiles span 3 cols, otherwise 2 — mirrors
 * the in-place BentoOverview so the overview looks identical.)
 */
export function BentoGrid({ modules }: { modules: DashModule[] }) {
  const n = modules.length;
  return (
    <div className="grid grid-cols-2 gap-[14px] min-[980px]:grid-cols-6">
      {modules.map((module, i) => (
        <BentoTileLink key={module.key} module={module} wide={n <= 2 || (i < 2 && n !== 3)} />
      ))}
    </div>
  );
}
