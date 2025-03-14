import React, { useEffect, useState } from "react";
import { StepBlock } from "../StepBlock";
import { Button } from "@/components/Utilities/Button";
import { useGrantFormStore } from "../store";
import { useRouter } from "next/navigation";
import { PAGES } from "@/utilities/pages";
import { useProjectStore } from "@/store";
import { CommunitiesDropdown } from "@/components/CommunitiesDropdown";
import { ICommunityResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { SearchGrantProgram } from "../index";
import { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList";
import { appNetwork } from "@/utilities/network";
import { CancelButton } from "./buttons/CancelButton";
import { NextButton } from "./buttons/NextButton";

export const CommunitySelectionScreen: React.FC = () => {
  const { setCurrentStep, flowType, formData, updateFormData } =
    useGrantFormStore();
  const selectedProject = useProjectStore((state) => state.project);
  const router = useRouter();
  const [allCommunities, setAllCommunities] = useState<ICommunityResponse[]>(
    []
  );
  const [communityNetworkId, setCommunityNetworkId] = useState<number>(
    appNetwork[0].id
  );
  const [selectedProgram, setSelectedProgram] = useState<GrantProgram | null>(
    null
  );

  // For funding program flow, we only show Celo community
  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        const result = await gapIndexerApi.communities();

        if (flowType === "program") {
          // Filter to only show Celo community for program flow
          const celoCommunity = result.data.find(
            (community) =>
              community.uid.toLowerCase().includes("celo") ||
              (community as any).name?.toLowerCase().includes("celo")
          );
          setAllCommunities(celoCommunity ? [celoCommunity] : []);

          // Auto-select Celo community if it exists
          if (celoCommunity) {
            setCommunityValue(celoCommunity.uid, celoCommunity.chainID);
          }
        } else {
          setAllCommunities(result.data);
        }
      } catch (error) {
        console.error(error);
        setAllCommunities([]);
      }
    };

    fetchCommunities();
  }, [flowType]);

  const setCommunityValue = (value: string, networkId: number) => {
    setCommunityNetworkId(networkId);
    updateFormData({ community: value });
  };

  const handleNext = () => {
    // Ensure we have a title before proceeding
    if (flowType === "grant" && !formData.title) {
      // If no title is set for grant flow, set a default title
      updateFormData({ title: "My Grant" });
    }
    setCurrentStep(3);
  };

  const handleBack = () => {
    setCurrentStep(1);
  };

  const handleCancel = () => {
    if (!selectedProject) return;
    router.push(
      PAGES.PROJECT.GRANTS(
        selectedProject.details?.data?.slug || selectedProject?.uid
      )
    );
  };

  // Check if we can proceed to the next step
  const canProceed =
    !!formData.community &&
    (flowType === "grant" || (flowType === "program" && !!formData.programId));

  return (
    <StepBlock currentStep={2} totalSteps={4} flowType={flowType}>
      <div className="flex flex-col items-center w-full max-w-3xl mx-auto">
        <h3 className="text-xl font-semibold mb-6 text-center">
          Select a community for your{" "}
          {flowType === "grant" ? "grant" : "funding program"}
        </h3>

        <div className="w-full my-10 flex flex-col gap-4 items-center justify-center">
          <CommunitiesDropdown
            onSelectFunction={setCommunityValue}
            previousValue={formData.community}
            communities={allCommunities}
            // Note: If CommunitiesDropdown doesn't support disabled prop, we'll handle it differently
          />

          {formData.community && (
            <div className="w-full mb-10">
              <label className="text-sm font-bold text-black dark:text-zinc-100 mb-2 block">
                {flowType === "grant"
                  ? "Choose Grant Program or Add New *"
                  : "Select Funding Program *"}
              </label>
              <SearchGrantProgram
                grantToEdit={undefined}
                communityUID={formData.community}
                chainId={communityNetworkId}
                setValue={(
                  field: string,
                  value?: string,
                  options?: { shouldValidate: boolean }
                ) => {
                  if (field === "programId") {
                    updateFormData({ programId: value });
                  } else if (field === "title") {
                    updateFormData({ title: value || "" });
                  }
                }}
                watch={(field: string) =>
                  formData[field as keyof typeof formData] || ""
                }
              />
            </div>
          )}
        </div>

        <div className="flex justify-between w-full">
          <CancelButton text="Cancel" onClick={handleCancel} />

          <div className="flex flex-row gap-4">
            <CancelButton text="Back" onClick={handleBack} />
            <NextButton
              text="Next"
              onClick={handleNext}
              disabled={!canProceed}
            />
          </div>
        </div>
      </div>
    </StepBlock>
  );
};
