"use client";
import { usePathname } from "next/navigation";
import { ProgramFilter } from "./ProgramFilter";
import { ProjectFilter } from "./ProjectFilter";

export const CommunityImpactFilterRow = () => {
  const pathname = usePathname();
  const isProjectDiscovery = pathname?.includes("project-discovery");

  if (isProjectDiscovery) return null;

  return (
    <div className="flex flex-row flex-wrap items-end gap-5 w-full max-lg:flex-col max-lg:items-stretch">
      <ProgramFilter />
      <ProjectFilter />
    </div>
  );
};
