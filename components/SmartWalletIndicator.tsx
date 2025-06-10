"use client";
import { useDynamicWallet } from "@/hooks/useDynamicWallet";
import { CheckCircleIcon, SparklesIcon } from "@heroicons/react/24/solid";
import { cn } from "@/utilities/tailwind";

export const SmartWalletIndicator = ({ className }: { className?: string }) => {
  const { isSmartWallet, supportsGasless, walletAddress } = useDynamicWallet();

  if (!isSmartWallet || !walletAddress) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full",
        "bg-gradient-to-r from-purple-500/10 to-blue-500/10",
        "border border-purple-500/20",
        "text-sm font-medium",
        className
      )}
    >
      <SparklesIcon className="w-4 h-4 text-purple-500" />
      <span className="text-purple-700 dark:text-purple-300">
        Smart Wallet
      </span>
      {supportsGasless && (
        <>
          <span className="text-gray-400 dark:text-gray-500">•</span>
          <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <CheckCircleIcon className="w-3.5 h-3.5" />
            Gasless
          </span>
        </>
      )}
    </div>
  );
};