"use client";
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

  const { data } = useCommunityPrograms(communityId as string);
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
    <div className="flex flex-col gap-1.5 flex-1 min-w-[220px] max-w-[400px]">
      <label
        htmlFor="filter-by-programs"
        className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground"
      >
        Choose Program
      </label>

      <SearchWithValueDropdown
        id="filter-by-programs"
        list={programs || []}
        onSelectFunction={(value: string) => {
          if (onChange) {
            onChange(value);
            return;
          }
          changeSelectedProgramIdQuery(value);
        }}
        type={"Programs"}
        selected={selectedProgram ? [selectedProgram.title as string] : []}
        prefixUnselected="All"
        buttonClassname="w-full max-w-full"
        isMultiple={false}
        cleanFunction={() => {
          if (onChange) {
            onChange(null);
            return;
          }
          changeSelectedProgramIdQuery(null);
        }}
      />
    </div>
  );
};
