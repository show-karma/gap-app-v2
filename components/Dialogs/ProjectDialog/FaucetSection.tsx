"use client";

import { FC, useEffect, useState } from "react";
import { useFaucetEligibility, useFaucetClaim } from "@/hooks/useFaucet";
import { Button } from "@/components/Utilities/Button";
import { Spinner } from "@/components/Utilities/Spinner";
import { type Hex } from "viem";
import { ExclamationTriangleIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { cn } from "@/utilities/tailwind";
import type { FaucetTransaction } from "@/utilities/faucet/faucetService";
import { buildProjectAttestationTransaction } from "@/utilities/gap/buildAttestationTransaction";
import { getGapClient } from "@/hooks/useGap";
import { useAccount } from "wagmi";
import { useWallet } from "@/hooks/useWallet";
import toast from "react-hot-toast";

interface FaucetSectionProps {
  chainId?: number;
  projectFormData?: any;
  walletSigner?: any;
  recipient?: string;
  onFundsReceived?: () => void;
  disabled?: boolean;
}

export const FaucetSection: FC<FaucetSectionProps> = ({
  chainId,
  projectFormData,
  walletSigner,
  recipient,
  onFundsReceived,
  disabled
}) => {
  const [showFaucet, setShowFaucet] = useState(false);
  const [transaction, setTransaction] = useState<FaucetTransaction | undefined>();
  const [isBuilding, setIsBuilding] = useState(false);
  const { chain } = useAccount();
  const { switchChainAsync } = useWallet();
  const [isSwitchingChain, setIsSwitchingChain] = useState(false);

  
  // Build the real attestation transaction for accurate gas estimation
  useEffect(() => {
    const buildTransaction = async () => {
      if (projectFormData && chainId && walletSigner && recipient) {
        setIsBuilding(true);
        try {
          const gapClient = getGapClient(chainId);
          const tx = await buildProjectAttestationTransaction(
            projectFormData,
            walletSigner,
            gapClient,
            recipient as Hex
          );
          setTransaction(tx);
        } catch (error) {
          console.error("Failed to build attestation transaction:", error);
          // Set a fallback transaction if building fails
          setTransaction(undefined);
        } finally {
          setIsBuilding(false);
        }
      }
    };
    
    buildTransaction();
  }, [projectFormData, chainId, walletSigner, recipient]);

  const {
    data: eligibility,
    isLoading: isCheckingEligibility,
  } = useFaucetEligibility(chainId, transaction);

  const {
    claimFaucet,
    isClaimingFaucet,
    claimError,
    transactionHash,
    resetFaucetState
  } = useFaucetClaim();

  // Show faucet section only if eligible
  useEffect(() => {
    if (eligibility) {
      setShowFaucet(eligibility.eligible);
    }
  }, [eligibility]);

  const handleClaimFunds = async () => {
    if (!chainId || !transaction) return;

    try {
      // Check if we need to switch chains first
      if (chain?.id !== chainId) {
        setIsSwitchingChain(true);
        try {
          await switchChainAsync({ chainId });
          // Wait a moment for the chain switch to complete
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (switchError) {
          console.error("Failed to switch chain:", switchError);
          toast.error("Please switch to the correct network to claim funds");
          return;
        } finally {
          setIsSwitchingChain(false);
        }
      }

      const result = await claimFaucet(chainId, transaction);
      if (result && onFundsReceived) {
        onFundsReceived();
      }
    } catch (error) {
      console.error("Failed to claim funds:", error);
    }
  };

// Show loader while checking eligibility or building transaction
  if (isCheckingEligibility || isBuilding) {
    return (
      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg border border-gray-200 dark:border-gray-800">
        <div className="flex items-center space-x-3">
          <Spinner className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Checking eligibility for funds...
          </p>
        </div>
      </div>
    );
  }

  if (!showFaucet && !eligibility?.reason) {
    return null;
  }

  // Show rate limit message
  // if (eligibility?.reason === "Claim rate limit exceeded" && eligibility.waitTimeSeconds) {
  //   return (
  //     <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
  //       <div className="flex items-start space-x-3">
  //         <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
  //         <div className="flex-1">
  //           <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
  //             Rate Limited
  //           </p>
  //           <p className="text-sm text-yellow-600 dark:text-yellow-300 mt-1">
  //             You can request funds again in {formatWaitTime(eligibility.waitTimeSeconds)}
  //           </p>
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }

  // Show success state
  if (transactionHash) {
    return (
      <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
        <div className="flex items-start space-x-3">
          <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-green-800 dark:text-green-200 font-medium">
              Funds Received!
            </p>
            <p className="text-sm text-green-600 dark:text-green-300 mt-1">
              Your wallet has been funded. You can now create your project.
            </p>
            {transactionHash && (
              <ExternalLink
                href={`https://etherscan.io/tx/${transactionHash}`}
                className="text-sm text-green-600 dark:text-green-400 hover:underline mt-2 inline-block"
              >
                View transaction
              </ExternalLink>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (claimError) {
    return (
      <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <div className="flex items-start space-x-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-800 dark:text-red-200 font-medium">
              Failed to Get Funds
            </p>
            <p className="text-sm text-red-600 dark:text-red-300 mt-1">
              {claimError}
            </p>
            <Button
              onClick={resetFaucetState}
              className="mt-2 text-xs"
              variant="secondary"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show faucet claim button
  if (showFaucet && eligibility?.eligible) {
    return (
      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <div className="flex-1">
              <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                Get Funds for Project Creation
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                You need funds to create your project on-chain. Click below to receive free funds.
                {chain?.id !== chainId && (
                  <span className="block mt-1 text-xs text-blue-500 dark:text-blue-400">
                    Will switch to the selected network automatically.
                  </span>
                )}
              </p>
            
            </div>
          </div>
          
          <Button
            onClick={handleClaimFunds}
            disabled={disabled || isClaimingFaucet || isSwitchingChain}
            className={cn(
              "w-full",
              (isClaimingFaucet || isSwitchingChain) && "opacity-50 cursor-not-allowed"
            )}
          >
            {isSwitchingChain ? (
              <div className="flex items-center justify-center space-x-2">
                <Spinner className="w-4 h-4" />
                <span>Switching Network...</span>
              </div>
            ) : isClaimingFaucet ? (
              <div className="flex items-center justify-center space-x-2">
                <Spinner className="w-4 h-4" />
                <span>Getting Funds...</span>
              </div>
            ) : (
              "Get Funds"
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Show reason why not eligible (other than rate limit)
  // if (eligibility?.reason && eligibility.reason !== "Claim rate limit exceeded") {
  //   return (
  //     <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg border border-gray-200 dark:border-gray-800">
  //       <div className="flex items-start space-x-3">
  //         <ExclamationTriangleIcon className="w-5 h-5 text-gray-600 dark:text-gray-400 mt-0.5" />
  //         <div className="flex-1">
  //           <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">
  //             Faucet Not Available
  //           </p>
  //           <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
  //             {eligibility.reason}
  //           </p>
  //           {eligibility.currentBalance && (
  //             <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
  //               Your balance: {formatEther(BigInt(eligibility.currentBalance))} ETH
  //             </p>
  //           )}
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }

  return null;
};