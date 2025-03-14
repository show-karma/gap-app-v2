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
import { ChevronDownIcon } from "@heroicons/react/24/solid";

export const CommunitySelectionScreen: React.FC = () => {
  const {
    setCurrentStep,
    flowType,
    formData,
    updateFormData,
    communityNetworkId,
    setCommunityNetworkId,
  } = useGrantFormStore();
  const selectedProject = useProjectStore((state) => state.project);
  const router = useRouter();
  const [allCommunities, setAllCommunities] = useState<ICommunityResponse[]>(
    []
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
          const celoCommunity = result.data.find((community) =>
            community.details?.data?.name?.toLowerCase().includes("celo")
          );
          console.log("celoCommunity", celoCommunity);
          setAllCommunities(celoCommunity ? [celoCommunity] : []);
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
    <StepBlock currentStep={2} totalSteps={4}>
      <div className="flex flex-col items-center w-full mx-auto">
        <h3 className="text-xl font-semibold mb-6 text-center">
          Select a community for your{" "}
          {flowType === "grant" ? "grant" : "funding program"}
        </h3>

        <div className="w-full my-10 flex flex-col gap-4 items-center justify-center">
          <CommunitiesDropdown
            onSelectFunction={setCommunityValue}
            previousValue={formData.community}
            communities={allCommunities}
            triggerClassName="w-full max-w-full"
            RightIcon={ChevronDownIcon}
            rightIconClassName="w-4 h-4 text-black dark:text-white opacity-100"
          />

          {formData.community && (
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
              searchForProgram="Proof of Ship"
              canAdd={flowType === "grant" ? true : false}
            />
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
