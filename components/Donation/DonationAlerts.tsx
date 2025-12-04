"use client";

import { useAuth } from "@/hooks/useAuth";
import { Button } from "../Utilities/Button";

interface DonationAlertsProps {
  isConnected: boolean;
  address?: string;
  isCurrentNetworkSupported: boolean;
}

export function DonationAlerts({
  isConnected,
  address,
  isCurrentNetworkSupported,
}: DonationAlertsProps) {
  const { login } = useAuth();
  return (
    <>
      {/* Wallet Connection Alert */}
      {(!isConnected || !address) && (
        <div className="rounded-2xl border border-orange-200/60 bg-gradient-to-r from-orange-50 to-amber-50 p-6 shadow-sm dark:border-orange-800/40 dark:from-orange-950/30 dark:to-amber-950/30">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 min-h-10 min-w-10 items-center justify-center rounded-full bg-orange-500 text-white shadow-sm">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-orange-900 dark:text-orange-100">Connect Wallet</h3>
              <p className="mt-1 text-sm text-orange-700 dark:text-orange-200">
                Connect your wallet to view token balances and submit donations.
              </p>
              <Button onClick={login} className="mt-2">
                Connect Wallet
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Network Support Alert */}
      {!isCurrentNetworkSupported && isConnected && (
        <div className="rounded-2xl border border-yellow-200/60 bg-gradient-to-r from-yellow-50 to-amber-50 p-6 shadow-sm dark:border-yellow-800/40 dark:from-yellow-950/30 dark:to-amber-950/30">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500 text-white shadow-sm">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">
                Network Unsupported
              </h3>
              <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-200">
                Switch to a supported network before submitting donations.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
