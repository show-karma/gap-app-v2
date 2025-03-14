import React from "react";
import { Button } from "@/components/Utilities/Button";

interface NextButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  text?: string;
}

export const NextButton: React.FC<NextButtonProps> = ({
  onClick,
  disabled = false,
  isLoading = false,
  text = "Next",
}) => {
  return (
    <Button
      onClick={onClick}
      variant="primary"
      disabled={disabled || isLoading}
      isLoading={isLoading}
      className="text-base font-semibold px-10 py-2.5 rounded-sm"
    >
      {text}
    </Button>
  );
};
