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

const CoinIcon = ({ className }: { className: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className={className}
    >
      <path
        d="M11.5 5.6V5.25C11.5 3.68 9.14 2.5 6 2.5C2.86 2.5 0.5 3.68 0.5 5.25V7.75C0.5 9.06 2.14 10.09 4.5 10.4V10.75C4.5 12.32 6.86 13.5 10 13.5C13.14 13.5 15.5 12.32 15.5 10.75V8.25C15.5 6.96 13.91 5.92 11.5 5.6ZM14.5 8.25C14.5 9.08 12.58 10 10 10C9.77 10 9.54 9.99 9.31 9.98C10.66 9.49 11.5 8.69 11.5 7.75V6.61C13.37 6.89 14.5 7.64 14.5 8.25ZM4.5 9.39V7.9C5 7.97 5.5 8 6 8C6.5 8 7 7.97 7.5 7.9V9.39C7 9.46 6.5 9.5 6 9.5C5.5 9.5 5 9.46 4.5 9.39ZM10.5 6.87V7.75C10.5 8.27 9.72 8.84 8.5 9.18V7.72C9.31 7.52 9.99 7.23 10.5 6.87ZM6 3.5C8.58 3.5 10.5 4.42 10.5 5.25C10.5 6.08 8.58 7 6 7C3.42 7 1.5 6.08 1.5 5.25C1.5 4.42 3.42 3.5 6 3.5ZM1.5 7.75V6.87C2.01 7.23 2.69 7.52 3.5 7.72V9.18C2.28 8.84 1.5 8.27 1.5 7.75ZM5.5 10.75V10.49C5.66 10.5 5.83 10.5 6 10.5C6.24 10.5 6.48 10.49 6.71 10.48C6.97 10.57 7.23 10.65 7.5 10.71V12.18C6.28 11.84 5.5 11.27 5.5 10.75ZM8.5 12.39V10.9C9 10.97 9.5 11 10 11C10.5 11 11 10.97 11.5 10.9V12.39C10.51 12.54 9.49 12.54 8.5 12.39ZM12.5 12.18V10.72C13.31 10.52 13.99 10.23 14.5 9.87V10.75C14.5 11.27 13.72 11.84 12.5 12.18Z"
        fill="currentColor"
      />
    </svg>
  );
};

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
    <div className="rounded-2xl border border-neutral-300 bg-white/90 p-6 shadow-sm backdrop-blur-sm dark:border-gray-800/60 dark:bg-gray-900/90">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex p-1 h-8 w-8 items-center justify-center rounded-lg bg-[#EFF4FF] dark:bg-zinc-800 text-brand-blue">
          <CoinIcon className="w-4 h-4" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Donation Summary</h3>
      </div>
      {totalsByToken.length === 0 ? (
        <div className="text-center py-12 px-3 flex flex-col items-center justify-center gap-4 rounded-xl bg-gray-100 dark:bg-gray-800">
          <CoinIcon className="w-8 h-8 text-gray-400" />
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
