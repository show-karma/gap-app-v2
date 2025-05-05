import React, { useEffect, useState } from "react";
import { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { IGrantResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { GrantTitleDropdown } from "./GrantTitleDropdown";
import { TrackSelection } from "./TrackSelection";
import { useGrantFormStore } from "./store";
import { usePathname } from "next/navigation";

interface SearchGrantProgramProps {
  grantToEdit?: IGrantResponse;
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
  const [allPrograms, setAllPrograms] = useState<GrantProgram[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedProgram, setSelectedProgram] = useState<GrantProgram | null>(
    null
  );
  const [hasAttemptedAutoSelect, setHasAttemptedAutoSelect] =
    useState<boolean>(false);
  const { formData, updateFormData, flowType } = useGrantFormStore();
  const pathname = usePathname();
  const isEditing = pathname.includes("/edit");

  // Only fetch programs when community changes or on first load
  useEffect(() => {
    // Skip if we don't have a community UID
    if (!communityUID) return;

    const fetchPrograms = async () => {
      setIsLoading(true);
      try {
        const [result, error] = await fetchData(
          INDEXER.COMMUNITY.PROGRAMS(communityUID)
        );

        if (error) {
          console.error("Error fetching programs:", error);
          setAllPrograms([]);
          setIsLoading(false);
          return;
        }

        let programsList = result;

        // Filter programs if searchForProgram is specified
        if (searchForProgram) {
          programsList = result.filter((program: GrantProgram) => {
            const title = program.metadata?.title?.toLowerCase() || "";
            if (Array.isArray(searchForProgram)) {
              return searchForProgram.some((term) =>
                title.includes(term.toLowerCase())
              );
            }
            return title.includes(searchForProgram.toLowerCase());
          });
        } else {
          // Sort alphabetically
          programsList = result.sort((a: GrantProgram, b: GrantProgram) => {
            const aTitle = a.metadata?.title || "";
            const bTitle = b.metadata?.title || "";
            if (aTitle < bTitle) return -1;
            if (aTitle > bTitle) return 1;
            return 0;
          });
        }

        setAllPrograms(programsList);

        // Try to auto-select program for grant editing
        if (
          isEditing &&
          grantToEdit?.details?.data?.programId &&
          !hasAttemptedAutoSelect
        ) {
          const editingProgramId =
            grantToEdit.details.data.programId.split("_")[0];
          const matchingProgram = programsList.find(
            (program: GrantProgram) => program.programId === editingProgramId
          );

          if (matchingProgram) {
            setSelectedProgram(matchingProgram);
            setValue(
              "programId",
              `${matchingProgram.programId}_${matchingProgram.chainID}`
            );
            if (!formData.title) {
              setValue("title", matchingProgram.metadata?.title, {
                shouldValidate: true,
              });
            }
          }

          // Mark that we've attempted auto-selection to prevent endless loops
          setHasAttemptedAutoSelect(true);
        }
      } catch (err) {
        console.error("Failed to fetch programs:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrograms();
  }, [communityUID, searchForProgram]);

  // Reset selected program when programId is cleared
  useEffect(() => {
    if (!watch("programId") && !isEditing) {
      setSelectedProgram(null);
    }
  }, [watch, isEditing]);

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
              programId={
                selectedProgram?.programId
                  ? `${selectedProgram.programId}_${selectedProgram.chainID}`
                  : formData.programId
              }
              chainId={chainId}
              selectedTrackIds={formData.selectedTrackIds || []}
              onTrackSelectionChange={(trackIds) => {
                // Allow track selection in both edit and create modes
                updateFormData({ selectedTrackIds: trackIds });
              }}
              disabled={false} // Never disable track selection
              showForFlowType="both" // Setting to "both" to ensure it's always visible
            />
          )}
        </>
      )}
    </div>
  );
}
