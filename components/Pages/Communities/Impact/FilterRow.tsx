"use client";
import { usePathname } from "next/navigation";
import { ProgramFilter } from "./ProgramFilter";
import { ProjectFilter } from "./ProjectFilter";

export const CommunityImpactFilterRow = () => {
  const pathname = usePathname();
  const isProjectDiscovery = pathname?.includes("project-discovery");
  if (isProjectDiscovery) return null;
  return (
    <div className="px-3 py-4 bg-gray-100 dark:bg-zinc-900 rounded-lg flex flex-row justify-between items-center w-full gap-16 max-md:flex-col max-md:gap-4 max-md:justify-start max-md:items-start">
      <div className="flex flex-row gap-8 items-center">
        <h3 className="text-slate-800 dark:text-zinc-100 text-xl font-semibold font-['Inter'] leading-normal">
          Filter by
        </h3>
        <div className="flex flex-row w-max max-w-full">
          <ProgramFilter />
        </div>
        <div className="flex flex-row w-max max-w-full">
          <ProjectFilter />
        </div>
      </div>
    </div>
  );
};
