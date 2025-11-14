"use client"

import { XMarkIcon } from "@heroicons/react/24/solid"
import * as Dialog from "@radix-ui/react-dialog"
import type { FC } from "react"
import { IndicatorForm } from "@/components/Forms/IndicatorForm"
import type { ImpactIndicatorWithData } from "@/types/impactMeasurement"

interface OutputDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedPrograms: { programId: string; title: string; chainID: number }[]
  onSuccess: (indicator: ImpactIndicatorWithData) => void
  onError: () => void
}

export const OutputDialog: FC<OutputDialogProps> = ({
  open,
  onOpenChange,
  selectedPrograms,
  onSuccess,
  onError,
}) => (
  <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed z-[11] inset-0 bg-black/50 backdrop-blur-sm" />
      <Dialog.Content
        className="fixed z-[11] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
               bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-lg 
               w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        style={{
          transform: "translate(-50%, -50%)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <Dialog.Title className="text-lg font-semibold">Create New Metric</Dialog.Title>
          <Dialog.Close className="text-gray-400 hover:text-gray-500">
            <XMarkIcon className="h-5 w-5" />
          </Dialog.Close>
        </div>

        <IndicatorForm
          preSelectedPrograms={[]} // Empty array for unlinked indicators
          onSuccess={onSuccess}
          onError={onError}
        />
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
)
