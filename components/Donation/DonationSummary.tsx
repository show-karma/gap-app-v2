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
  return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
    <path d="M11.5 5.59812V5.25C11.5 3.6825 9.13562 2.5 6 2.5C2.86438 2.5 0.5 3.6825 0.5 5.25V7.75C0.5 9.05562 2.14062 10.0931 4.5 10.4038V10.75C4.5 12.3175 6.86438 13.5 10 13.5C13.1356 13.5 15.5 12.3175 15.5 10.75V8.25C15.5 6.95625 13.9113 5.9175 11.5 5.59812ZM14.5 8.25C14.5 9.07625 12.5756 10 10 10C9.76688 10 9.53562 9.99188 9.3075 9.97688C10.6556 9.48563 11.5 8.6875 11.5 7.75V6.60875C13.3669 6.88687 14.5 7.64188 14.5 8.25ZM4.5 9.39062V7.90375C4.99736 7.96856 5.49843 8.00071 6 8C6.50157 8.00071 7.00264 7.96856 7.5 7.90375V9.39062C7.00338 9.46399 6.50201 9.50055 6 9.5C5.49799 9.50055 4.99662 9.46399 4.5 9.39062ZM10.5 6.87063V7.75C10.5 8.27437 9.72437 8.8375 8.5 9.17937V7.71875C9.30688 7.52313 9.99 7.23187 10.5 6.87063ZM6 3.5C8.57562 3.5 10.5 4.42375 10.5 5.25C10.5 6.07625 8.57562 7 6 7C3.42438 7 1.5 6.07625 1.5 5.25C1.5 4.42375 3.42438 3.5 6 3.5ZM1.5 7.75V6.87063C2.01 7.23187 2.69313 7.52313 3.5 7.71875V9.17937C2.27562 8.8375 1.5 8.27437 1.5 7.75ZM5.5 10.75V10.4894C5.66437 10.4956 5.83063 10.5 6 10.5C6.2425 10.5 6.47937 10.4919 6.71187 10.4781C6.97016 10.5706 7.23325 10.649 7.5 10.7131V12.1794C6.27563 11.8375 5.5 11.2744 5.5 10.75ZM8.5 12.3906V10.9C8.9972 10.9668 9.49833 11.0002 10 11C10.5016 11.0007 11.0026 10.9686 11.5 10.9038V12.3906C10.5053 12.5365 9.49468 12.5365 8.5 12.3906ZM12.5 12.1794V10.7188C13.3069 10.5231 13.99 10.2319 14.5 9.87062V10.75C14.5 11.2744 13.7244 11.8375 12.5 12.1794Z" fill="currentColor" />
  </svg>
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
    <div className="rounded-2xl border border-neutral-300 bg-white/90 p-6 shadow-sm backdrop-blur-sm dark:border-gray-800/60 dark:bg-gray-900/90">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex p-1 h-8 w-8 items-center justify-center rounded-lg bg-[#EFF4FF] dark:bg-zinc-800 text-brand-blue">
          <CoinIcon className="w-4 h-4" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Donation Summary
        </h3>
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
