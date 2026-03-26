import type React from "react";
import { Button } from "@/components/ui/button";
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
      variant="outline"
      size="xl"
      disabled={disabled || isLoading}
      isLoading={isLoading}
      className={cn(className)}
    >
      {text}
    </Button>
  );
};
