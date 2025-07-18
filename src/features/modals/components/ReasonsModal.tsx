
/* eslint-disable @next/next/no-img-element */
import { FC, Fragment, ReactNode, useEffect, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
    CheckIcon,
    XMarkIcon
} from "@heroicons/react/24/solid";
import { Button } from "@/components/ui/button";


export const ReasonsModal: FC<{
    text: string;
    reasons: string[];
}> = ({
    text,
    reasons
}) => {
        const [isOpen, setIsOpen] = useState(false);
        return (
            <>
                <Button
                    onClick={() => setIsOpen(true)}
                    className={`flex items-center gap-x-1 rounded-md px-3 py-2 text-sm font-semibold border ${text === "Include"
                        ? 'text-green-800 bg-green-100 hover:bg-green-200 border-green-200'
                        : 'text-red-800 bg-red-100 hover:bg-red-200 border-red-200'
                        } dark:bg-primary-900/50 dark:text-zinc-100 dark:hover:bg-primary-900 dark:border-primary-900`}
                >
                    {text === "Include" ? <CheckIcon className="h-4 w-4" /> : <XMarkIcon className="h-4 w-4" />}
                    <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full`}>
                        {text}
                    </span>
                </Button>
                <Transition appear show={isOpen} as={Fragment}>
                    <Dialog as="div" className="relative z-10" onClose={() => setIsOpen(false)}>
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
                                    <Dialog.Panel className="w-full max-w-7xl transform overflow-hidden rounded-2xl dark:bg-zinc-800 bg-white p-6 text-left align-middle transition-all ease-in-out duration-300">
                                        <Dialog.Title
                                            as="h3"
                                            className=" text-gray-900 dark:text-zinc-100"
                                        >
                                            <h2 className="text-2xl font-bold leading-6">
                                                Reasons to {text.toLowerCase()} this project
                                            </h2>
                                            <p className="mt-2">
                                                *as evaluated by Karma AI
                                            </p>
                                        </Dialog.Title>
                                        <div className="max-h-[60vh] flex flex-col gap-2 mt-8 overflow-y-auto">
                                            {reasons && reasons.length > 0 ? (
                                                <div className="space-y-3">
                                                    {reasons.map((reason, index) => (
                                                        <div key={index} className="text-gray-700 dark:text-gray-300">
                                                            <span className="font-semibold">Milestone #{index + 1}</span> <p>{reason}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-gray-500 dark:text-gray-400 italic">
                                                    No reasons provided.
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex flex-row gap-4 mt-10 justify-end">
                                            <Button
                                                className="text-zinc-900 text-lg bg-transparent border-black border dark:text-zinc-100 dark:border-zinc-100 hover:bg-zinc-900 hover:text-white disabled:hover:bg-transparent disabled:hover:text-zinc-900"
                                                onClick={() => setIsOpen(false)}
                                            >
                                                Close
                                            </Button>
                                        </div>
                                    </Dialog.Panel>
                                </Transition.Child>
                            </div>
                        </div>
                    </Dialog>
                </Transition>
            </>
        );
    };
