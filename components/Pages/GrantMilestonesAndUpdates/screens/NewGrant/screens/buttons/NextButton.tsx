import type React from "react"
import { Button } from "@/components/Utilities/Button"
import { cn } from "@/utilities/tailwind"

interface NextButtonProps {
  onClick: () => void
  disabled?: boolean
  isLoading?: boolean
  text?: string
  className?: string
}

export const NextButton: React.FC<NextButtonProps> = ({
  onClick,
  disabled = false,
  isLoading = false,
  text = "Next",
  className = "",
}) => {
  return (
    <Button
      onClick={onClick}
      variant="primary"
      disabled={disabled || isLoading}
      isLoading={isLoading}
      className={cn("text-base font-semibold px-10 py-2.5 rounded-sm", className)}
    >
      {text}
    </Button>
  )
}
