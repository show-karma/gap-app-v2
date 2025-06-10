import { useState } from "react";
import { UnifiedMilestone } from "@/types/roadmap";

export const useMilestoneActions = () => {
  const [isCompleting, setIsCompleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleCompleting = (completing: boolean) => {
    setIsCompleting(completing);
  };

  const handleEditing = (editing: boolean) => {
    setIsEditing(editing);
  };

  return {
    isCompleting,
    handleCompleting,
    isEditing,
    handleEditing,
  };
};
