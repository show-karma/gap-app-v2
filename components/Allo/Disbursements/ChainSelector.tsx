"use client";

import React from "react";

interface ChainSelectorProps {
  selectedChain: number;
  onSelectChain: (chainId: number) => void;
  chains?: Array<{ id: number; name: string }>;
}

const DEFAULT_CHAINS = [
  { id: 10, name: "Optimism" },
  { id: 42161, name: "Arbitrum" },
  { id: 42220, name: "Celo" },
];

export function ChainSelector({ selectedChain, onSelectChain, chains = DEFAULT_CHAINS }: ChainSelectorProps) {
  return (
    <select
      value={selectedChain}
      onChange={(e) => onSelectChain(Number(e.target.value))}
      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
    >
      {chains.map((chain) => (
        <option key={chain.id} value={chain.id}>
          {chain.name}
        </option>
      ))}
    </select>
  );
} 