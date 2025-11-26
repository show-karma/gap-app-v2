import type React from "react";
import { Button } from "@/components/Utilities/Button";
import { cn } from "@/utilities/tailwind";

interface CancelButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  text?: string;
  className?: string;
}

export const CancelButton: React.FC<CancelButtonProps> = ({
  onClick,
  disabled = false,
  isLoading = false,
  text = "Cancel",
  className = "",
}) => {
  return (
    <Button
      onClick={onClick}
      variant="secondary"
      disabled={disabled || isLoading}
      isLoading={isLoading}
      className={cn("text-base font-semibold px-5 py-2.5 rounded-sm", className)}
    >
      {text}
    </Button>
  );
};
