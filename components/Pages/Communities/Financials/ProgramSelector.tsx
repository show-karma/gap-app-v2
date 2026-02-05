"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import { useSelectedProgram } from "@/hooks/financials/useProgramFinancials";
import { useCommunityPrograms } from "@/hooks/usePrograms";
import { SearchWithValueDropdown } from "../Impact/SearchWithValueDropdown";

export function ProgramSelector() {
  const { communityId } = useParams();
  const { data: programs, isLoading } = useCommunityPrograms(communityId as string);
  const [selectedProgramId, setSelectedProgramId] = useSelectedProgram();

  const programOptions =
    programs?.map((program) => ({
      title: program.metadata?.title || "Untitled Program",
      value: program.programId || "",
    })) ?? [];

  const selectedProgram = programOptions.find((p) => p.value === selectedProgramId);

  return (
    <div className="flex flex-row gap-4 items-center flex-1 max-w-[400px]">
      <Image
        src="/icons/program.svg"
        alt="program"
        width={24}
        height={24}
        className="w-6 h-6 min-w-6 max-w-6 min-h-6 max-h-6"
      />
      <p className="text-gray-800 dark:text-zinc-100 text-base font-semibold leading-normal">
        Program
      </p>
      <SearchWithValueDropdown
        id="financials-program-selector"
        list={programOptions}
        onSelectFunction={(value: string) => {
          setSelectedProgramId(value);
        }}
        type="Programs"
        selected={selectedProgram ? [selectedProgram.title] : []}
        prefixUnselected="Select"
        buttonClassname="w-full max-w-full"
        isMultiple={false}
        cleanFunction={() => setSelectedProgramId("")}
        isLoading={isLoading}
      />
    </div>
  );
}
