import { isPast, parseISO } from "date-fns";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useCommunityPrograms } from "@/hooks/usePrograms";
import type { CommunityProgram } from "@/types/v2/community-program";
import type { Grant } from "@/types/v2/grant";
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
  const [selectedProgram, setSelectedProgram] = useState<CommunityProgram | null>(null);
  const [hasAttemptedAutoSelect, setHasAttemptedAutoSelect] = useState<boolean>(false);
  const { formData, updateFormData, flowType } = useGrantFormStore();
  const pathname = usePathname();
  const isEditing = pathname.includes("/edit");

  const { data: programs = [], isLoading, isError, refetch } = useCommunityPrograms(communityUID);

  // Program-flow hides already-ended programs; an optional searchForProgram
  // term narrows by title, otherwise the list is sorted alphabetically.
  const allPrograms = useMemo(() => {
    const active = programs.filter((program) => {
      if (!program.metadata?.endsAt || flowType !== "program") return true;
      const endsAt = parseISO(String(program.metadata.endsAt));
      return !isPast(endsAt);
    });

    if (searchForProgram) {
      return active.filter((program) => {
        const title = program.metadata?.title?.toLowerCase() || "";
        if (Array.isArray(searchForProgram)) {
          return searchForProgram.some((term) => title.includes(term.toLowerCase()));
        }
        return title.includes(searchForProgram.toLowerCase());
      });
    }

    return [...active].sort((a, b) => {
      const aTitle = a.metadata?.title || "";
      const bTitle = b.metadata?.title || "";
      if (aTitle < bTitle) return -1;
      if (aTitle > bTitle) return 1;
      return 0;
    });
  }, [programs, flowType, searchForProgram]);

  // Handle auto-selection for editing mode
  useEffect(() => {
    if (
      isEditing &&
      allPrograms?.length > 0 &&
      grantToEdit?.details?.programId &&
      !hasAttemptedAutoSelect
    ) {
      const editingProgramId = grantToEdit.details.programId.split("_")[0];
      const matchingProgram = allPrograms.find((program) => program.programId === editingProgramId);

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

  const handleRetryPrograms = () => {
    refetch();
  };

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
      ) : isError ? (
        <div className="flex items-center justify-between gap-3 bg-red-50 p-3 text-sm ring-1 ring-red-200 rounded text-red-900 dark:bg-red-950 dark:ring-red-900 dark:text-red-100">
          <span>Failed to load programs.</span>
          <button
            type="button"
            onClick={handleRetryPrograms}
            className="font-semibold underline underline-offset-2"
          >
            Retry
          </button>
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
