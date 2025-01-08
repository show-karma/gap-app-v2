import { ProgramFilter } from "./ProgramFilter";
import { ProjectFilter } from "./ProjectFilter";

export const CommunityImpactFilterRow = () => {
  return (
    <div className="px-3 py-4 bg-gray-100 dark:bg-zinc-900 rounded-lg flex flex-row justify-between items-center w-full gap-16 max-md:flex-col max-md:gap-4 max-md:justify-start max-md:items-start">
      <div className="flex flex-row gap-4 items-center flex-1">
        <h3 className="text-slate-800 dark:text-zinc-100 text-xl font-semibold font-['Inter'] leading-normal">
          Filter by
        </h3>
      </div>
      <div className="flex flex-row gap-4 items-center flex-1 flex-wrap">
        <ProgramFilter />
        <ProjectFilter />
      </div>
    </div>
  );
};
