/* eslint-disable @next/next/no-img-element */
"use client";

import { usePathname } from "next/navigation";
import type { FC } from "react";
import { useEffect } from "react";
import { IGrantResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { useGrantFormStore } from "./store";
import { useProjectStore } from "@/store";
import {
  TypeSelectionScreen,
  CommunitySelectionScreen,
  DetailsScreen,
  MilestonesScreen,
} from "./screens";

// Export the SearchGrantProgram component from its own file
export { SearchGrantProgram } from "./SearchGrantProgram";

interface NewGrantProps {
  grantToEdit?: IGrantResponse;
}

export const NewGrant: FC<NewGrantProps> = ({ grantToEdit }) => {
  const pathname = usePathname();
  const grantScreen: "edit-grant" | "create-grant" = pathname.includes(
    "edit-grant"
  )
    ? "edit-grant"
    : "create-grant";

  const {
    currentStep,
    setCurrentStep,
    updateFormData,
    resetFormData,
    setMilestonesForms,
    flowType,
    setFlowType,
  } = useGrantFormStore();

  const selectedProject = useProjectStore((state) => state.project);

  // Initialize form data when editing a grant
  useEffect(() => {
    if (grantScreen === "edit-grant" && grantToEdit) {
      // Set flow type to grant for edit mode
      setFlowType("grant");

      // Skip to details step for edit mode
      setCurrentStep(3);

      // Populate form data from grantToEdit
      updateFormData({
        title: grantToEdit?.details?.data?.title || "",
        amount: grantToEdit?.details?.data?.amount || "",
        community: grantToEdit?.data?.communityUID || "",
        recipient: grantToEdit?.recipient || selectedProject?.recipient || "",
        linkToProposal: grantToEdit?.details?.data?.proposalURL || "",
        description: grantToEdit?.details?.data?.description || "",
        programId: grantToEdit?.details?.data?.programId,
        startDate: grantToEdit?.details?.data?.startDate
          ? new Date(grantToEdit?.details?.data?.startDate * 1000)
          : undefined,
        questions: grantToEdit?.details?.data?.questions || [],
      });

      // Initialize milestones if they exist
      if (grantToEdit?.milestones?.length) {
        const milestones = grantToEdit.milestones.map((milestone) => ({
          isValid: true,
          isEditing: false,
          data: {
            title: milestone.data.title,
            description: milestone.data.description,
            endsAt: milestone.data.endsAt,
            startsAt: milestone.data.startsAt,
            priority: milestone.data.priority,
          },
        }));

        setMilestonesForms(milestones);
      }
    } else {
      // Reset form data for new grant
      resetFormData();
    }

    // Cleanup on unmount
    return () => {
      resetFormData();
    };
  }, [
    grantScreen,
    grantToEdit,
    selectedProject,
    resetFormData,
    setCurrentStep,
    setFlowType,
    setMilestonesForms,
    updateFormData,
  ]);

  // Render the appropriate screen based on current step
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return <TypeSelectionScreen />;
      case 2:
        return <CommunitySelectionScreen />;
      case 3:
        return <DetailsScreen />;
      case 4:
        return <MilestonesScreen />;
      default:
        return <TypeSelectionScreen />;
    }
  };

  return renderCurrentStep();
};
