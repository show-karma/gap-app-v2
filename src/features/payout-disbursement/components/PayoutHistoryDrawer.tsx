"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PayoutHistoryContent } from "./PayoutHistoryContent";

interface PayoutHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  grantUID: string;
  grantName: string;
  projectName: string;
  approvedAmount?: string;
}

export function PayoutHistoryDrawer({
  isOpen,
  onClose,
  grantUID,
  grantName,
  projectName,
  approvedAmount,
}: PayoutHistoryDrawerProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="fixed inset-y-0 right-0 left-auto h-full w-full max-w-lg translate-x-0 translate-y-0 flex flex-col gap-0 rounded-none border-l border-y-0 border-r-0 bg-white p-0 shadow-xl duration-300 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:rounded-l-lg dark:bg-zinc-800 [&>button]:hidden">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-gray-200 bg-white px-6 py-4 dark:border-zinc-700 dark:bg-zinc-800">
          <div className="flex items-start justify-between">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                Payout History
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
                {projectName} - {grantName}
              </DialogDescription>
            </DialogHeader>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
          <PayoutHistoryContent
            isActive={isOpen}
            grantUID={grantUID}
            grantName={grantName}
            projectName={projectName}
            approvedAmount={approvedAmount}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
