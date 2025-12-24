import { useCallback, useMemo, useState } from "react";
import toast from "react-hot-toast";
import type { Hex } from "viem";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import type { SingleProjectDonateModalProps } from "@/components/Donation/SingleProject/types";
import { getAllSupportedChains, type SupportedToken } from "@/constants/supportedTokens";
import type { CreateDonationRequest } from "@/hooks/donation/types";
import { useCreateDonation } from "@/hooks/donation/useCreateDonation";
import { useCrossChainBalances } from "@/hooks/donation/useCrossChainBalances";
import { useDonationTransfer } from "@/hooks/useDonationTransfer";
import { useProjectGrants } from "@/hooks/v2/useProjectGrants";
import { useProjectStore } from "@/store";
import { DonationType, PaymentMethod } from "@/types/donations";
import { resolvePayoutAddress } from "@/utilities/address";
import type { DonationPayment } from "@/utilities/donations/donationExecution";

export const useSingleProjectDonation = (
  project: SingleProjectDonateModalProps["project"],
  onClose: () => void
) => {
  const { address } = useAccount();
  const currentChainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { executeDonations, isExecuting } = useDonationTransfer();
  const { mutateAsync: createDonation } = useCreateDonation();
  const fullProject = useProjectStore((state) => state.project);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CRYPTO);
  const [selectedToken, setSelectedToken] = useState<SupportedToken | null>(null);
  const [amount, setAmount] = useState("");

  const supportedChains = useMemo(() => getAllSupportedChains(), []);
  const { balanceByTokenKey } = useCrossChainBalances(currentChainId ?? null, supportedChains);

  const { grants } = useProjectGrants(fullProject?.uid || "");

  const communityContract = useMemo(() => {
    if (!grants || grants.length === 0) return undefined;
    return grants[0]?.community?.uid;
  }, [grants]);

  const resolvedPayoutAddress = useMemo(
    () =>
      resolvePayoutAddress(
        project.payoutAddress as Hex | string | Record<string, string>,
        communityContract
      ),
    [project.payoutAddress, communityContract]
  );

  const handlePaymentMethodChange = useCallback((method: PaymentMethod) => {
    setPaymentMethod(method);
  }, []);

  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers and a single decimal point
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  }, []);

  const isValidAmount = useMemo(() => {
    const numAmount = parseFloat(amount);
    return !Number.isNaN(numAmount) && numAmount > 0;
  }, [amount]);

  const canProceed = useMemo(() => {
    // Only crypto is supported now
    return selectedToken && isValidAmount && address && resolvedPayoutAddress.length > 0;
  }, [selectedToken, isValidAmount, address, resolvedPayoutAddress]);

  const saveDonation = useCallback(
    async (result: { hash: string }, payment: DonationPayment) => {
      const donationRequest: CreateDonationRequest = {
        uid: `${result.hash}-${payment.projectId}`,
        chainID: payment.chainId,
        donorAddress: address as Hex,
        projectUID: payment.projectId,
        payoutAddress: resolvedPayoutAddress,
        amount: payment.amount,
        tokenSymbol: payment.token.symbol,
        tokenAddress: payment.token.isNative ? undefined : payment.token.address,
        transactionHash: result.hash,
        donationType: DonationType.CRYPTO,
        metadata: {
          tokenDecimals: payment.token.decimals,
          tokenName: payment.token.name,
          chainName: payment.token.chainName,
        },
      };

      try {
        await createDonation(donationRequest);
      } catch (error) {
        console.error("Failed to persist donation to backend:", error);
      }
    },
    [address, resolvedPayoutAddress, createDonation]
  );

  const processCrypto = useCallback(async () => {
    if (!selectedToken || !address || !resolvedPayoutAddress) return;

    const payment: DonationPayment = {
      projectId: project.uid,
      amount,
      token: selectedToken,
      chainId: selectedToken.chainId,
    };

    try {
      if (currentChainId !== selectedToken.chainId) {
        await switchChainAsync({ chainId: selectedToken.chainId });
      }

      const results = await executeDonations([payment], () => resolvedPayoutAddress);

      const successfulResult = results.find(
        (r) => r.status === "success" && r.projectId === project.uid
      );

      if (successfulResult) {
        await saveDonation(successfulResult, payment);
        toast.success("Donation completed successfully!");
        onClose();
      } else {
        toast.error("Donation failed. Please try again.");
      }
    } catch (error) {
      console.error("Donation execution failed:", error);
      toast.error(error instanceof Error ? error.message : "Donation failed");
    }
  }, [
    selectedToken,
    address,
    project.uid,
    amount,
    currentChainId,
    switchChainAsync,
    executeDonations,
    resolvedPayoutAddress,
    saveDonation,
    onClose,
  ]);

  const handleProceed = useCallback(() => {
    if (!canProceed) return;
    processCrypto();
  }, [canProceed, processCrypto]);

  return {
    paymentMethod,
    selectedToken,
    amount,
    balanceByTokenKey,
    isExecuting,
    canProceed,
    handlePaymentMethodChange,
    handleAmountChange,
    handleProceed,
    setSelectedToken,
  };
};
