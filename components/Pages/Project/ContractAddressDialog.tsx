"use client";

import { Dialog, Transition } from "@headlessui/react";
import type { FC, ReactNode } from "react";
import { Fragment } from "react";

interface ContractAddressDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  children: ReactNode;
}

export const ContractAddressDialog: FC<ContractAddressDialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
}) => {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl dark:bg-zinc-800 bg-white p-4 sm:p-6 text-left align-middle transition-all ease-in-out duration-300">
                <Dialog.Title
                  as="h2"
                  className="text-gray-900 dark:text-zinc-100"
                >
                  <div className="text-2xl font-bold leading-6">
                    {title}
                  </div>
                  <p className="text-md text-gray-500 dark:text-gray-400 mt-2">
                    {description}
                  </p>
                </Dialog.Title>
                {children}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
