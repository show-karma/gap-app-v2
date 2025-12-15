"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import EditImpactFormBlock from "./EditImpactFormBlock";
import { ProjectUpdateFormBlock } from "./ProjectUpdateFormBlock";

interface EditUpdateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  updateId: string;
  updateType?: "ProjectUpdate" | "ProjectImpact";
}

export const EditUpdateDialog = ({
  isOpen,
  onClose,
  projectId,
  updateId,
  updateType = "ProjectUpdate",
}: EditUpdateDialogProps) => {
  // Keep track of current update ID to force remount when changed
  const [currentUpdateId, setCurrentUpdateId] = useState(updateId);

  useEffect(() => {
    if (isOpen && updateId !== currentUpdateId) {
      setCurrentUpdateId(updateId);
    }
  }, [isOpen, updateId, currentUpdateId]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700">
        <DialogTitle></DialogTitle>
        {updateType === "ProjectImpact" ? (
          <EditImpactFormBlock
            key={`impact-form-${currentUpdateId}`}
            onClose={onClose}
            impactId={currentUpdateId}
          />
        ) : (
          <ProjectUpdateFormBlock
            key={`update-form-${currentUpdateId}`}
            onClose={onClose}
            updateId={currentUpdateId}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
