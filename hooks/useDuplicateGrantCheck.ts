import { useState, useCallback } from "react";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { useProjectStore } from "@/store";

interface DuplicateCheckParams {
  programId?: string;
  community: string;
  title: string;
}

export const useDuplicateGrantCheck = () => {
  const [isCheckingGrantDuplicate, setIsCheckingGrantDuplicate] = useState(false);
  const [isGrantDuplicateInProject, setIsGrantDuplicateInProject] = useState(false);
  const selectedProject = useProjectStore((state) => state.project);

  const checkForDuplicateGrantInProject = useCallback(
    async (params: DuplicateCheckParams): Promise<boolean> => {
      try {
        setIsCheckingGrantDuplicate(true);
        setIsGrantDuplicateInProject(false);

        // Fetch fresh project data without updating store
        const freshProject = selectedProject?.uid
          ? await gapIndexerApi
              .projectBySlug(selectedProject.uid)
              .then((res) => res.data)
          : undefined;

        if (!freshProject?.grants) {
          return false;
        }

        // Check for duplicate based on grant type
        const duplicate = freshProject.grants.some((grant) => {
          if (params.programId) {
            // For program grants: match by programId (base part before underscore)
            const existingProgramId = grant.details?.data?.programId;
            if (!existingProgramId) return false;

            const selectedProgramId = params.programId.split("_")[0];
            const existingProgramIdBase = existingProgramId.split("_")[0];

            return existingProgramIdBase === selectedProgramId;
          } else {
            // For regular grants: match by community AND title
            const existingCommunity = grant.data?.communityUID;
            const existingTitle = grant.details?.data?.title;

            return (
              existingCommunity === params.community &&
              existingTitle?.toLowerCase().trim() ===
                params.title?.toLowerCase().trim()
            );
          }
        });

        setIsGrantDuplicateInProject(duplicate);
        return duplicate;
      } catch (error) {
        console.error("Error checking for duplicate grant:", error);
        return false;
      } finally {
        setIsCheckingGrantDuplicate(false);
      }
    },
    [selectedProject?.uid]
  );

  const resetGrantDuplicateCheck = useCallback(() => {
    setIsGrantDuplicateInProject(false);
  }, []);

  return {
    checkForDuplicateGrantInProject,
    isCheckingGrantDuplicate,
    isGrantDuplicateInProject,
    resetGrantDuplicateCheck,
  };
};
