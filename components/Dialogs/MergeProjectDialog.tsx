/* eslint-disable @next/next/no-img-element */
import { FC, Fragment, ReactNode, useState, useEffect, } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { PlusIcon } from "@heroicons/react/24/solid";
import { Button } from "../Utilities/Button";
import toast from "react-hot-toast";
import { isHexString } from "ethers";
import { useProjectStore } from "@/store";
import { useSwitchChain } from "wagmi";
import { useSigner, walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { checkNetworkIsValid } from "@/utilities/checkNetworkIsValid";
import { getWalletClient } from "@wagmi/core";
import { useStepper } from "@/store/modals/txStepper";
import { getProjectById, getProjectOwner } from "@/utilities/sdk";
import { config } from "@/utilities/wagmi/config";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import debounce from "lodash.debounce";
import { MagnifyingGlassIcon } from "@heroicons/react/20/solid";
import { Spinner } from "../Utilities/Spinner";
import EthereumAddressToENSName from "../EthereumAddressToENSName";
import { blo } from "blo";
import { PAGES } from "@/utilities/pages";
import {
    IProjectResponse,
    ISearchResponse,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { useAccount } from "wagmi";
import { MESSAGES } from "@/utilities/messages";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getGapClient, useGap } from "@/hooks";
import { ProjectPointer } from "@show-karma/karma-gap-sdk";

type MergeProjectProps = {
    buttonElement?: {
        text: string;
        icon: ReactNode;
        styleClass: string;
    };
};

function SearchProject({

    setPrimaryProject,
}: {

    setPrimaryProject: (value: string) => void;
}) {
    const [results, setResults] = useState<ISearchResponse>({ communities: [], projects: [] });
    const [isSearchListOpen, setIsSearchListOpen] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const closeSearchList = () => {
        setTimeout(() => {
            setIsSearchListOpen(false);
        }, 200);
    };

    const debouncedSearch = debounce(async (value: string) => {
        if (value.length < 3) {
            setResults({ communities: [], projects: [] });
            return setIsSearchListOpen(false);
        }

        setIsLoading(true);
        setIsSearchListOpen(true);
        const result = await gapIndexerApi.search(value);
        setResults(result.data);
        return setIsLoading(false);
    }, 500);


    const renderItem = (
        item: IProjectResponse,
        href: string
    ) => {
        return (
            <div
                key={item.uid}
                onClick={() => {
                    setPrimaryProject(item.uid);
                    closeSearchList();
                }}
            >
                <div className=":last:border-b-0 cursor-pointer select-none border-b border-slate-100 px-4 py-2 transition hover:bg-slate-200 dark:hover:bg-zinc-700">
                    <b className="max-w-full text-ellipsis font-bold text-black dark:text-zinc-100">
                        {item?.details?.data.slug}
                    </b>
                    <br />
                    <div className="text-gray-500 dark:text-gray-200">
                        <div className="mt-3 flex items-center">
                            <small className="mr-2">By</small>
                            <div className="flex flex-row gap-1 items-center font-medium">
                                <img
                                    src={blo(item.recipient)}
                                    className="w-4 h-4  rounded-full border-1 border-gray-100 dark:border-zinc-900"
                                    alt="Recipient's Profile Picture"
                                />
                                <EthereumAddressToENSName address={item.recipient} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div
            className="relative flex flex-row items-center gap-3 rounded-lg h-max w-full bg-zinc-100 px-4 max-2xl:gap-1 max-2xl:px-2 text-gray-600 dark:text-gray-200 dark:bg-zinc-800"
            onBlur={() => closeSearchList()}
        >
            <MagnifyingGlassIcon className="h-5 w-5" />
            <input
                type="text"
                placeholder="Search for the primary project"
                className="w-full min-w-[160px] bg-transparent placeholder:text-gray-400 px-1 py-2 text-gray-600 dark:text-gray-200 border-none border-b-zinc-800 outline-none focus:ring-0"
                onChange={(e) => debouncedSearch(e.target.value)}
                onFocus={() => [...results.projects, ...results.communities].length > 0 && setIsSearchListOpen(true)}
            />
            {isSearchListOpen && (
                <div className="absolute left-0 top-10 mt-3 max-h-32 min-w-full overflow-y-scroll rounded-md bg-white dark:bg-zinc-800 py-4 border border-zinc-200">
                    {results.projects.length > 0 &&
                        results.projects.map((project) =>
                            renderItem(
                                project,
                                PAGES.PROJECT.GRANTS(project.details?.data.slug || project.uid)
                            )
                        )}

                    {isLoading && (
                        <div className="flex justify-center ">
                            <Spinner />
                        </div>
                    )}
                    {!isLoading &&
                        results.projects.length === 0 &&
                        (
                            <div className="flex flex-col items-center text-center">
                                <div className="w-full text-center">No results found.</div>
                            </div>
                        )}
                </div>
            )}
        </div>
    );
}


const pointerSchema = z.object({
    ogProjectUID: z.string().startsWith("0x").length(42),
});

type PointerType = z.infer<typeof pointerSchema>;

export const MergeProjectDialog: FC<MergeProjectProps> = ({
    buttonElement = {
        icon: <PlusIcon className="h-4 w-4 text-primary-600" />,
        text: "New Project",
        styleClass:
            "flex items-center gap-x-1 rounded-md bg-primary-50 dark:bg-primary-900/50 px-3 py-2 text-sm font-semibold text-primary-600 dark:text-zinc-100  hover:bg-primary-100 dark:hover:bg-primary-900 border border-primary-200 dark:border-primary-900",
    },
}) => {

    let [isOpen, setIsOpen] = useState(false);
    const [primaryProject, setPrimaryProject] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);
    const [validAddress, setValidAddress] = useState(true);

    const { gap } = useGap();
    const { address } = useAccount();

    function closeModal() {
        setIsOpen(false);
    }
    function openModal() {
        setIsOpen(true);
    }
    const signer = useSigner();
    const { chain } = useAccount();
    const project = useProjectStore((state) => state.project);
    const refreshProject = useProjectStore((state) => state.refreshProject);
    const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
    const setIsProjectOwner = useProjectStore((state) => state.setIsProjectOwner);
    const { switchChainAsync } = useSwitchChain();
    const { changeStepperStep, setIsStepper } = useStepper();

    const createProjectPointer = async ({ ogProjectUID }: PointerType) => {
        let gapClient = gap;
        if (!address || !project) return;
        try {
            if (chain?.id !== project.chainID) {
                await switchChainAsync?.({ chainId: project.chainID });
                gapClient = getGapClient(project.chainID);
            }
            const walletClient = await getWalletClient(config, {
                chainId: project.chainID,
            });
            if (!walletClient || !gapClient) return;
            const walletSigner = await walletClientToSigner(walletClient);

            const projectPointer = new ProjectPointer({
                data: {
                    ogProjectUID,
                    type: "project-pointer",
                },
                recipient: project.recipient,
                refUID: project.uid,
                schema: gapClient.findSchema("ProjectPointer"),
            });

            await projectPointer
                .attest(walletSigner as any, changeStepperStep)
                .then(async () => {
                    let retries = 1000;
                    changeStepperStep("indexing");
                    while (retries > 0) {
                        await refreshProject()
                            .then(async (fetchedProject) => {
                                const attestUID = projectPointer.uid;
                                const alreadyExists = fetchedProject?.pointers.find(
                                    (g) => g.uid === attestUID
                                );

                                if (alreadyExists) {
                                    retries = 0;
                                    changeStepperStep("indexed");
                                    toast.success(MESSAGES.PROJECT_POINTER_FORM.SUCCESS);
                                }
                                retries -= 1;
                                // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
                                await new Promise((resolve) => setTimeout(resolve, 1500));
                            })
                            .catch(async () => {
                                retries -= 1;
                                // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
                                await new Promise((resolve) => setTimeout(resolve, 1500));
                            });
                    }
                });
        } catch (error) {
            console.log(error);
            toast.error(MESSAGES.PROJECT_POINTER_FORM.ERROR);
        } finally {
            setIsStepper(false);
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (primaryProject?.length) setValidAddress(isHexString(primaryProject));
    }, [primaryProject]);

    return (
        <>
            <Button
                disabled={!isProjectOwner}
                onClick={openModal}
                className={buttonElement.styleClass}
            >
                {buttonElement.icon}
                {buttonElement.text}
            </Button>
            <Transition appear show={isOpen} as={Fragment}>
                <Dialog as="div" className="relative z-10" onClose={closeModal}>
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
                                <Dialog.Panel className="w-full max-w-xl transform overflow-hidden rounded-2xl dark:bg-zinc-800 bg-white p-6 text-left align-middle  transition-all">
                                    <Dialog.Title
                                        as="h3"
                                        className="text-xl font-medium leading-6 text-gray-900 dark:text-zinc-100"
                                    >
                                        Merge current project with primary project
                                    </Dialog.Title>
                                    <div className="flex flex-col gap-2 mt-8">
                                        <label htmlFor="primaryProject">Primary Project UID</label>
                                        <input
                                            className="rounded border border-zinc-300  dark:bg-zinc-800 px-2 py-1 text-black dark:text-white"
                                            type="text"
                                            value={primaryProject}
                                            onChange={(e) => setPrimaryProject(e.target.value)}
                                        />
                                        <p className="text-red-500 mb-2">
                                            {!validAddress && primaryProject?.length
                                                ? `Invalid address. Address should be a hexadecimal string with
                exactly 42 characters.`
                                                : null}
                                        </p>
                                        <p className="text-red-500 mb-2">
                                            {project?.symlinks?.length
                                                ? `This project is primary project. Cannot be merged with another project. Please delete any existing pointers to enable merging.`
                                                : null}
                                        </p>
                                        <p className="text-zinc-500 mb-2">
                                            {project?.pointers?.length
                                                ? `This project has already been merged.
                                                Are you sure you want to add another pointer to this project?`
                                                : null}
                                        </p>
                                    </div>
                                    <SearchProject setPrimaryProject={
                                        setPrimaryProject
                                    } />
                                    <div className="flex flex-row gap-4 mt-20 pt-20 justify-end">
                                        <Button
                                            className="text-zinc-900 text-lg bg-transparent border-black border dark:text-zinc-100 dark:border-zinc-100 hover:bg-zinc-900 hover:text-white disabled:hover:bg-transparent disabled:hover:text-zinc-900"
                                            onClick={closeModal}
                                            disabled={isLoading}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            className="text-white text-lg bg-red-600 border-black  hover:bg-red-600 hover:text-white"
                                            onClick={
                                                async () => {
                                                    if (!validAddress) return;
                                                    setIsLoading(true);
                                                    await createProjectPointer({ ogProjectUID: primaryProject });
                                                }
                                            }
                                            disabled={isLoading || !primaryProject || Boolean(project?.symlinks?.length)}
                                            isLoading={isLoading}
                                            type="button"
                                        >
                                            Merge to primary project
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
