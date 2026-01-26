"use client";

import { BadgeCheckIcon } from "lucide-react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { useEndorsementStore } from "@/store/modals/endorsement";
import type { Project } from "@/types/v2/project";
import { cn } from "@/utilities/tailwind";

interface EndorseSectionProps {
  project: Project;
  className?: string;
}

/**
 * EndorseSection provides an inline endorsement button.
 * Opens EndorsementDialog modal for the actual endorsement flow.
 * Matches Figma design with Lucide icons and neutral color palette.
 *
 * Requires wallet connection to enable endorsement.
 */
export function EndorseSection({ project: _project, className }: EndorseSectionProps) {
  const { setIsEndorsementOpen } = useEndorsementStore();
  const { isConnected } = useAccount();

  const handleOpenEndorsementDialog = () => {
    setIsEndorsementOpen(true);
  };

  return (
    <section
      className={cn("flex flex-col gap-4", className)}
      data-testid="endorse-section"
      aria-labelledby="endorse-heading"
    >
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex flex-row items-center gap-2">
          <BadgeCheckIcon
            className="h-6 w-6 text-neutral-700 dark:text-neutral-300"
            aria-hidden="true"
          />
          <h3
            id="endorse-heading"
            className="text-xl font-semibold text-neutral-900 dark:text-white tracking-tight"
          >
            Endorse
          </h3>
        </div>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Vouch for this project</p>
      </div>

      {/* Endorse Button - Opens EndorsementDialog for full endorsement flow */}
      <Button
        onClick={handleOpenEndorsementDialog}
        disabled={!isConnected}
        title={!isConnected ? "Connect wallet to endorse" : undefined}
        className="w-full bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 rounded-lg px-3 disabled:opacity-50 disabled:cursor-not-allowed"
        data-testid="endorse-button"
        aria-describedby="endorse-description"
      >
        {isConnected ? "Endorse this project" : "Connect Wallet to Endorse"}
      </Button>
      <span id="endorse-description" className="sr-only">
        Endorsing this project creates an on-chain attestation vouching for its legitimacy
      </span>
    </section>
  );
}
