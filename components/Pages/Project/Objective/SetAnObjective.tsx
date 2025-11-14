"use client"
import { useParams } from "next/navigation"
import { Button } from "@/components/Utilities/Button"
import { useProgressModalStore } from "@/store/modals/progress"

export const SetAnObjective = ({ hasObjectives }: { hasObjectives: boolean }) => {
  const { projectId } = useParams()
  const { setIsProgressModalOpen, setProgressModalScreen } = useProgressModalStore()

  const handleCreateMilestone = () => {
    setProgressModalScreen("unified_milestone")
    setIsProgressModalOpen(true)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col border border-dashed border-brand-blue p-6 gap-4 rounded-xl w-full bg-[#F5F8FF] dark:bg-blue-950/20">
        <div className="flex flex-col gap-4 items-start justify-start">
          <p className="text-zinc-900 dark:text-zinc-300 font-normal text-xl">
            {hasObjectives ? "Set a Milestone" : "Set your first Milestone"}
          </p>
          <p className="text-[#1D2939] dark:text-zinc-300 rounded-md font-normal text-base bg-transparent">
            Your roadmap needs milestones. Define clear milestones to guide your progress and stay
            on course.
          </p>
        </div>

        <Button
          className="px-5 py-3 border w-max border-brand-blue bg-transparent text-brand-blue font-semibold text-sm hover:bg-brand-blue/10"
          onClick={handleCreateMilestone}
        >
          Create
        </Button>
      </div>
    </div>
  )
}
