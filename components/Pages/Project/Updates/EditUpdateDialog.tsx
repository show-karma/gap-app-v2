import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useState, useEffect } from "react";
import { ProjectUpdateFormBlock } from "./ProjectUpdateFormBlock";
import { cn } from "@/utilities/tailwind";
import dynamic from "next/dynamic";

// Dynamic import for the EditImpactFormBlock with proper typing
const EditImpactFormBlock = dynamic(() => import("./EditImpactFormBlock"), {
  ssr: false,
});

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

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[11]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                className={cn(
                  "w-full max-w-3xl transform overflow-hidden rounded-lg bg-white dark:bg-zinc-800 p-6",
                  "shadow-xl transition-all"
                )}
              >
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
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
