"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useChainId,
  useSendTransaction,
  useSwitchChain,
  useBalance,
  useWriteContract,
  useConnect,
} from "wagmi";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { Button } from "./Utilities/Button";
import { parseEther, isAddress, type Hash, parseUnits, erc20Abi } from "viem";
import toast from "react-hot-toast";
import { errorManager } from "./Utilities/errorManager";
import { TransactionLink } from "./Utilities/TransactionLink";
import { useProjectStore } from "@/store";
import { useMiniAppStore } from "@/store/miniApp";
import { useMixpanel } from "@/hooks/useMixpanel";

interface MiniAppFundProps {
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
}

// Define supported tokens
interface Token {
  symbol: string;
  name: string;
  address?: `0x${string}`; // null for native token
  decimals: number;
}

// Define supported networks
interface Network {
  id: number;
  name: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: 18;
  };
  tokens: Token[];
}

// Network definitions
const NETWORKS: Network[] = [
  {
    id: 42220, // Celo
    name: "Celo",
    nativeCurrency: {
      name: "Celo",
      symbol: "CELO",
      decimals: 18,
    },
    tokens: [
      { symbol: "CELO", name: "Celo", address: undefined, decimals: 18 },
      {
        symbol: "USDT",
        name: "Tether USD",
        address: "0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e",
        decimals: 6,
      },
      {
        symbol: "USDC",
        name: "USD Coin",
        address: "0xceba9300f2b948710d2653dd7b07f33a8b32118c",
        decimals: 6,
      },
      {
        symbol: "WETH",
        name: "Wrapped Ether",
        address: "0x122013fd7dF1C6F636a5bb8f03108E876548b455",
        decimals: 18,
      },
    ],
  },
  // {
  //   id: 8453, // Base
  //   name: "Base",
  //   nativeCurrency: {
  //     name: "Ethereum",
  //     symbol: "ETH",
  //     decimals: 18,
  //   },
  //   tokens: [
  //     { symbol: "ETH", name: "Ethereum", address: undefined, decimals: 18 },
  //     {
  //       symbol: "USDC",
  //       name: "USD Coin",
  //       address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  //       decimals: 6,
  //     },
  //   ],
  // },
];

const MiniAppFund = ({ position = "bottom-right" }: MiniAppFundProps) => {
  const { project } = useProjectStore();
  const projectName = project?.details?.data?.title;
  const projectOwnerAddress = project?.recipient as `0x${string}`;
  const { isConnected, address } = useAccount();
  const { connectors, connectAsync } = useConnect();
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState<string>("0.01");
  const [isSuccess, setIsSuccess] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const { isMiniApp } = useMiniAppStore();
  const { mixpanel } = useMixpanel();

  // Network selection state
  const [selectedNetwork, setSelectedNetwork] = useState<Network>(NETWORKS[0]); // Default to Celo

  // Token selection state
  const [selectedToken, setSelectedToken] = useState<Token>(
    NETWORKS[0].tokens[0]
  ); // Default to native CELO

  const currentChainId = useChainId();
  console.log("currentChainId", currentChainId);
  const { switchChainAsync, switchChain } = useSwitchChain();

  // Update selected token when network changes
  useEffect(() => {
    setSelectedToken(selectedNetwork.tokens[0]);
  }, [selectedNetwork]);

  // Get balance for selected token
  const { data: balance, refetch: refetchBalance } = useBalance({
    address,
    token: selectedToken.address,
    chainId: selectedNetwork.id,
  });

  const { sendTransaction, isPending: isNativePending } = useSendTransaction({
    mutation: {
      onSuccess: (data: Hash) => {
        setTxHash(data);
        setIsSuccess(true);
        toast.success(`Thank you for funding ${projectName}!`);
      },
      onError: (error: Error) => {
        console.log("error", error);
        errorManager(
          `Error sending funds to ${projectOwnerAddress}`,
          error,
          {
            projectOwnerAddress,
            amount,
            token: selectedToken.symbol,
            network: selectedNetwork.name,
          },
          { error: "Failed to send funds." }
        );
      },
    },
  });

  // For ERC20 tokens
  const { writeContractAsync, isPending: isTokenPending } = useWriteContract({
    mutation: {
      onSuccess: (data: Hash) => {
        setTxHash(data);
        setIsSuccess(true);
        toast.success(`Thank you for funding ${projectName}!`);
      },
      onError: (error: Error) => {
        console.log("error", error);
        errorManager(
          `Error sending ${selectedToken.symbol} to ${projectOwnerAddress}`,
          error,
          {
            projectOwnerAddress,
            amount,
            token: selectedToken.symbol,
            network: selectedNetwork.name,
          },
          { error: "Failed to send funds." }
        );
      },
    },
  });

  const isPending = isNativePending || isTokenPending;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers and decimal points
    const value = e.target.value;
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };

  const handleFund = async () => {
    try {
      if (!isAddress(projectOwnerAddress)) {
        toast.error("Invalid recipient address");
        return;
      }

      if (parseFloat(amount) <= 0) {
        toast.error("Please enter a valid amount");
        return;
      }

      if (!isConnected) {
        await connectAsync({ connector: connectors[0] });
      }

      if (currentChainId !== selectedNetwork.id) {
        await switchChainAsync({ chainId: selectedNetwork.id });
      }

      // If native token
      if (!selectedToken.address) {
        sendTransaction({
          to: projectOwnerAddress,
          value: parseEther(amount),
          chainId: selectedNetwork.id,
        });
      } else {
        // If ERC20 token
        const tokenAmount = parseUnits(amount, selectedToken.decimals);

        await writeContractAsync({
          address: selectedToken.address,
          abi: erc20Abi,
          functionName: "transfer",
          args: [projectOwnerAddress, tokenAmount],
          chainId: selectedNetwork.id,
        });
      }
      mixpanel.reportEvent({
        event: "funding:miniapp",
        properties: {
          address,
          amount,
          token: selectedToken.symbol,
          network: selectedNetwork.name,
          projectOwnerAddress,
          projectName,
          projectUID: project?.uid,
        },
      });
      refetchBalance();
    } catch (error) {
      errorManager(
        `Error funding ${projectOwnerAddress}`,
        error,
        {
          projectOwnerAddress,
          amount,
          token: selectedToken.symbol,
          network: selectedNetwork.name,
        },
        { error: "Failed to send funds." }
      );
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsSuccess(false);
    setTxHash(null);
  };

  // Position classes
  const positionClasses = {
    "bottom-right": "bottom-4 right-4",
    "bottom-left": "bottom-4 left-4",
    "top-right": "top-4 right-4",
    "top-left": "top-4 left-4",
  };

  const tryConnect = async () => {
    try {
      await connectAsync({ connector: connectors[0] });
    } catch (error) {
      errorManager(
        "Error connecting to Farcaster",
        error,
        {
          connector: connectors[0],
        },
        { error: "Failed to connect to Farcaster" }
      );
    }
  };

  useEffect(() => {
    if (isMiniApp && !isConnected) {
      tryConnect();
    }
  }, [isMiniApp, isConnected]);

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed ${positionClasses[position]} z-50 flex items-center justify-center gap-2 px-4 py-3 bg-green-700 rounded-full shadow-lg hover:bg-green-700/80 transition-all duration-300 text-white`}
        aria-label="Contribute Now"
      >
        {/* Dollar/Currency icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </svg>
        <span className="font-semibold">Tip Project</span>
      </button>

      {/* Fund Dialog */}
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-[100]" onClose={handleClose}>
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
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl dark:bg-zinc-800 bg-white p-6 text-left align-middle transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-xl font-medium leading-6 text-gray-900 dark:text-zinc-100"
                  >
                    {isSuccess ? "Thank You!" : `Fund ${projectName}`}
                  </Dialog.Title>

                  {isSuccess && txHash ? (
                    <div className="mt-4">
                      <p className="text-gray-500 dark:text-gray-300">
                        Appreciate your support! {projectName} just got stronger
                        thanks to your contribution.
                      </p>
                      <div className="mt-4">
                        <p className="text-sm text-gray-500 dark:text-gray-300">
                          Transaction:{" "}
                          <TransactionLink
                            transactionHash={txHash}
                            chainId={selectedNetwork.id}
                          />
                        </p>
                      </div>
                      <div className="mt-6 flex justify-end">
                        <Button onClick={handleClose}>Close</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mt-4">
                        <p className="text-gray-500 dark:text-gray-300">
                          Support {projectName} by sending funds directly to the
                          project creator.
                        </p>

                        {/* Network Selection Dropdown */}
                        {/* <div className="mt-4">
                          <label
                            htmlFor="network"
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                          >
                            Network
                          </label>
                          <select
                            id="network"
                            name="network"
                            className="mt-1 block w-full rounded border border-zinc-300 dark:bg-zinc-800 px-2 py-1 text-black dark:text-white"
                            value={selectedNetwork.name}
                            onChange={(e) => {
                              const network = NETWORKS.find(
                                (n) => n.name === e.target.value
                              );
                              if (network) {
                                setSelectedNetwork(network);
                                if (currentChainId !== selectedNetwork.id) {
                                  switchChain({ chainId: selectedNetwork.id });
                                }
                              }
                            }}
                          >
                            {NETWORKS.map((network) => (
                              <option key={network.id} value={network.name}>
                                {network.name}
                              </option>
                            ))}
                          </select>
                        </div> */}

                        {/* Token Selection Dropdown */}
                        <div className="mt-4">
                          <label
                            htmlFor="token"
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                          >
                            Token
                          </label>
                          <select
                            id="token"
                            name="token"
                            className="mt-1 block w-full rounded border border-zinc-300 dark:bg-zinc-800 px-2 py-1 text-black dark:text-white"
                            value={selectedToken.symbol}
                            onChange={(e) => {
                              const token = selectedNetwork.tokens.find(
                                (t) => t.symbol === e.target.value
                              );
                              if (token) setSelectedToken(token);
                            }}
                          >
                            {selectedNetwork.tokens.map((token) => (
                              <option key={token.symbol} value={token.symbol}>
                                {token.name} ({token.symbol})
                              </option>
                            ))}
                          </select>
                          {balance && (
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              Balance: {balance.formatted} {balance.symbol}
                            </p>
                          )}
                        </div>

                        {/* Amount Input */}
                        <div className="mt-4">
                          <label
                            htmlFor="amount"
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                          >
                            Amount ({selectedToken.symbol})
                          </label>
                          <div className="mt-1">
                            <input
                              type="text"
                              inputMode="decimal"
                              name="amount"
                              id="amount"
                              value={amount}
                              onChange={handleAmountChange}
                              className="rounded border border-zinc-300 dark:bg-zinc-800 px-2 py-1 text-black dark:text-white w-full"
                              placeholder="0.01"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 flex justify-end space-x-3">
                        <Button
                          onClick={handleClose}
                          className="bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleFund}
                          isLoading={isPending}
                          disabled={isPending}
                          className="bg-brand-blue text-white hover:bg-brand-blue/80"
                        >
                          Send
                        </Button>
                      </div>
                    </>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};

export default MiniAppFund;
