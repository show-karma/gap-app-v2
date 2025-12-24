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

  const selectId = `token-selector-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="col-span-4">
      <div className="relative">
        <label htmlFor={selectId} className="sr-only">
          Select token for donation
        </label>
        <select
          data-testid="token-selector"
          id={selectId}
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
          className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          aria-label="Select token for donation"
          aria-describedby={selectedToken ? `${selectId}-network` : undefined}
        >
          <option value="">Choose token…</option>
          {tokenOptions.map((token) => {
            const key = `${token.symbol}-${token.chainId}`;
            const balanceValue = balanceByTokenKey[key];
            const balanceDisplay = balanceValue ? parseFloat(balanceValue).toFixed(6) : "0";
            const networkName = SUPPORTED_NETWORKS[token.chainId]?.chainName || token.chainName;
            return (
              <option key={key} value={key}>
                {token.symbol} on {networkName} (Balance: {balanceDisplay})
              </option>
            );
          })}
        </select>
      </div>
      {selectedToken && (
        <div className="flex items-center gap-1 mt-1" id={`${selectId}-network`}>
          <span
            className="inline-flex items-center gap-1 rounded bg-gradient-to-r from-blue-50 to-indigo-50 px-1.5 py-0.5 text-xs font-medium text-blue-700 dark:from-blue-950/50 dark:to-indigo-950/50 dark:text-blue-300"
            title={`Selected network: ${networkName}`}
          >
            <div className="h-1.5 w-1.5 rounded-full bg-blue-500" aria-hidden="true" />
            {networkName}
          </span>
        </div>
      )}
    </div>
  );
}
