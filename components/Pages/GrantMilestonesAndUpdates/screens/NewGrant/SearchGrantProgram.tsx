import type { IGrantResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";
import type { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { GrantTitleDropdown } from "./GrantTitleDropdown";
import { useGrantFormStore } from "./store";
import { TrackSelection } from "./TrackSelection";

interface SearchGrantProgramProps {
	grantToEdit?: IGrantResponse;
	communityUID: string;
	chainId: number;
	setValue: (
		field: string,
		value: string | undefined,
		options?: {
			shouldValidate: boolean;
		},
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
	const [selectedProgram, setSelectedProgram] = useState<GrantProgram | null>(
		null,
	);
	const [hasAttemptedAutoSelect, setHasAttemptedAutoSelect] =
		useState<boolean>(false);
	const { formData, updateFormData, flowType } = useGrantFormStore();
	const pathname = usePathname();
	const isEditing = pathname.includes("/edit");

	// Use React Query to fetch programs
	const { data: allPrograms = [], isLoading } = useQuery({
		queryKey: ["programs", communityUID, searchForProgram],
		queryFn: async () => {
			if (!communityUID) return [];

			try {
				const [result, error] = await fetchData(
					INDEXER.COMMUNITY.PROGRAMS(communityUID),
				);

				if (error) {
					console.error("Error fetching programs:", error);
					return [];
				}

				let programsList = result;

				// Filter programs if searchForProgram is specified
				if (searchForProgram) {
					programsList = result.filter((program: GrantProgram) => {
						const title = program.metadata?.title?.toLowerCase() || "";
						if (Array.isArray(searchForProgram)) {
							return searchForProgram.some((term) =>
								title.includes(term.toLowerCase()),
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
			grantToEdit?.details?.data?.programId &&
			!hasAttemptedAutoSelect
		) {
			const editingProgramId = grantToEdit.details.data.programId.split("_")[0];
			const matchingProgram = allPrograms.find(
				(program: GrantProgram) => program.programId === editingProgramId,
			);

			if (matchingProgram) {
				setSelectedProgram(matchingProgram);
				setValue(
					"programId",
					`${matchingProgram.programId}_${matchingProgram.chainID}`,
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
	}, [
		allPrograms,
		isEditing,
		grantToEdit,
		hasAttemptedAutoSelect,
		setValue,
		formData.title,
	]);

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
