/* eslint-disable @next/next/no-img-element */
import { FC, Fragment, ReactNode, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { PlusIcon } from "@heroicons/react/24/solid";
import { Button } from "../Utilities/Button";
import type { Milestone } from "@show-karma/karma-gap-sdk";
import { createCreatorClient } from "@zoralabs/protocol-sdk";
import {
  usePublicClient,
  useWalletClient,
  useAccount,
  useChainId,
  useSignTypedData,
} from "wagmi";
import toast from "react-hot-toast";
import { useProjectStore } from "@/store";
import { MESSAGES } from "@/utilities/messages";
import { Address } from "viem";

type MilestoneNFTDialogProps = {
  title?: ReactNode;
  milestone: Milestone;
  buttonElement?: {
    text: string;
    icon: ReactNode;
    styleClass: string;
  };
  afterFunction?: () => void;
};

export const MilestoneNFTDialog: FC<MilestoneNFTDialogProps> = ({
  title = "Are you sure you want to delete?",
  milestone,
  buttonElement = {
    icon: <PlusIcon className="h-4 w-4 text-primary-600" />,
    text: "New Project",
    styleClass:
      "flex justify-center items-center gap-x-1 rounded-md bg-primary-50 dark:bg-primary-900/50 px-3 py-2 text-sm font-semibold text-primary-600 dark:text-zinc-100  hover:bg-primary-100 dark:hover:bg-primary-900 border border-primary-200 dark:border-primary-900",
  },
  afterFunction,
}) => {
  const walletClient = useWalletClient();
  const publicClient = usePublicClient();
  const { address: creatorAddress } = useAccount();
  const { signTypedData, data: signature } = useSignTypedData();

  // Debug to store collection info, stand-in for database, etc.
  const [debugGlobalAddress, setDebugGlobalAddress] = useState<string | null>(
    null
  );
  const [debugGlobalUid, setDebugGlobalUid] = useState<number | null>(null);
  const [premintConfig, setPremintConfig] = useState<any>(null);
  const [collectionAddress, setCollectionAddress] = useState<string | null>(
    null
  );
  const [typedDataDefinition, setTypedDataDefinition] = useState<any>(null);
  const [submit, setSubmit] = useState<Function | null>(null);

  const creatorClient = createCreatorClient({
    chainId: milestone.chainID,
    publicClient: publicClient as any,
  });

  let [isOpen, setIsOpen] = useState(false);
  const [isMintingMilestone, setIsMintingMilestone] = useState(false);
  const refreshProject = useProjectStore((state) => state.refreshProject);
  const selectedProject = useProjectStore((state) => state.project);

  function closeModal() {
    setIsOpen(false);
  }
  function openModal() {
    setIsOpen(true);
  }

  useEffect(() => {
    async function createPremint() {
      const {
        premintConfig: pC,
        collectionAddress: cA,
        typedDataDefinition: tDD,
        submit: sub,
      } = await creatorClient.createPremint({
        // collection info of collection to create.  The combination of these fields will determine the
        // deterministic collection address.
        contract: {
          // the account that will be the admin of the collection.  Must match the signer of the premint.
          contractAdmin: creatorAddress as Address,
          contractName: "GAP Milestone NFT",
          contractURI: "ipfs://QmYjwarNweXhQAfu3phirz8vwnwFEqo5t8m3xt3HWpFd8N",
        },
        // token info of token to create
        token: {
          tokenURI: "ipfs://QmXr9NuvX9afZhHTpd2jRgFHbVnaWPKD315AtnTT6H67hz",
          createReferral: "0x5A4830885f12438E00D8f4d98e9Fe083e707698C",
          maxSupply: BigInt(50000),
          maxTokensPerAddress: BigInt(1),
          mintStart: BigInt(0),
          mintDuration: BigInt(0), // 0 for infinite.
          pricePerToken: BigInt(0), // 0 for it to be a free mint.
          payoutRecipient: creatorAddress as Address, // address to receive creator rewards for free mints, or if its a paid mint, the paid mint sale proceeds.
        },
      });

      setPremintConfig(pC);
      setCollectionAddress(cA);
      setTypedDataDefinition(tDD);
      setSubmit(() => sub); // Ensure submit is set as a function
    }

    if (creatorAddress) {
      createPremint();
    }
  }, [creatorAddress]);

  useEffect(() => {
    if (signature) {
      if (submit) {
        submit({
          signature,
        });
        // Debug to store collection info
        setDebugGlobalAddress(collectionAddress);
        setDebugGlobalUid(premintConfig.uid);
      } else {
        console.error("Submit function is not set.");
      }
    }
  }, [signature]);

  return (
    <>
      <Button onClick={openModal} className={buttonElement.styleClass}>
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
                    {title}
                  </Dialog.Title>
                  <div className="flex flex-row gap-4 mt-10 justify-end">
                    <Button
                      className="text-zinc-900 text-lg bg-transparent border-black border dark:text-zinc-100 dark:border-zinc-100 hover:bg-transparent dark:hover:bg-zinc-900 dark:hover:text-white disabled:hover:bg-transparent disabled:hover:text-zinc-900"
                      onClick={closeModal}
                      disabled={isMintingMilestone}
                    >
                      Cancel
                    </Button>

                    {!debugGlobalAddress || !debugGlobalUid ? (
                      <Button
                        className="text-white text-lg bg-red-600 border-black  hover:bg-red-600 hover:text-white"
                        onClick={() => signTypedData(typedDataDefinition)}
                        disabled={isMintingMilestone}
                        isLoading={isMintingMilestone}
                      >
                        Continue
                      </Button>
                    ) : (
                      <div className="flex h-10 items-center space-x-4">
                        <p>Collection Address: {debugGlobalAddress}</p>
                        <p>UID: {debugGlobalUid}</p>
                      </div>
                    )}
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
