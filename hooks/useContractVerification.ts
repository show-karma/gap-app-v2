import { useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { INDEXER } from "@/utilities/indexer";
import fetchData from "@/utilities/fetchData";
import { useDeployerLookup, type DeployerInfo } from "./useDeployerLookup";

export interface VerificationMessage {
  message: string;
  nonce: string;
  expiresAt: string;
  deployerAddress: string; // Full unmasked address for comparison
}

export interface VerificationResult {
  verified: boolean;
  contract: {
    network: string;
    address: string;
    verifiedAt: string;
    verifiedBy: string;
  };
}

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
  const { lookupDeployer } = useDeployerLookup();

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

      const deployerInfo = await lookupDeployer(network, contractAddress);

      if (!deployerInfo) {
        throw new Error(
          `Could not find deployer for contract ${contractAddress} on ${network}. ` +
          "Please ensure the contract address is correct and the network is supported."
        );
      }

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

      const messageUrl = INDEXER.PROJECT.CONTRACTS.VERIFY_MESSAGE();
      const [messageResponse, messageError] = await fetchData(messageUrl, "POST", {
        network,
        contractAddress,
        userAddress,
      });

      if (messageError || !messageResponse) {
        throw new Error(
          messageError ||
            "Failed to generate verification message"
        );
      }

      const verificationMessage: VerificationMessage = {
        message: messageResponse.message,
        nonce: messageResponse.nonce,
        expiresAt: messageResponse.expiresAt,
        deployerAddress: messageResponse.deployerAddress, // Full address for comparison
      };

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
      } catch (signError: any) {
        // Handle user rejection specifically
        if (signError.name === "UserRejectedRequestError" || signError.code === 4001) {
          throw new Error("Signature request was cancelled. Please try again when ready.");
        }
        throw new Error("Failed to sign message: " + (signError.message || "Unknown error"));
      }

      // Step 5: Verify signature on backend
      setState((prev) => ({
        ...prev,
        step: VerificationStep.VERIFYING_SIGNATURE,
      }));

      const verifyUrl = INDEXER.PROJECT.CONTRACTS.VERIFY_SIGNATURE();
      const [verifyResponse, verifyError] = await fetchData(verifyUrl, "POST", {
        network,
        contractAddress,
        signature,
        nonce: verificationMessage.nonce,
        projectUid,
      });

      if (verifyError || !verifyResponse || !verifyResponse.verified) {
        // Check for specific error types
        const errorMsg = verifyError || "Signature verification failed";

        if (errorMsg.includes("expired") || errorMsg.includes("Invalid or expired nonce")) {
          throw new Error(
            "Verification request expired. Please start the verification process again."
          );
        }

        if (errorMsg.includes("Nonce mismatch")) {
          throw new Error(
            "Verification mismatch error. Please start the verification process again."
          );
        }

        if (errorMsg.includes("Signature verification failed")) {
          throw new Error(
            "Could not verify signature. Please ensure you're using the deployer wallet and try again."
          );
        }

        throw new Error(errorMsg);
      }

      const result: VerificationResult = {
        verified: verifyResponse.verified,
        contract: verifyResponse.contract,
      };

      setState((prev) => ({
        ...prev,
        step: VerificationStep.SUCCESS,
        result,
      }));

      return result;
    } catch (error: any) {
      const errorMessage =
        error?.message || "An error occurred during verification";

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
