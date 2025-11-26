'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import { TokenSelector } from '../TokenSelector';
import { Button } from '@/components/ui/button';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { useDonationTransfer } from '@/hooks/useDonationTransfer';
import { useCreateDonation } from '@/hooks/donation/useCreateDonation';
import { FiatOnrampModal } from '../FiatOnramp/FiatOnrampModal';
import toast from 'react-hot-toast';
import type { SingleProjectDonateModalProps } from './types';
import { SUPPORTED_TOKENS, type SupportedToken, getAllSupportedChains } from '@/constants/supportedTokens';
import type { DonationPayment } from '@/utilities/donations/donationExecution';
import type { CreateDonationRequest } from '@/hooks/donation/types';
import { useCrossChainBalances } from '@/hooks/donation/useCrossChainBalances';
import { isAddress, type Hex } from 'viem';
import { PaymentMethod, DonationType } from '@/types/donations';
import { useProjectStore } from '@/store';

function resolvePayoutAddress(
  payoutAddress: Hex | string | Record<string, string> | undefined,
  communityContract?: string
): string {
  if (!payoutAddress) return '';

  if (typeof payoutAddress === 'string') {
    return isAddress(payoutAddress) ? payoutAddress : '';
  }

  if (typeof payoutAddress === 'object') {
    if (communityContract && payoutAddress[communityContract]) {
      const addr = payoutAddress[communityContract];
      return typeof addr === 'string' && isAddress(addr) ? addr : '';
    }

    const firstValidAddress = Object.values(payoutAddress).find(
      (addr) => typeof addr === 'string' && isAddress(addr)
    );
    return firstValidAddress || '';
  }

  return '';
}

export const SingleProjectDonateModal = React.memo<
  SingleProjectDonateModalProps
>(({ isOpen, onClose, project }) => {
  const { address } = useAccount();
  const currentChainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { executeDonations, isExecuting } = useDonationTransfer();
  const { mutateAsync: createDonation } = useCreateDonation();
  const fullProject = useProjectStore((state) => state.project);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    PaymentMethod.CRYPTO
  );
  const [selectedToken, setSelectedToken] = useState<SupportedToken | null>(
    null
  );
  const [amount, setAmount] = useState('');
  const [showOnrampModal, setShowOnrampModal] = useState(false);

  const supportedChains = useMemo(() => getAllSupportedChains(), []);
  const { balanceByTokenKey } = useCrossChainBalances(
    currentChainId ?? null,
    supportedChains
  );

  const communityContract = useMemo(() => {
    if (!fullProject?.grants || fullProject.grants.length === 0) return undefined;
    return fullProject.grants[0]?.community?.uid;
  }, [fullProject?.grants]);

  const resolvedPayoutAddress = useMemo(
    () => resolvePayoutAddress(
      project.payoutAddress as Hex | string | Record<string, string>,
      communityContract
    ),
    [project.payoutAddress, communityContract]
  );

  const handlePaymentMethodChange = useCallback((method: PaymentMethod) => {
    setPaymentMethod(method);
  }, []);

  const handleAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setAmount(e.target.value);
    },
    []
  );

  const isValidAmount = useMemo(() => {
    const numAmount = parseFloat(amount);
    return !isNaN(numAmount) && numAmount > 0;
  }, [amount]);

  const canProceed = useMemo(() => {
    if (paymentMethod === PaymentMethod.CRYPTO) {
      return selectedToken && isValidAmount && address;
    }
    return isValidAmount;
  }, [paymentMethod, selectedToken, isValidAmount, address]);

  const handleProceed = useCallback(async () => {
    if (!canProceed) return;

    if (paymentMethod === PaymentMethod.FIAT) {
      setShowOnrampModal(true);
      onClose();
      return;
    }

    if (!selectedToken || !address) return;

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

      const results = await executeDonations(
        [payment],
        () => resolvedPayoutAddress
      );

      const successfulResult = results.find(
        (r) => r.status === 'success' && r.projectId === project.uid
      );

      if (successfulResult) {
        const donationRequest: CreateDonationRequest = {
          uid: `${successfulResult.hash}-${project.uid}`,
          chainID: selectedToken.chainId,
          donorAddress: address,
          projectUID: project.uid,
          payoutAddress: resolvedPayoutAddress,
          amount,
          tokenSymbol: selectedToken.symbol,
          tokenAddress: selectedToken.isNative
            ? undefined
            : selectedToken.address,
          transactionHash: successfulResult.hash,
          donationType: DonationType.CRYPTO,
          metadata: {
            tokenDecimals: selectedToken.decimals,
            tokenName: selectedToken.name,
            chainName: selectedToken.chainName,
          },
        };

        try {
          await createDonation(donationRequest);
        } catch (error) {
          console.error('Failed to persist donation to backend:', error);
        }

        toast.success('Donation completed successfully!');
        onClose();
      } else {
        toast.error('Donation failed. Please try again.');
      }
    } catch (error) {
      console.error('Donation execution failed:', error);
      toast.error(
        error instanceof Error ? error.message : 'Donation failed'
      );
    }
  }, [
    canProceed,
    paymentMethod,
    selectedToken,
    address,
    project,
    amount,
    currentChainId,
    switchChainAsync,
    executeDonations,
    createDonation,
    onClose,
  ]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Donate to {project.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <PaymentMethodSelector
            selected={paymentMethod}
            onSelect={handlePaymentMethodChange}
          />

          {paymentMethod === PaymentMethod.CRYPTO && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Select Token
              </label>
              <TokenSelector
                selectedToken={selectedToken ?? undefined}
                tokenOptions={SUPPORTED_TOKENS}
                balanceByTokenKey={balanceByTokenKey}
                onTokenSelect={setSelectedToken}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">
              Amount {paymentMethod === PaymentMethod.FIAT ? '(USD)' : ''}
            </label>
            <input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={handleAmountChange}
              step="0.01"
              min="0"
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
            />
          </div>

          <div className="pt-4">
            <Button
              onClick={handleProceed}
              disabled={!canProceed || isExecuting}
              className="w-full"
            >
              {isExecuting
                ? 'Processing...'
                : paymentMethod === PaymentMethod.CRYPTO
                ? 'Donate'
                : 'Pay with Card'}
            </Button>
          </div>
        </div>
      </DialogContent>

      {showOnrampModal && (
        <FiatOnrampModal
          isOpen={showOnrampModal}
          onClose={() => setShowOnrampModal(false)}
          project={{
            uid: project.uid,
            title: project.title,
            payoutAddress: resolvedPayoutAddress as Hex,
            chainID: project.chainID || fullProject?.chainID || 42161,
          }}
          fiatAmount={parseFloat(amount)}
        />
      )}
    </Dialog>
  );
});

SingleProjectDonateModal.displayName = 'SingleProjectDonateModal';
