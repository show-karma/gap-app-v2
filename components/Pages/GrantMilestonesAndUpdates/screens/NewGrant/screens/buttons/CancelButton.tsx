import React from "react";
import { Button } from "@/components/Utilities/Button";

interface CancelButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  text?: string;
}

export const CancelButton: React.FC<CancelButtonProps> = ({
  onClick,
  disabled = false,
  isLoading = false,
  text = "Cancel",
}) => {
  return (
    <Button
      onClick={onClick}
      variant="secondary"
      disabled={disabled || isLoading}
      isLoading={isLoading}
      className="text-base font-semibold px-5 py-2.5 rounded-sm"
    >
      {text}
    </Button>
  );
};
