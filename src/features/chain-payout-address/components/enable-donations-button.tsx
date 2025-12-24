"use client";

import { CurrencyDollarIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { Button } from "@/components/Utilities/Button";
import { hasConfiguredPayoutAddresses } from "../hooks/use-chain-payout-address";
import type { EnableDonationsButtonProps } from "../types/chain-payout-address";
import { SetChainPayoutAddressModal } from "./set-chain-payout-address-modal";

/**
 * Button that appears in the project navigator when no payout addresses are configured.
 * Clicking opens the SetChainPayoutAddressModal.
 */
export function EnableDonationsButton({
  projectId,
  currentAddresses,
  onSuccess,
}: EnableDonationsButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Don't show button if addresses are already configured
  if (hasConfiguredPayoutAddresses(currentAddresses)) {
    return null;
  }

  return (
    <>
      <Button
        type="button"
        className="w-max bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        onClick={() => setIsModalOpen(true)}
        data-testid="enable-donations-button"
      >
        <CurrencyDollarIcon className="h-5 w-5" />
        Enable Donations
      </Button>

      <SetChainPayoutAddressModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        projectId={projectId}
        currentAddresses={currentAddresses}
        onSuccess={onSuccess}
      />
    </>
  );
}

EnableDonationsButton.displayName = "EnableDonationsButton";
