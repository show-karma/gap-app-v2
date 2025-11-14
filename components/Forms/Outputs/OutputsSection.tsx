"use client"

import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import type {
  Control,
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form"
import { useFieldArray } from "react-hook-form"
import { InfoTooltip } from "@/components/Utilities/InfoTooltip"
import { useImpactAnswers } from "@/hooks/useImpactAnswers"
import { useUnlinkedIndicators } from "@/hooks/useUnlinkedIndicators"
import type { ImpactIndicatorWithData } from "@/types/impactMeasurement"
import { getIndicatorsByCommunity } from "@/utilities/queries/getIndicatorsByCommunity"
import { cn } from "@/utilities/tailwind"
import { DeliverablesTable } from "./DeliverablesTable"
import { MetricsTable } from "./MetricsTable"
import type { CategorizedIndicator, CommunityData, OutputData } from "./types"

interface OutputsSectionProps {
  // Form controls
  register: UseFormRegister<any>
  control: Control<any>
  setValue: UseFormSetValue<any>
  watch: UseFormWatch<any>
  errors: FieldErrors<any>

  // Data
  projectUID?: string
  selectedCommunities: CommunityData[]
  selectedPrograms: { programId: string; title: string; chainID: number }[]

  // Handlers
  onCreateNewIndicator: (index: number) => void
  onIndicatorCreated: (indicator: ImpactIndicatorWithData) => void

  // Styling
  labelStyle: string
}

export const OutputsSection = ({
  register,
  control,
  setValue,
  watch,
  errors,
  projectUID,
  selectedCommunities,
  selectedPrograms,
  onCreateNewIndicator,
  onIndicatorCreated,
  labelStyle,
}: OutputsSectionProps) => {
  // Deliverables field array
  const { fields, append, remove } = useFieldArray({
    control,
    name: "deliverables",
  })

  // Get current form values
  const outputs = watch("outputs") || []

  // Fetch project indicators
  const { data: indicatorsData } = useImpactAnswers({
    projectIdentifier: projectUID,
  })

  // Fetch community indicators for all selected communities
  const { data: communityIndicatorsData = [] } = useQuery({
    queryKey: ["allCommunityIndicators", selectedCommunities.map((c) => c.uid).sort()],
    queryFn: async () => {
      if (selectedCommunities.length === 0) return []
      const results = await Promise.all(
        selectedCommunities.map(async (community) => {
          try {
            const indicators = await getIndicatorsByCommunity(community.uid)
            return indicators.map((indicator) => ({
              ...indicator,
              communityId: community.uid,
              communityName: community.name,
            }))
          } catch (error) {
            console.error(`Failed to fetch indicators for community ${community.uid}:`, error)
            return []
          }
        })
      )
      return results.flat()
    },
    enabled: selectedCommunities.length > 0,
  })

  // Fetch unlinked indicators
  const { data: unlinkedIndicatorsData = [] } = useUnlinkedIndicators()

  // Categorized indicators combining project, community, and unlinked indicators
  const categorizedIndicators = useMemo((): CategorizedIndicator[] => {
    const projectIndicators: CategorizedIndicator[] = (indicatorsData || []).map((indicator) => ({
      ...indicator,
      source: "project" as const,
    }))

    const communityIndicators: CategorizedIndicator[] = (communityIndicatorsData || []).map(
      (indicator) => ({
        id: indicator.id,
        name: indicator.name,
        description: indicator.description,
        unitOfMeasure: indicator.unitOfMeasure,
        datapoints: [],
        programs: [], // Community indicators don't have specific programs associated
        hasData: false, // Community indicators start without data
        isAssociatedWithPrograms: false, // Community indicators are not associated with specific programs
        source: "community" as const,
        communityName: indicator.communityName,
        communityId: indicator.communityId,
      })
    )

    const unlinkedIndicators: CategorizedIndicator[] = (unlinkedIndicatorsData || []).map(
      (indicator) => ({
        id: indicator.id,
        name: indicator.name,
        description: indicator.description,
        unitOfMeasure: indicator.unitOfMeasure,
        datapoints: [],
        programs: [], // Unlinked indicators don't have specific programs associated
        hasData: false, // Unlinked indicators start without data
        isAssociatedWithPrograms: false, // Unlinked indicators are not associated with specific programs
        source: "unlinked" as const,
      })
    )

    return [...projectIndicators, ...communityIndicators, ...unlinkedIndicators]
  }, [indicatorsData, communityIndicatorsData, unlinkedIndicatorsData])

  const indicatorsList = categorizedIndicators.map((output) => ({
    indicatorId: output.id,
    name: output.name,
  }))

  // Deliverable handlers
  const handleAddDeliverable = () => {
    append({ name: "", proof: "", description: "" })
    // Ensure form validation is triggered after state update
    setTimeout(() => {
      setValue("deliverables", watch("deliverables"), { shouldValidate: true })
    }, 0)
  }

  const handleRemoveDeliverable = (index: number) => {
    remove(index)
    // Ensure form validation is triggered after state update
    setTimeout(() => {
      setValue("deliverables", watch("deliverables"), { shouldValidate: true })
    }, 0)
  }

  // Output handlers
  const handleOutputsChange = (newOutputs: OutputData[]) => {
    setValue("outputs", newOutputs, {
      shouldValidate: true,
      shouldDirty: true,
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center flex-row gap-2">
        <h2 className={cn(labelStyle, "text-xl")}>Outputs</h2>
        <InfoTooltip content="Outputs are the key results of the activities carried out. These outputs may evolve over time as the activity progresses, with new ones added or existing ones refined to reflect changes. Showcase outputs that are most significant and worth mentioning to demonstrate the direct tangible results of your work." />
      </div>

      <DeliverablesTable
        fields={fields}
        register={register}
        errors={errors}
        onAdd={handleAddDeliverable}
        onRemove={handleRemoveDeliverable}
        labelStyle={labelStyle}
      />

      <MetricsTable
        outputs={outputs}
        categorizedIndicators={categorizedIndicators}
        selectedCommunities={selectedCommunities}
        indicatorsList={indicatorsList}
        selectedPrograms={selectedPrograms}
        onOutputsChange={handleOutputsChange}
        onCreateNewIndicator={onCreateNewIndicator}
        onIndicatorCreated={onIndicatorCreated}
        labelStyle={labelStyle}
      />
    </div>
  )
}
