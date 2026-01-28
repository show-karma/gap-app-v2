"use client";

import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { zodResolver } from "@hookform/resolvers/zod";
import { type FC, Fragment, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useAccount } from "wagmi";
import { z } from "zod";
import { useCreateSeeds } from "@/hooks/useKarmaSeeds";
import { type LaunchSeedsParams, useLaunchKarmaSeeds } from "@/hooks/useKarmaSeedsContract";
import { getSupportedChains, type SupportedChain } from "@/services/karmaSeedsConfig";
import { getPayoutAddressForChain } from "@/src/features/chain-payout-address/hooks/use-chain-payout-address";
import { useProjectStore } from "@/store";
import { useKarmaSeedsModalStore } from "@/store/modals/karmaSeeds";
import { DEFAULT_MAX_SUPPLY } from "@/types/karmaSeeds";
import { cn } from "@/utilities/tailwind";
import { errorManager } from "../Utilities/errorManager";
import { Button } from "../ui/button";

const inputStyle = "bg-gray-100 border border-gray-400 rounded-md p-2 dark:bg-zinc-900 w-full";
const labelStyle = "text-slate-700 text-sm font-bold leading-tight dark:text-slate-200";
const errorStyle = "text-red-500 text-sm mt-1";

const launchFormSchema = z.object({
  tokenName: z
    .string()
    .min(1, { message: "Token name is required" })
    .max(32, { message: "Token name must be 32 characters or less" }),
  tokenSymbol: z
    .string()
    .min(1, { message: "Token symbol is required" })
    .max(10, { message: "Token symbol must be 10 characters or less" }),
  maxSupply: z
    .string()
    .min(1, { message: "Max supply is required" })
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 1000, {
      message: "Minimum supply is 1,000 tokens",
    })
    .refine((val) => !isNaN(Number(val)) && Number(val) <= 1000000000, {
      message: "Maximum supply is 1 billion tokens",
    }),
});

type LaunchFormSchema = z.infer<typeof launchFormSchema>;

type TransactionStep = "idle" | "deploying" | "registering" | "success" | "error";

export const LaunchKarmaSeedsDialog: FC = () => {
  const {
    isLaunchModalOpen: isOpen,
    closeLaunchModal: closeModal,
    defaultTokenName,
    defaultTokenSymbol,
    setDefaults,
  } = useKarmaSeedsModalStore();

  const project = useProjectStore((state) => state.project);
  const { address } = useAccount();

  const [step, setStep] = useState<TransactionStep>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [supportedChains, setSupportedChains] = useState<SupportedChain[]>([]);
  const [selectedChainId, setSelectedChainId] = useState<number | null>(null);
  const [loadingChains, setLoadingChains] = useState(false);

  const { launch, reset: resetLaunch } = useLaunchKarmaSeeds();
  const { mutateAsync: createKarmaSeedsRecord } = useCreateSeeds();

  // Fetch supported chains when dialog opens
  useEffect(() => {
    if (isOpen && supportedChains.length === 0) {
      setLoadingChains(true);
      getSupportedChains()
        .then((chains) => {
          setSupportedChains(chains);
          // Auto-select first chain if available
          if (chains.length > 0 && !selectedChainId) {
            setSelectedChainId(chains[0].chainId);
          }
        })
        .catch((err) => {
          errorManager("Failed to load supported networks", err);
        })
        .finally(() => {
          setLoadingChains(false);
        });
    }
  }, [isOpen, supportedChains.length, selectedChainId]);

  const selectedChain = useMemo(() => {
    return supportedChains.find((c) => c.chainId === selectedChainId);
  }, [supportedChains, selectedChainId]);

  // Strictly require chain-specific payout address - no fallbacks
  const treasuryAddress = useMemo(() => {
    if (!project?.chainPayoutAddress || !selectedChainId) {
      return undefined;
    }
    return getPayoutAddressForChain(project.chainPayoutAddress, selectedChainId);
  }, [project, selectedChainId]);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    setValue,
  } = useForm<LaunchFormSchema>({
    resolver: zodResolver(launchFormSchema),
    mode: "onChange",
    defaultValues: {
      tokenName: defaultTokenName,
      tokenSymbol: defaultTokenSymbol,
      maxSupply: DEFAULT_MAX_SUPPLY,
    },
  });

  useEffect(() => {
    if (project?.details?.title) {
      setDefaults(project.details.title);
    }
  }, [project?.details?.title, setDefaults]);

  useEffect(() => {
    if (defaultTokenName) {
      setValue("tokenName", defaultTokenName);
    }
    if (defaultTokenSymbol) {
      setValue("tokenSymbol", defaultTokenSymbol);
    }
  }, [defaultTokenName, defaultTokenSymbol, setValue]);

  const handleClose = () => {
    if (step === "deploying" || step === "registering") {
      return;
    }
    closeModal();
    resetForm();
  };

  const resetForm = () => {
    setStep("idle");
    setErrorMessage("");
    resetLaunch();
    reset({
      tokenName: defaultTokenName,
      tokenSymbol: defaultTokenSymbol,
      maxSupply: DEFAULT_MAX_SUPPLY,
    });
  };

  const onSubmit = async (data: LaunchFormSchema) => {
    if (!project || !address || !treasuryAddress || !selectedChain) {
      setErrorMessage("Missing required data. Please try again.");
      return;
    }

    setStep("deploying");
    setErrorMessage("");

    try {
      const launchParams: LaunchSeedsParams = {
        projectName: project.uid,
        tokenName: data.tokenName,
        tokenSymbol: data.tokenSymbol,
        treasury: treasuryAddress as `0x${string}`,
        maxSupply: data.maxSupply,
        factoryAddress: selectedChain.factoryAddress as `0x${string}`,
        chainId: selectedChain.chainId,
      };

      const result = await launch(launchParams);

      setStep("registering");

      await createKarmaSeedsRecord({
        projectIdOrSlug: project.uid,
        request: {
          tokenName: data.tokenName,
          tokenSymbol: data.tokenSymbol,
          maxSupply: data.maxSupply,
          treasuryAddress: treasuryAddress,
          contractAddress: result.tokenAddress,
          factoryAddress: selectedChain.factoryAddress,
          deploymentTxHash: result.txHash,
          chainID: selectedChain.chainId,
        },
      });

      setStep("success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error occurred";
      setErrorMessage(message);
      setStep("error");
      errorManager("Error launching Karma Seeds", error, {
        project: project?.details?.slug || project?.uid,
        address,
      });
    }
  };

  const getStepContent = () => {
    switch (step) {
      case "deploying":
        return (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
            <p className="text-lg font-medium text-gray-900 dark:text-zinc-100">
              Deploying Karma Seeds Contract...
            </p>
            <p className="text-sm text-gray-500 dark:text-zinc-400">
              Please confirm the transaction in your wallet
            </p>
          </div>
        );
      case "registering":
        return (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
            <p className="text-lg font-medium text-gray-900 dark:text-zinc-100">
              Registering Karma Seeds...
            </p>
            <p className="text-sm text-gray-500 dark:text-zinc-400">
              Saving your token information
            </p>
          </div>
        );
      case "success":
        return (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <div className="rounded-full h-12 w-12 bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <svg
                className="h-6 w-6 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-900 dark:text-zinc-100">
              Karma Seeds Launched!
            </p>
            <p className="text-sm text-gray-500 dark:text-zinc-400 text-center">
              Your supporters can now buy Karma Seeds to fund your project.
            </p>
            <Button onClick={handleClose} className="mt-4">
              Close
            </Button>
          </div>
        );
      case "error":
        return (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <div className="rounded-full h-12 w-12 bg-red-100 dark:bg-red-900 flex items-center justify-center">
              <svg
                className="h-6 w-6 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-900 dark:text-zinc-100">Launch Failed</p>
            <p className="text-sm text-red-500 text-center max-w-md">
              {errorMessage || "An error occurred while launching Karma Seeds."}
            </p>
            <div className="flex gap-3 mt-4">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={resetForm}>Try Again</Button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (!project) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
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
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl dark:bg-zinc-800 bg-white p-6 text-left align-middle transition-all">
                {step !== "idle" ? (
                  getStepContent()
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-6">
                      <Dialog.Title
                        as="h3"
                        className="text-xl font-semibold leading-6 text-gray-900 dark:text-zinc-100"
                      >
                        Launch Karma Seeds
                      </Dialog.Title>
                      <button
                        type="button"
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-500"
                      >
                        <XMarkIcon className="h-6 w-6" />
                      </button>
                    </div>

                    <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6">
                      Launch a token for your project that supporters can purchase to fund your
                      work. Each token costs $1 USD equivalent.
                    </p>

                    {loadingChains ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
                      </div>
                    ) : supportedChains.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500 dark:text-zinc-400">
                          Karma Seeds is not available yet. Please check back later.
                        </p>
                      </div>
                    ) : (
                      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div>
                          <label htmlFor="network" className={labelStyle}>
                            Network
                          </label>
                          <select
                            id="network"
                            value={selectedChainId || ""}
                            onChange={(e) => setSelectedChainId(Number(e.target.value))}
                            className={inputStyle}
                          >
                            {supportedChains.map((chain) => (
                              <option key={chain.chainId} value={chain.chainId}>
                                {chain.chainName}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label htmlFor="tokenName" className={labelStyle}>
                            Token Name
                          </label>
                          <input
                            {...register("tokenName")}
                            id="tokenName"
                            type="text"
                            placeholder="e.g., KSEED-MyProject"
                            className={cn(inputStyle, errors.tokenName && "border-red-500")}
                          />
                          {errors.tokenName && (
                            <p className={errorStyle}>{errors.tokenName.message}</p>
                          )}
                        </div>

                        <div>
                          <label htmlFor="tokenSymbol" className={labelStyle}>
                            Token Symbol
                          </label>
                          <input
                            {...register("tokenSymbol")}
                            id="tokenSymbol"
                            type="text"
                            placeholder="e.g., KS-MP"
                            className={cn(inputStyle, errors.tokenSymbol && "border-red-500")}
                          />
                          {errors.tokenSymbol && (
                            <p className={errorStyle}>{errors.tokenSymbol.message}</p>
                          )}
                        </div>

                        <div>
                          <label htmlFor="maxSupply" className={labelStyle}>
                            Max Supply
                          </label>
                          <input
                            {...register("maxSupply")}
                            id="maxSupply"
                            type="text"
                            placeholder="1000000"
                            className={cn(inputStyle, errors.maxSupply && "border-red-500")}
                          />
                          {errors.maxSupply && (
                            <p className={errorStyle}>{errors.maxSupply.message}</p>
                          )}
                          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                            Maximum number of tokens that can be minted (each worth $1 USD)
                          </p>
                        </div>

                        <div>
                          <span className={labelStyle}>Treasury Address</span>
                          <div className="bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-md p-3 mt-1">
                            <p className="text-sm text-gray-700 dark:text-zinc-300 font-mono break-all">
                              {treasuryAddress || "Not configured"}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                              97% of proceeds will be sent to this address
                            </p>
                          </div>
                          {!treasuryAddress && selectedChain && (
                            <p className={errorStyle}>
                              Please configure a payout address for {selectedChain.chainName} in
                              project settings
                            </p>
                          )}
                        </div>

                        <div className="flex flex-row gap-4 mt-8 justify-end">
                          <Button type="button" variant="outline" onClick={handleClose}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={!isValid || !treasuryAddress}>
                            Launch Karma Seeds
                          </Button>
                        </div>
                      </form>
                    )}
                  </>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default LaunchKarmaSeedsDialog;
