"use client";
import { PlusIcon } from "@heroicons/react/24/solid";
/* eslint-disable @next/next/no-img-element */
import { type FC, type ReactNode, useState } from "react";
import toast from "react-hot-toast";
import { errorManager } from "@/components/Utilities/errorManager";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/utilities/tailwind";
import { Button } from "./ui/button";

type DeleteDialogProps = {
  title?: ReactNode;
  deleteFunction: () => Promise<void>;
  buttonElement?: {
    text: string;
    icon: ReactNode;
    styleClass: string;
  } | null;
  isLoading: boolean;
  afterFunction?: () => void;
  "data-delete-project-button"?: string;
  externalIsOpen?: boolean;
  externalSetIsOpen?: (isOpen: boolean) => void;
};

export const DeleteDialog: FC<DeleteDialogProps> = ({
  title = "Are you sure you want to delete?",
  deleteFunction,
  buttonElement = {
    icon: <PlusIcon className="h-4 w-4 text-primary-600" />,
    text: "Delete Project",
    styleClass: "",
  },
  isLoading,
  afterFunction,
  "data-delete-project-button": dataAttr,
  externalIsOpen,
  externalSetIsOpen,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  // Use external state if provided, otherwise use internal state
  const isControlled = externalIsOpen !== undefined;
  const isOpen = isControlled ? externalIsOpen : internalIsOpen;

  function closeModal() {
    if (isControlled) {
      externalSetIsOpen?.(false);
    } else {
      setInternalIsOpen(false);
    }
  }
  function openModal() {
    if (isControlled) {
      externalSetIsOpen?.(true);
    } else {
      setInternalIsOpen(true);
    }
  }

  const handleFunction = async () => {
    try {
      await deleteFunction();
      afterFunction?.();
      closeModal();
    } catch (error: unknown) {
      errorManager("Delete operation failed", error);
      toast.error("Operation failed. Please try again.");
    }
  };

  return (
    <>
      {buttonElement ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            openModal();
          }}
          className={cn(
            "flex w-max h-max justify-center items-center gap-x-1 rounded-md px-3 py-2 text-sm font-semibold",
            buttonElement.styleClass
          )}
          data-delete-project-button={dataAttr}
        >
          {buttonElement.icon}
          {buttonElement.text}
        </button>
      ) : null}
      <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-xl dark:bg-zinc-800 bg-white">
          <DialogTitle className="text-xl font-medium leading-6 text-gray-900 dark:text-zinc-100">
            {title}
          </DialogTitle>
          <div className="flex flex-row gap-4 mt-10 justify-end">
            <Button
              className="text-zinc-900 text-lg bg-transparent border-black border dark:text-zinc-100 dark:border-zinc-100 hover:bg-transparent dark:hover:bg-zinc-900 dark:hover:text-white disabled:hover:bg-transparent disabled:hover:text-zinc-900"
              onClick={closeModal}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              className="text-white text-lg bg-red-600 border-black  hover:bg-red-600 hover:text-white"
              onClick={handleFunction}
              disabled={isLoading}
              isLoading={isLoading}
            >
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
