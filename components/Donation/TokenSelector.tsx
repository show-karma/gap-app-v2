"use client";
import { SUPPORTED_NETWORKS, type SupportedToken } from "@/constants/supportedTokens";

interface TokenSelectorProps {
  selectedToken?: SupportedToken;
  tokenOptions: SupportedToken[];
  balanceByTokenKey: Record<string, string>;
  onTokenSelect: (token: SupportedToken) => void;
}

export function TokenSelector({
  selectedToken,
  tokenOptions,
  balanceByTokenKey,
  onTokenSelect,
}: TokenSelectorProps) {
  const networkName = selectedToken
    ? SUPPORTED_NETWORKS[selectedToken.chainId]?.chainName || selectedToken.chainName
    : undefined;

  return (
    <div className="col-span-4">
      <div className="relative">
        <select
          value={selectedToken ? `${selectedToken.symbol}-${selectedToken.chainId}` : ""}
          onChange={(e) => {
            const [symbol, chainId] = e.target.value.split("-");
            const token = tokenOptions.find(
              (t) => t.symbol === symbol && t.chainId === Number(chainId)
            );
            if (token) {
              onTokenSelect(token);
            }
          }}
          className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          <option value="">Choose token…</option>
          {tokenOptions.map((token) => {
            const key = `${token.symbol}-${token.chainId}`;
            const balanceValue = balanceByTokenKey[key];
            const balanceDisplay = balanceValue
              ? parseFloat(balanceValue).toFixed(4)
              : "0.0000";
            return (
              <option key={key} value={key}>
                {token.symbol} • {SUPPORTED_NETWORKS[token.chainId]?.chainName || token.chainName} ({balanceDisplay})
              </option>
            );
          })}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-gray-400"
          >
            <path d="M6 9L12 15L18 9" />
          </svg>
        </div>
      </div>
      {selectedToken && (
        <div className="flex items-center gap-1 mt-1">
          <span className="inline-flex items-center gap-1 rounded bg-gradient-to-r from-blue-50 to-indigo-50 px-1.5 py-0.5 text-xs font-medium text-blue-700 dark:from-blue-950/50 dark:to-indigo-950/50 dark:text-blue-300">
            <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
            {networkName}
          </span>
        </div>
      )}
    </div>
  );
}
