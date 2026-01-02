"use client";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useQueryState } from "nuqs";
import { useCommunityPrograms } from "@/hooks/usePrograms";
import { SearchWithValueDropdown } from "./SearchWithValueDropdown";

interface ProgramFilterProps {
  defaultProgramSelected?: string;
  onChange?: (programId: string | null) => void;
}

export const ProgramFilter = ({ defaultProgramSelected, onChange }: ProgramFilterProps) => {
  const { communityId } = useParams();

  const { data, isLoading } = useCommunityPrograms(communityId as string);
  const programs = data?.map((program) => ({
    title: program.metadata?.title || "",
    value: program.programId || "", // Use programId only (backend handles composite format internally)
    // id: program.programId || "",
  }));

  const [selectedProgramId, changeSelectedProgramIdQuery] = useQueryState<string | null>(
    "programId",
    {
      defaultValue: defaultProgramSelected || null,
      serialize: (value) => {
        // Normalize programId (remove chainId suffix if present) when writing to URL
        if (!value) return "";
        const normalized = value.includes("_") ? value.split("_")[0] : value;
        return normalized;
      },
      parse: (value) => {
        // Normalize programId when reading from URL (remove chainId suffix if present)
        if (!value) return null;
        const normalized = value.includes("_") ? value.split("_")[0] : value;
        return normalized;
      },
    }
  );
  const selectedProgram = programs?.find((program) => program.value === selectedProgramId);

  return (
    <div className="flex flex-row gap-4 items-center flex-1 max-w-[400px]">
      <Image
        src={"/icons/program.svg"}
        alt="program"
        width={24}
        height={24}
        className="w-6 h-6 min-w-6 max-w-6 min-h-6 max-h-6"
      />
      <p className="text-gray-800 dark:text-zinc-100 text-base font-semibold leading-normal">
        Program
      </p>

      <SearchWithValueDropdown
        id="filter-by-programs"
        list={programs || []}
        onSelectFunction={(value: string) => {
          onChange?.(value) || changeSelectedProgramIdQuery(value);
        }}
        type={"Programs"}
        selected={selectedProgram ? [selectedProgram.title as string] : []}
        prefixUnselected="All"
        buttonClassname="w-full max-w-full"
        isMultiple={false}
        cleanFunction={() => onChange?.(null) || changeSelectedProgramIdQuery(null)}
      />
    </div>
  );
};
