import { useQuery } from "@tanstack/react-query";
import { isPast, parseISO } from "date-fns";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList";
import type { Grant } from "@/types/v2/grant";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { GrantTitleDropdown } from "./GrantTitleDropdown";
import { useGrantFormStore } from "./store";
import { TrackSelection } from "./TrackSelection";

interface SearchGrantProgramProps {
  grantToEdit?: Grant;
  communityUID: string;
  chainId: number;
  setValue: (
    field: string,
    value: string | undefined,
    options?: {
      shouldValidate: boolean;
    }
  ) => void;
  watch: (field: string) => any;
  searchForProgram?: string | string[];
  canAdd?: boolean;
}

export function SearchGrantProgram({
  grantToEdit,
  communityUID,
  chainId,
  setValue,
  watch,
  searchForProgram,
  canAdd = true,
}: SearchGrantProgramProps) {
  const [selectedProgram, setSelectedProgram] = useState<GrantProgram | null>(null);
  const [hasAttemptedAutoSelect, setHasAttemptedAutoSelect] = useState<boolean>(false);
  const { formData, updateFormData, flowType } = useGrantFormStore();
  const pathname = usePathname();
  const isEditing = pathname.includes("/edit");

  // Use React Query to fetch programs
  const { data: allPrograms = [], isLoading } = useQuery({
    queryKey: ["programs", communityUID, searchForProgram],
    queryFn: async () => {
      if (!communityUID) return [];

      try {
        const [result, error] = await fetchData(INDEXER.COMMUNITY.PROGRAMS(communityUID));

        if (error) {
          console.error("Error fetching programs:", error);
          return [];
        }

        const filteredResult = result.filter((program: GrantProgram) => {
          if (!program.metadata?.endsAt || flowType !== "program") return true;

          const endsAt = parseISO(program.metadata.endsAt);
          return !isPast(endsAt);
        });

        let programsList = filteredResult;

        // Filter programs if searchForProgram is specified
        if (searchForProgram) {
          programsList = filteredResult.filter((program: GrantProgram) => {
            const title = program.metadata?.title?.toLowerCase() || "";
            if (Array.isArray(searchForProgram)) {
              return searchForProgram.some((term) => title.includes(term.toLowerCase()));
            }
            return title.includes(searchForProgram.toLowerCase());
          });
        } else {
          // Sort alphabetically
          programsList = filteredResult.sort((a: GrantProgram, b: GrantProgram) => {
            const aTitle = a.metadata?.title || "";
            const bTitle = b.metadata?.title || "";
            if (aTitle < bTitle) return -1;
            if (aTitle > bTitle) return 1;
            return 0;
          });
        }

        return programsList;
      } catch (err) {
        console.error("Failed to fetch programs:", err);
        return [];
      }
    },
    enabled: !!communityUID,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Handle auto-selection for editing mode
  useEffect(() => {
    if (
      isEditing &&
      allPrograms?.length > 0 &&
      grantToEdit?.details?.programId &&
      !hasAttemptedAutoSelect
    ) {
      const editingProgramId = grantToEdit.details.programId.split("_")[0];
      const matchingProgram = allPrograms.find(
        (program: GrantProgram) => program.programId === editingProgramId
      );

      if (matchingProgram) {
        setSelectedProgram(matchingProgram);
        // Use just programId (no chainId suffix) - service layer normalizes if needed
        setValue("programId", matchingProgram.programId);
        if (!formData.title) {
          setValue("title", matchingProgram.metadata?.title, {
            shouldValidate: true,
          });
        }
      }

      // Mark that we've attempted auto-selection to prevent endless loops
      setHasAttemptedAutoSelect(true);
    }
  }, [allPrograms, isEditing, grantToEdit, hasAttemptedAutoSelect, setValue, formData.title]);

  const programIdWatch = watch("programId");

  // Reset selected program when programId is cleared
  useEffect(() => {
    if (!programIdWatch && !isEditing) {
      setSelectedProgram(null);
    }
  }, [programIdWatch, isEditing]);

  return (
    <div className="w-full">
      {isLoading ? (
        <div className="bg-zinc-100 p-3 text-sm ring-1 ring-zinc-200 rounded dark:bg-zinc-900">
          Loading Grants...
        </div>
      ) : !communityUID ? (
        <div className="bg-zinc-100 p-3 text-sm ring-1 ring-zinc-200 rounded dark:bg-zinc-900">
          Select a community to proceed
        </div>
      ) : (
        <>
          <GrantTitleDropdown
            chainId={chainId}
            list={allPrograms}
            setValue={setValue}
            setSelectedProgram={setSelectedProgram}
            type={"Program"}
            grantToEdit={grantToEdit}
            selectedProgram={selectedProgram}
            prefixUnselected="Select"
            buttonClassname={`w-full max-w-full ${
              isEditing ? "opacity-70 pointer-events-none" : ""
            }`}
            canAdd={canAdd && !isEditing}
            canSearch={!isEditing}
          />

          {/* Always show track selection if we have a program ID, either from selected program or from form data */}
          {(selectedProgram || formData.programId) && (
            <TrackSelection
              // Use just programId (no chainId suffix) - trackService normalizes if needed
              programId={selectedProgram?.programId || formData.programId}
              selectedTrackIds={formData.selectedTrackIds || []}
              onTrackSelectionChange={(trackIds) => {
                // Allow track selection in both edit and create modes
                updateFormData({ selectedTrackIds: trackIds });
              }}
              disabled={false} // Never disable track selection
            />
          )}
        </>
      )}
    </div>
  );
}
