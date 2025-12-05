/* eslint-disable @next/next/no-img-element */
"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { FC } from "react";
import { useEffect } from "react";
import { Button } from "@/components/Utilities/Button";
import { DefaultLoading } from "@/components/Utilities/DefaultLoading";
import { useOwnerStore, useProjectStore } from "@/store";
import { useCommunitiesStore } from "@/store/communities";
import type { GrantResponse } from "@/types/v2/grant";
import { MESSAGES } from "@/utilities/messages";
import { PAGES } from "@/utilities/pages";
import { TypeSelectionScreen } from "./screens/TypeSelectionScreen";
import { useGrantFormStore } from "./store";

export { SearchGrantProgram } from "./SearchGrantProgram";

const DetailsScreen = dynamic(
  () => import("./screens/DetailsScreen").then((mod) => mod.DetailsScreen),
  {
    loading: () => <DefaultLoading />,
    ssr: false,
  }
);

const MilestonesScreen = dynamic(
  () => import("./screens/MilestonesScreen").then((mod) => mod.MilestonesScreen),
  {
    loading: () => <DefaultLoading />,
    ssr: false,
  }
);

const CommunitySelectionScreen = dynamic(
  () => import("./screens/CommunitySelectionScreen").then((mod) => mod.CommunitySelectionScreen),
  {
    loading: () => <DefaultLoading />,
    ssr: false,
  }
);

interface NewGrantProps {
  grantToEdit?: GrantResponse;
}

export const NewGrant: FC<NewGrantProps> = ({ grantToEdit }) => {
  const pathname = usePathname();
  const grantScreen: "edit" | "new" = pathname.includes("/funding/new") ? "new" : "edit";

  const {
    currentStep,
    setCurrentStep,
    updateFormData,
    resetFormData,
    setMilestonesForms,
    flowType,
    setFlowType,
    formData,
  } = useGrantFormStore();

  const selectedProject = useProjectStore((state) => state.project);
  const { isProjectAdmin } = useProjectStore();
  const { isOwner } = useOwnerStore();
  const { communities } = useCommunitiesStore();
  const isCommunityAdminOfSome = communities.length !== 0;
  const isAuthorized = isProjectAdmin || isOwner || isCommunityAdminOfSome;

  const isProgramApplication = formData.description.includes("I am applying to participate in the");
  // Initialize form data when editing a grant
  useEffect(() => {
    if (grantScreen === "edit" && grantToEdit) {
      // Set flow type to grant for edit mode
      if (isProgramApplication) {
        setFlowType("program");
      } else {
        setFlowType("grant");
      }

      // Start at community selection step for edit mode to show tracks
      setCurrentStep(2);

      // Populate form data from grantToEdit
      updateFormData({
        title: grantToEdit?.details?.data?.title || "",
        amount: grantToEdit?.details?.data?.amount || "",
        community: grantToEdit?.data?.communityUID || "",
        recipient: grantToEdit?.recipient || selectedProject?.owner || "",
        linkToProposal: grantToEdit?.details?.data?.proposalURL || "",
        description: grantToEdit?.details?.data?.description || "",
        programId: grantToEdit?.details?.data?.programId,
        startDate: grantToEdit?.details?.data?.startDate
          ? new Date(grantToEdit?.details?.data?.startDate * 1000)
          : undefined,
        questions: grantToEdit?.details?.data?.questions || [],
        selectedTrackIds: grantToEdit?.details?.data?.selectedTrackIds || [],
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
      setCurrentStep(1);
      setMilestonesForms([]);
    }

    // Cleanup on unmount
    return () => {
      resetFormData();
      setCurrentStep(1);
      setMilestonesForms([]);
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
    isProgramApplication,
  ]);

  if (!isAuthorized) {
    return (
      <div className="flex w-full flex-col gap-4 items-center justify-center">
        <p>{MESSAGES.PROJECT.NOT_AUTHORIZED}</p>
        <Link href={PAGES.PROJECT.GRANTS(selectedProject?.uid || "")}>
          <Button variant="primary">Back to Project</Button>
        </Link>
      </div>
    );
  }

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
