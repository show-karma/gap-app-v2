import { useState } from "react";
import { UnifiedMilestone } from "@/types/roadmap";

export const useMilestoneActions = () => {
  const [isCompleting, setIsCompleting] = useState(false);

  const handleCompleting = (completing: boolean) => {
    setIsCompleting(completing);
  };

  return {
    isCompleting,
    handleCompleting,
  };
};
