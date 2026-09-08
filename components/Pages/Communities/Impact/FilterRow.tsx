"use client";
import { ProgramFilter } from "./ProgramFilter";
import { ProjectFilter } from "./ProjectFilter";

/**
 * The impact index's filters.
 *
 * Rendered by `impact/page.tsx` rather than by the impact layout. It used to sit
 * in the layout and return null on `/impact/project-discovery` after a
 * `usePathname()` test — a URL read on both routes, to answer a question the
 * route tree already answers by which page renders it.
 */
export const CommunityImpactFilterRow = () => {
  return (
    <div className="flex flex-row flex-wrap items-end gap-5 w-full max-lg:flex-col max-lg:items-stretch">
      <ProgramFilter />
      <ProjectFilter />
    </div>
  );
};
