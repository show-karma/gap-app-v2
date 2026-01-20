"use client";

import { HeartIcon } from "@heroicons/react/24/solid";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Project } from "@/types/v2/project";
import { cn } from "@/utilities/tailwind";

interface DonateSectionProps {
  project: Project;
  onDonate?: (amount: string) => void;
  className?: string;
}

/**
 * DonateSection provides an inline donation form with amount input.
 * For a full donation flow, this should integrate with the donation system.
 */
export function DonateSection({ project: _project, onDonate, className }: DonateSectionProps) {
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleDonate = async () => {
    if (!amount || parseFloat(amount) <= 0) return;

    setIsLoading(true);
    try {
      onDonate?.(amount);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-4 p-4 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800",
        className
      )}
      data-testid="donate-section"
    >
      {/* Header */}
      <div className="flex flex-row items-center gap-2">
        <HeartIcon className="h-5 w-5 text-red-500" />
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          Support this project
        </span>
      </div>

      {/* Amount Input */}
      <div className="flex flex-col gap-2">
        <Input
          type="number"
          placeholder="Enter amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min="0"
          step="0.01"
          className="w-full"
          data-testid="donate-amount-input"
        />
      </div>

      {/* Donate Button */}
      <Button
        onClick={handleDonate}
        disabled={!amount || parseFloat(amount) <= 0 || isLoading}
        isLoading={isLoading}
        className="w-full bg-red-500 hover:bg-red-600 text-white"
        data-testid="donate-button"
      >
        Donate
      </Button>
    </div>
  );
}
