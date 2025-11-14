import { ChevronDownIcon } from "@heroicons/react/24/solid"
import type { ICommunityResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types"
import { useParams, usePathname, useRouter } from "next/navigation"
import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { CommunitiesDropdown } from "@/components/CommunitiesDropdown"
import { useDuplicateGrantCheck } from "@/hooks/useDuplicateGrantCheck"
import { useGrant } from "@/hooks/useGrant"
import { useProjectStore } from "@/store"
import {
  FUNDING_PROGRAM_GRANT_NAMES,
  isFundingProgramCommunity,
} from "@/utilities/funding-programs"
import { gapIndexerApi } from "@/utilities/gapIndexerApi"
import { PAGES } from "@/utilities/pages"
import { SearchGrantProgram } from "../index"
import { StepBlock } from "../StepBlock"
import { useGrantFormStore } from "../store"
import { CancelButton } from "./buttons/CancelButton"
import { NextButton } from "./buttons/NextButton"

export const CommunitySelectionScreen: React.FC = () => {
  const {
    setCurrentStep,
    flowType,
    formData,
    updateFormData,
    communityNetworkId,
    setCommunityNetworkId,
  } = useGrantFormStore()
  const selectedProject = useProjectStore((state) => state.project)
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const grantUid = params.grantUid as string
  const isEditing = pathname.includes("/edit")
  const { updateGrant } = useGrant()
  const { checkForDuplicateGrantInProject, isCheckingGrantDuplicate, isGrantDuplicateInProject } =
    useDuplicateGrantCheck(
      {
        programId: formData.programId,
        community: formData.community,
        title: formData.title,
      },
      { enabled: false } // Only run manually via refetch
    )
  const [allCommunities, setAllCommunities] = useState<ICommunityResponse[]>([])

  // For funding program flow, we only show Celo community
  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        const result = await gapIndexerApi.communities()

        if (flowType === "program") {
          const filteredCommunities = result.data.filter((community) =>
            isFundingProgramCommunity(community.details?.data?.name)
          )
          setAllCommunities(filteredCommunities.length > 0 ? filteredCommunities : [])
        } else {
          setAllCommunities(result.data)
        }
      } catch (error) {
        console.error(error)
        setAllCommunities([])
      }
    }

    fetchCommunities()
  }, [flowType])

  // Note: React Query automatically handles cache invalidation when params change
  // No need for manual reset

  const setCommunityValue = (value: string, networkId: number) => {
    setCommunityNetworkId(networkId)
    updateFormData({ community: value })
  }

  const handleNext = async () => {
    // Check for duplicate grant in project before proceeding
    if (!isEditing) {
      const { data: duplicate } = await checkForDuplicateGrantInProject()

      if (duplicate) {
        // Duplicate grant detected in fresh project data, don't proceed
        return
      }
    }

    if (isEditing && flowType === "program") {
      const grantToUpdate = selectedProject?.grants?.find(
        (g) => g.uid.toLowerCase() === grantUid?.toLowerCase()
      )

      if (grantToUpdate) {
        const updateData = {
          community: formData.community || "",
          programId: formData.programId,
          title: formData.title,
          selectedTrackIds: formData.selectedTrackIds || [],
        }

        updateGrant(grantToUpdate, updateData)
      }
    } else {
      if (flowType === "program") {
        setCurrentStep(4) // Go directly to milestones screen
      } else {
        setCurrentStep(3) // Go to details screen for grants
      }
    }
  }

  const handleBack = () => {
    setCurrentStep(1)
  }

  const handleCancel = () => {
    if (!selectedProject) return
    router.push(PAGES.PROJECT.GRANTS(selectedProject.details?.data?.slug || selectedProject?.uid))
  }

  const isProjectAlreadyInProgram = useMemo(() => {
    if (!selectedProject?.grants || isEditing) return false

    return selectedProject.grants.some((grant) => {
      if (formData.programId) {
        // For program grants: match by programId (base part before underscore)
        const existingProgramId = grant.details?.data?.programId
        if (!existingProgramId) return false

        const selectedProgramId = formData.programId.split("_")[0]
        const existingProgramIdBase = existingProgramId.split("_")[0]

        return existingProgramIdBase === selectedProgramId
      } else if (formData.title) {
        // For regular grants: match by community AND title
        const existingCommunity = grant.data?.communityUID
        const existingTitle = grant.details?.data?.title

        return (
          existingCommunity === formData.community &&
          existingTitle?.toLowerCase().trim() === formData.title?.toLowerCase().trim()
        )
      }

      return false
    })
  }, [formData.programId, formData.community, formData.title, selectedProject?.grants, isEditing])

  const canProceed = useMemo(() => {
    return (
      !!formData.community &&
      (!!formData.programId || !!formData.title) &&
      !isProjectAlreadyInProgram &&
      !isGrantDuplicateInProject
    )
  }, [
    formData.community,
    formData.programId,
    formData.title,
    isProjectAlreadyInProgram,
    isGrantDuplicateInProject,
  ])

  return (
    <StepBlock currentStep={2}>
      <div className="flex flex-col items-center w-full mx-auto">
        <h3 className="text-xl font-semibold mb-6 text-center">
          {isEditing
            ? "Edit grant community, program and tracks"
            : `Select a community for your ${flowType === "grant" ? "grant" : "funding program"}`}
        </h3>

        <div className="w-full my-10 flex flex-col gap-4 items-center justify-center">
          <CommunitiesDropdown
            onSelectFunction={(value, networkId) => {
              if (!isEditing) {
                setCommunityValue(value, networkId)
                updateFormData({
                  programId: undefined,
                  title: "",
                  selectedTrackIds: [],
                })
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
              setValue={(field: string, value?: string, _options?: { shouldValidate: boolean }) => {
                if (field === "programId" && !isEditing) {
                  updateFormData({ programId: value })
                } else if (field === "title" && !isEditing) {
                  updateFormData({ title: value || "" })
                }
              }}
              watch={(field: string) => formData[field as keyof typeof formData] || ""}
              searchForProgram={flowType === "grant" ? undefined : [...FUNDING_PROGRAM_GRANT_NAMES]}
            />
          )}

          {(isProjectAlreadyInProgram || isGrantDuplicateInProject) && (
            <div className="w-full max-w-full mt-4 p-3 bg-red-50 border border-red-200 rounded-md dark:bg-red-900/20 dark:border-red-800">
              <p className="text-red-600 dark:text-red-400 text-sm">
                This grant is already associated with your project.
              </p>
            </div>
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
                  handleBack()
                }
              }}
            />
            <NextButton
              text={flowType === "program" && isEditing ? "Update" : "Next"}
              onClick={handleNext}
              disabled={!canProceed}
              isLoading={isCheckingGrantDuplicate}
            />
          </div>
        </div>
      </div>
    </StepBlock>
  )
}
