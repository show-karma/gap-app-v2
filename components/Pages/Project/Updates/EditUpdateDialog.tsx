import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useEffect } from "react";
import { ProjectUpdateFormBlock } from "./ProjectUpdateFormBlock";
import { useRouter } from "next/navigation";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";

interface EditUpdateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  updateId: string;
}

export const EditUpdateDialog = ({
  isOpen,
  onClose,
  projectId,
  updateId,
}: EditUpdateDialogProps) => {
  const router = useRouter();

  // Set up editId query parameter when dialog opens
  useEffect(() => {
    if (isOpen && updateId) {
      const url = new URL(window.location.href);
      url.searchParams.set("editId", updateId);
      router.replace(url.toString(), { scroll: false });
    }

    // Clean up URL parameters when dialog closes
    return () => {
      if (!isOpen && window.location.href.includes("editId=")) {
        const url = new URL(window.location.href);
        url.searchParams.delete("editId");
        router.replace(url.toString(), { scroll: false });
      }
    };
  }, [isOpen, updateId, router]);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
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
                <ProjectUpdateFormBlock onClose={onClose} />
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
