"use client";

import { HandCoinsIcon } from "lucide-react";
import { useState } from "react";
import { SingleProjectDonateModal } from "@/components/Donation/SingleProject/SingleProjectDonateModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hasConfiguredPayoutAddresses } from "@/src/features/chain-payout-address/hooks/use-chain-payout-address";
import type { Project } from "@/types/v2/project";
import { cn } from "@/utilities/tailwind";

interface DonateSectionProps {
  project: Project;
  className?: string;
}

/**
 * DonateSection provides an inline donation form with amount input.
 * Opens SingleProjectDonateModal for the actual donation flow.
 * Matches Figma design with Lucide icons and neutral color palette.
 */
export function DonateSection({ project, className }: DonateSectionProps) {
  const [isDonateModalOpen, setIsDonateModalOpen] = useState(false);
  const [amount, setAmount] = useState("");

  // Create project data for donation modal
  const donationProject = {
    uid: project.uid,
    title: project.details?.title || "Project",
    chainPayoutAddress: project.chainPayoutAddress,
    imageURL: project.details?.logoUrl,
    chainID: project.chainID,
  };

  // Don't render if no payout addresses configured
  const hasPayoutAddresses = hasConfiguredPayoutAddresses(project.chainPayoutAddress);

  const handleDonateClick = () => {
    setIsDonateModalOpen(true);
  };

  return (
    <>
      <div className={cn("flex flex-col gap-4", className)} data-testid="donate-section">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <div className="flex flex-row items-center gap-2">
            <HandCoinsIcon className="h-6 w-6 text-neutral-700 dark:text-neutral-300" />
            <span className="text-xl font-semibold text-neutral-900 dark:text-white tracking-tight">
              Donate
            </span>
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Support the project with a donation
          </p>
        </div>

        {/* Amount Input + Button */}
        <div className="flex flex-row gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400">
              $
            </span>
            <Input
              type="number"
              placeholder="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="0.01"
              className="pl-7 bg-white dark:bg-zinc-900 border-neutral-200 dark:border-zinc-700 rounded-lg shadow-sm"
              data-testid="donate-amount-input"
            />
          </div>
          <Button
            onClick={handleDonateClick}
            disabled={!hasPayoutAddresses}
            className="bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 rounded-lg px-4"
            data-testid="donate-button"
          >
            Donate
          </Button>
        </div>

        {!hasPayoutAddresses && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Donations not available - project hasn't set up payout addresses yet.
          </p>
        )}
      </div>

      {/* Donation Modal */}
      <SingleProjectDonateModal
        isOpen={isDonateModalOpen}
        onClose={() => setIsDonateModalOpen(false)}
        project={donationProject}
        initialAmount={amount}
      />
    </>
  );
}
