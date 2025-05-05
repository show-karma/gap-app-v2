import React, { useEffect, useState } from "react";
import { StepBlock } from "../StepBlock";
import { useGrantFormStore } from "../store";
import { useRouter, usePathname } from "next/navigation";
import { PAGES } from "@/utilities/pages";
import { useProjectStore } from "@/store";
import { CommunitiesDropdown } from "@/components/CommunitiesDropdown";
import { ICommunityResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { SearchGrantProgram } from "../index";
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
  const pathname = usePathname();
  const isEditing = pathname.includes("/edit");
  const [allCommunities, setAllCommunities] = useState<ICommunityResponse[]>(
    []
  );

  // For funding program flow, we only show Celo community
  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        const result = await gapIndexerApi.communities();

        if (flowType === "program") {
          const filteredCommunities = result.data.filter(
            (community) =>
              community.details?.data?.name?.toLowerCase().includes("celo") ||
              community.details?.data?.name?.toLowerCase().includes("divvi")
          );
          setAllCommunities(
            filteredCommunities.length > 0 ? filteredCommunities : []
          );
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

  const canProceed =
    !!formData.community && (!!formData.programId || !!formData.title);

  return (
    <StepBlock currentStep={2} totalSteps={4}>
      <div className="flex flex-col items-center w-full mx-auto">
        <h3 className="text-xl font-semibold mb-6 text-center">
          {isEditing
            ? "Edit grant community, program and tracks"
            : `Select a community for your ${
                flowType === "grant" ? "grant" : "funding program"
              }`}
        </h3>

        <div className="w-full my-10 flex flex-col gap-4 items-center justify-center">
          <CommunitiesDropdown
            onSelectFunction={(value, networkId) => {
              if (!isEditing) {
                setCommunityValue(value, networkId);
                updateFormData({
                  programId: undefined,
                  title: "",
                  selectedTrackIds: [],
                });
              }
            }}
            previousValue={formData.community}
            communities={allCommunities}
            triggerClassName={`w-full max-w-full ${
              isEditing ? "opacity-70 pointer-events-none" : ""
            }`}
            RightIcon={ChevronDownIcon}
            rightIconClassName="w-4 h-4 text-black dark:text-white opacity-100"
          />

          {formData.community && (
            <SearchGrantProgram
              grantToEdit={
                isEditing
                  ? ({
                      details: {
                        data: {
                          programId: formData.programId || "",
                          title: formData.title || "",
                        },
                      },
                    } as any)
                  : undefined
              }
              communityUID={formData.community}
              chainId={communityNetworkId}
              canAdd={flowType === "grant"}
              setValue={(
                field: string,
                value?: string,
                options?: { shouldValidate: boolean }
              ) => {
                if (field === "programId" && !isEditing) {
                  updateFormData({ programId: value });
                } else if (field === "title" && !isEditing) {
                  updateFormData({ title: value || "" });
                }
              }}
              watch={(field: string) =>
                formData[field as keyof typeof formData] || ""
              }
              searchForProgram={
                flowType === "grant"
                  ? undefined
                  : ["Proof of Ship", "Hackathon", "Divvi Builder Camp"]
              }
            />
          )}
        </div>

        <div className="flex justify-between w-full">
          <CancelButton text="Cancel" onClick={handleCancel} />

          <div className="flex flex-row gap-4">
            <CancelButton
              text="Back"
              disabled={isEditing}
              onClick={() => {
                if (!isEditing) {
                  handleBack();
                }
              }}
            />
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
