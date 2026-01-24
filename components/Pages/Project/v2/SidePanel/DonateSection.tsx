"use client";

import { DollarSign, HandCoinsIcon } from "lucide-react";
import { useState } from "react";
import { SingleProjectDonateModal } from "@/components/Donation/SingleProject/SingleProjectDonateModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStaff } from "@/hooks/useStaff";
import {
  hasConfiguredPayoutAddresses,
  SetChainPayoutAddressModal,
} from "@/src/features/chain-payout-address";
import { useOwnerStore, useProjectStore } from "@/store";
import { useCommunityAdminStore } from "@/store/communityAdmin";
import type { Project } from "@/types/v2/project";
import { cn } from "@/utilities/tailwind";

interface DonateSectionProps {
  project: Project;
  className?: string;
}

/**
 * DonateSection provides an inline donation form with amount input.
 * Opens SingleProjectDonateModal for the actual donation flow.
 *
 * For authorized users (project owner/admin/staff/contract owner):
 * - If no payout addresses configured: shows CTA to enable donations
 * - If payout addresses configured: shows regular donation form
 *
 * For regular users:
 * - If no payout addresses: shows "donations not available" message
 * - If payout addresses configured: shows regular donation form
 */
export function DonateSection({ project, className }: DonateSectionProps) {
  const [isDonateModalOpen, setIsDonateModalOpen] = useState(false);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [amount, setAmount] = useState("");

  // Authorization checks
  const isOwner = useOwnerStore((state) => state.isOwner);
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const refreshProject = useProjectStore((state) => state.refreshProject);
  const isCommunityAdmin = useCommunityAdminStore((state) => state.isCommunityAdmin);
  const { isStaff, isLoading: isStaffLoading } = useStaff();

  // Can set payout address: project member/owner/admin/staff
  const canSetPayoutAddress =
    isProjectOwner || isOwner || isProjectAdmin || isCommunityAdmin || (!isStaffLoading && isStaff);

  // Create project data for donation modal
  const donationProject = {
    uid: project.uid,
    title: project.details?.title || "Project",
    chainPayoutAddress: project.chainPayoutAddress,
    imageURL: project.details?.logoUrl,
    chainID: project.chainID,
  };

  const hasPayoutAddresses = hasConfiguredPayoutAddresses(project.chainPayoutAddress);

  const handleDonateClick = () => {
    setIsDonateModalOpen(true);
  };

  const handleEnableDonationsClick = () => {
    setIsPayoutModalOpen(true);
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

        {/* Show different content based on payout address status and authorization */}
        {hasPayoutAddresses ? (
          /* Regular donation form when payout addresses are configured */
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
              className="bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 rounded-lg px-4"
              data-testid="donate-button"
            >
              Donate
            </Button>
          </div>
        ) : canSetPayoutAddress ? (
          /* Enable donations CTA for authorized users */
          <div className="flex flex-col gap-3">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Set up a payout address to start receiving donations from supporters.
            </p>
            <Button
              onClick={handleEnableDonationsClick}
              className="w-full bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center justify-center gap-2"
              data-testid="enable-donations-button"
            >
              <DollarSign className="h-4 w-4" />
              Enable Donations
            </Button>
          </div>
        ) : (
          /* Message for non-authorized users when no payout addresses */
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

      {/* Set Payout Address Modal */}
      <SetChainPayoutAddressModal
        isOpen={isPayoutModalOpen}
        onClose={() => setIsPayoutModalOpen(false)}
        projectId={project.uid}
        currentAddresses={project.chainPayoutAddress}
        onSuccess={() => refreshProject()}
      />
    </>
  );
}
