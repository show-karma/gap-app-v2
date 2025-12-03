import { useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import {
  contractsService,
  type DeployerInfo,
  type VerificationMessage,
  type VerificationResult,
} from "@/services/contracts.service";

export type { VerificationMessage, VerificationResult, DeployerInfo };

export enum VerificationStep {
  IDLE = "idle",
  LOOKING_UP_DEPLOYER = "looking_up_deployer",
  CHECKING_WALLET = "checking_wallet",
  GENERATING_MESSAGE = "generating_message",
  WAITING_FOR_SIGNATURE = "waiting_for_signature",
  VERIFYING_SIGNATURE = "verifying_signature",
  SUCCESS = "success",
  ERROR = "error",
}

export interface VerificationState {
  step: VerificationStep;
  deployerInfo: DeployerInfo | null;
  verificationMessage: VerificationMessage | null;
  result: VerificationResult | null;
  error: string | null;
  needsWalletSwitch: boolean;
}

/**
 * Hook to orchestrate the full contract verification flow
 * Steps:
 * 1. Lookup deployer address
 * 2. Check if user's wallet matches deployer
 * 3. Request verification message
 * 4. Prompt user to sign via wagmi
 * 5. Submit signature for verification
 */
export const useContractVerification = () => {
  const { address: userAddress } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [state, setState] = useState<VerificationState>({
    step: VerificationStep.IDLE,
    deployerInfo: null,
    verificationMessage: null,
    result: null,
    error: null,
    needsWalletSwitch: false,
  });

  const reset = () => {
    setState({
      step: VerificationStep.IDLE,
      deployerInfo: null,
      verificationMessage: null,
      result: null,
      error: null,
      needsWalletSwitch: false,
    });
  };

  const verifyContract = async (
    network: string,
    contractAddress: string,
    projectUid: string
  ): Promise<VerificationResult | null> => {
    try {
      // Step 1: Lookup deployer
      setState((prev) => ({
        ...prev,
        step: VerificationStep.LOOKING_UP_DEPLOYER,
        error: null,
      }));

      const deployerInfo = await contractsService.lookupDeployer(network, contractAddress);

      setState((prev) => ({
        ...prev,
        deployerInfo,
      }));

      // Step 2: Generate verification message (includes full deployer address)
      setState((prev) => ({
        ...prev,
        step: VerificationStep.GENERATING_MESSAGE,
      }));

      if (!userAddress) {
        throw new Error("Please connect your wallet");
      }

      const verificationMessage = await contractsService.requestVerificationMessage(
        network,
        contractAddress,
        userAddress
      );

      setState((prev) => ({
        ...prev,
        verificationMessage,
      }));

      // Step 3: Check if wallet matches deployer (using full address from message)
      setState((prev) => ({
        ...prev,
        step: VerificationStep.CHECKING_WALLET,
      }));

      const needsSwitch =
        userAddress.toLowerCase() !== verificationMessage.deployerAddress.toLowerCase();

      if (needsSwitch) {
        setState((prev) => ({
          ...prev,
          needsWalletSwitch: true,
          error: `Please switch to the deployer wallet: ${verificationMessage.deployerAddress}`,
        }));
        return null;
      }

      setState((prev) => ({
        ...prev,
        needsWalletSwitch: false,
      }));

      // Step 4: Request signature from user
      setState((prev) => ({
        ...prev,
        step: VerificationStep.WAITING_FOR_SIGNATURE,
      }));

      let signature: string;
      try {
        signature = await signMessageAsync({
          message: verificationMessage.message,
        });
      } catch (signError: unknown) {
        // Handle user rejection specifically
        const error = signError as { name?: string; code?: number; message?: string };
        if (error.name === "UserRejectedRequestError" || error.code === 4001) {
          throw new Error("Signature request was cancelled. Please try again when ready.");
        }
        throw new Error("Failed to sign message: " + (error.message || "Unknown error"));
      }

      // Step 5: Verify signature on backend
      setState((prev) => ({
        ...prev,
        step: VerificationStep.VERIFYING_SIGNATURE,
      }));

      const result = await contractsService.verifyContractSignature({
        network,
        contractAddress,
        signature,
        nonce: verificationMessage.nonce,
        projectUid,
      });

      setState((prev) => ({
        ...prev,
        step: VerificationStep.SUCCESS,
        result,
      }));

      return result;
    } catch (error: unknown) {
      const err = error as { message?: string };
      const errorMessage = err.message || "An error occurred during verification";

      setState((prev) => ({
        ...prev,
        step: VerificationStep.ERROR,
        error: errorMessage,
      }));

      return null;
    }
  };

  return {
    ...state,
    verifyContract,
    reset,
  };
};
