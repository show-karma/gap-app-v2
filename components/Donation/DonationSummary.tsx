"use client";
import { useMemo } from "react";
import { SUPPORTED_NETWORKS, type SupportedToken } from "@/constants/supportedTokens";

interface DonationPayment {
  projectId: string;
  amount: string;
  token: SupportedToken;
  chainId: number;
}

interface DonationSummaryProps {
  payments: DonationPayment[];
}

export function DonationSummary({ payments }: DonationSummaryProps) {
  const totalsByToken = useMemo(() => {
    const totals = payments.reduce(
      (acc, payment) => {
        const key = `${payment.token.symbol}-${payment.token.chainId}`;
        const amount = parseFloat(payment.amount || "0");
        if (!acc[key]) {
          acc[key] = { token: payment.token, total: 0 };
        }
        acc[key].total += amount;
        return acc;
      },
      {} as Record<string, { token: SupportedToken; total: number }>
    );

    return Object.values(totals).sort((a, b) => a.token.chainId - b.token.chainId);
  }, [payments]);

  return (
    <div className="rounded-2xl border border-gray-200/60 bg-white/90 p-6 shadow-sm backdrop-blur-sm dark:border-gray-800/60 dark:bg-gray-900/90">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2Z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Donation Summary
        </h3>
      </div>
      {totalsByToken.length === 0 ? (
        <div className="text-center py-8">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-gray-400"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M8 12h8" />
            </svg>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Select tokens and amounts to see your donation totals by network.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {totalsByToken.map(({ token, total }) => (
            <div
              key={`${token.symbol}-${token.chainId}`}
              className="group rounded-xl bg-gradient-to-r from-gray-50 to-blue-50/50 p-4 transition hover:from-blue-50 hover:to-indigo-50 dark:from-gray-800/50 dark:to-blue-950/30 dark:hover:from-blue-950/40 dark:hover:to-indigo-950/40"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-gray-200/50 dark:bg-gray-700 dark:ring-gray-600/50">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                      {token.symbol.slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {token.symbol}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {SUPPORTED_NETWORKS[token.chainId]?.chainName || token.chainName}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {total.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 6,
                    })}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
