"use client"

import { SparklesIcon } from "@heroicons/react/24/outline"
import { type FC, useState } from "react"
import toast from "react-hot-toast"
import { Button } from "@/components/Utilities/Button"
import { fundingApplicationsAPI } from "@/services/fundingPlatformService"

interface AIEvaluationButtonProps {
  referenceNumber: string
  onEvaluationComplete?: () => void
  disabled?: boolean
}

const AIEvaluationButton: FC<AIEvaluationButtonProps> = ({
  referenceNumber,
  onEvaluationComplete,
  disabled = false,
}) => {
  const [isEvaluating, setIsEvaluating] = useState(false)

  const handleRunEvaluation = async () => {
    if (disabled || isEvaluating) {
      return
    }

    setIsEvaluating(true)

    try {
      const result = await fundingApplicationsAPI.runAIEvaluation(referenceNumber)

      toast.success("AI evaluation completed successfully!")

      // Call the callback to refresh the application data
      if (onEvaluationComplete) {
        try {
          await onEvaluationComplete()
        } catch (refreshError) {
          console.error("Failed to refresh application after AI evaluation:", refreshError)
          toast.error(
            "Evaluation completed but failed to refresh the display. Please reload the page."
          )
        }
      }
    } catch (error) {
      console.error("Failed to run AI evaluation:", error)

      let errorMessage = "Failed to run AI evaluation"
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (error && typeof error === "object" && "response" in error) {
        const responseError = error as { response?: { data?: { message?: string } } }
        errorMessage = responseError.response?.data?.message || errorMessage
      }
      toast.error(errorMessage)
    } finally {
      setIsEvaluating(false)
    }
  }

  return (
    <Button
      onClick={handleRunEvaluation}
      variant="secondary"
      disabled={disabled || isEvaluating}
      aria-label={isEvaluating ? "AI evaluation in progress" : "Run AI evaluation"}
      aria-busy={isEvaluating}
      className={`flex items-center space-x-2 px-3 py-2 text-sm ${isEvaluating ? "animate-pulse" : ""}`}
    >
      <SparklesIcon className={`w-4 h-4 ${isEvaluating ? "animate-spin" : ""}`} />
      <span>{isEvaluating ? "Running AI Evaluation..." : "Run AI Evaluation"}</span>
    </Button>
  )
}

export default AIEvaluationButton
