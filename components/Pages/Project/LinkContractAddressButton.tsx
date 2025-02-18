"use client";

import { Button } from "@/components/Utilities/Button";
import { useOwnerStore, useProjectStore } from "@/store";
import { useCommunityAdminStore } from "@/store/communityAdmin";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { Dialog, Transition } from "@headlessui/react";
import { CheckCircleIcon, LinkIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import type { FC } from "react";
import { Fragment, useEffect, useState } from "react";

interface LinkContractAddressesButtonProps {
    buttonClassName?: string;
    project: IProjectResponse & { external: Record<string, string[]> };
}

export const LinkContractAddressButton: FC<
    LinkContractAddressesButtonProps
> = ({ project, buttonClassName }) => {
    const isOwner = useOwnerStore((state) => state.isOwner);
    const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
    const isCommunityAdmin = useCommunityAdminStore(
        (state) => state.isCommunityAdmin
    );
    const isAuthorized = isOwner || isProjectOwner || isCommunityAdmin;

    const [isOpen, setIsOpen] = useState(false);
    const [addresses, setAddresses] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (project?.external?.evm?.length) {
            setAddresses(project.external.evm);
        } else {
            setAddresses(['']); // Start with one empty input
        }
    }, [project?.external?.evm]);

    const handleAddAddress = () => {
        setAddresses([...addresses, '']);
    };

    const handleRemoveAddress = (index: number) => {
        const newAddresses = addresses.filter((_, i) => i !== index);
        if (newAddresses.length === 0) {
            setAddresses(['']); // Always keep at least one input
        } else {
            setAddresses(newAddresses);
        }
    };

    const handleAddressChange = (index: number, value: string) => {
        const newAddresses = [...addresses];
        newAddresses[index] = value;
        setAddresses(newAddresses);
    };

    const handleSave = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Filter out empty addresses
            const validAddresses = addresses.filter(addr => addr.trim() !== '');

            const [data, error] = await fetchData(
                INDEXER.PROJECT.EXTERNAL.UPDATE(project.uid),
                "PUT",
                {
                    target: "evm",
                    ids: validAddresses,
                }
            );

            if (data) {
                setAddresses(validAddresses);
            }

            if (error) {
                setError(`Failed to update contract addresses. Please try again.`);
            }
        } catch (err) {
            setError(`Failed to update contract addresses. Please try again.`);
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isAuthorized) {
        return null;
    }

    return (
        <>
            <Button
                onClick={() => setIsOpen(true)}
                className={buttonClassName}
            >
                <LinkIcon className={"mr-2 h-5 w-5"}
                    aria-hidden="true" />
                Link Contract
            </Button>
            <Transition appear show={isOpen} as={Fragment}>
                <Dialog
                    as="div"
                    className="relative z-10"
                    onClose={() => setIsOpen(false)}
                >
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
                                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl dark:bg-zinc-800 bg-white p-6 text-left align-middle transition-all ease-in-out duration-300">
                                    <Dialog.Title
                                        as="h3"
                                        className="text-gray-900 dark:text-zinc-100"
                                    >
                                        <h2 className="text-2xl font-bold leading-6">
                                            Link Contract Addresses
                                        </h2>
                                        <p className="text-md text-gray-500 dark:text-gray-400 mt-2">
                                            Add one or more contract addresses for the project. This will enable the project to retrieve its on-chain metrics for impact tracking.
                                        </p>
                                    </Dialog.Title>
                                    <div className="max-h-[60vh] flex flex-col gap-4 mt-8 overflow-y-auto">
                                        {addresses.map((address, index) => (
                                            <div key={index} className="flex items-center space-x-2">
                                                <div className="flex items-center justify-between p-4 bg-gray-100 dark:bg-zinc-700 rounded-lg flex-grow">
                                                    <div className="flex items-center space-x-4 w-full">
                                                        <span className="text-md font-bold capitalize whitespace-nowrap">
                                                            Address {index + 1}
                                                        </span>
                                                        <input
                                                            type="text"
                                                            value={address}
                                                            onChange={(e) => handleAddressChange(index, e.target.value)}
                                                            className="text-sm rounded-md w-full text-gray-600 dark:text-gray-300 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500"
                                                            placeholder="Enter contract address"
                                                        />
                                                    </div>
                                                </div>
                                                {addresses.length > 1 && (
                                                    <Button
                                                        onClick={() => handleRemoveAddress(index)}
                                                        className="p-2 text-red-500 hover:text-red-700"
                                                        aria-label="Remove address"
                                                    >
                                                        <TrashIcon className="h-5 w-5" />
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                        <Button
                                            onClick={handleAddAddress}
                                            className="flex items-center justify-center text-white gap-2 border border-primary-500 bg-primary-500 hover:bg-primary-600"
                                        >
                                            <PlusIcon className="h-5 w-5" />
                                            Add Another Address
                                        </Button>
                                        {error && <p className="text-red-500 mt-2">{error}</p>}
                                    </div>
                                    <div className="flex flex-row gap-4 mt-10 justify-end">
                                        <Button
                                            onClick={handleSave}
                                            disabled={isLoading}
                                            className="bg-primary-500 text-white hover:bg-primary-600"
                                        >
                                            {isLoading ? "Saving..." : "Save All"}
                                        </Button>
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
