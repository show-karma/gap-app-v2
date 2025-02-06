"use client";
import { getAllProgramsOfCommunity } from "@/utilities/registry/getAllProgramsOfCommunity";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useQueryState } from "nuqs";
import { SearchWithValueDropdown } from "./SearchWithValueDropdown";

interface ProgramFilterProps {
  defaultProgramSelected?: string;
  onChange?: (programId: string | null) => void;
}

export const ProgramFilter = ({
  defaultProgramSelected,
  onChange,
}: ProgramFilterProps) => {
  const { communityId } = useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["programs"],
    queryFn: () => getAllProgramsOfCommunity(communityId as string),
  });
  const programs = data?.map((program) => ({
    title: program.metadata?.title || "",
    value: program.programId || "",
    // id: program.programId || "",
  }));

  const [selectedProgramId, changeSelectedProgramIdQuery] = useQueryState<
    string | null
  >("programId", {
    defaultValue: defaultProgramSelected || null,
    serialize: (value) => value ?? "",
    parse: (value) => value || null,
  });
  const selectedProgram = programs?.find(
    (program) => program.value === selectedProgramId
  );

  return (
    <div className="flex flex-row gap-4 items-center flex-1 max-w-[450px]">
      <Image src={"/icons/program.svg"} alt="program" width={24} height={24} />
      <p className="text-gray-800 dark:text-zinc-100 text-base font-semibold leading-normal">
        Program
      </p>

      <SearchWithValueDropdown
        list={programs || []}
        onSelectFunction={(value: string) => {
          onChange?.(value) || changeSelectedProgramIdQuery(value);
        }}
        type={"Programs"}
        selected={selectedProgram ? [selectedProgram.title as string] : []}
        prefixUnselected="All"
        buttonClassname="w-full max-w-full"
        isMultiple={false}
        cleanFunction={() =>
          onChange?.(null) || changeSelectedProgramIdQuery(null)
        }
      />
    </div>
  );
};
