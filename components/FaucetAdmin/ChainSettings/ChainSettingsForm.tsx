"use client";

import { useState } from "react";
import { parseEther, formatEther } from "viem";
import type { FaucetChainSettings } from "@/utilities/faucet/faucetService";
import { appNetwork } from "@/utilities/network";
import {useChains} from "@/hooks/useFaucetAdmin";

interface ChainSettingsFormProps {
  settings?: FaucetChainSettings;
  onSave: (settings: Partial<FaucetChainSettings>) => void;
  onCancel: () => void;
}

export function ChainSettingsForm({ settings, onSave, onCancel }: ChainSettingsFormProps) {
  const [formData, setFormData] = useState({
    chainId: settings?.chainId || "",
    maxAmountPerRequest: settings ? formatEther(BigInt(settings.maxAmountPerRequest)) : "0.01",
    rateLimitHours: settings?.rateLimitHours?.toString() || "",
    bufferPercentage: settings?.bufferPercentage?.toString() || "",
    lowBalanceThreshold: settings ? formatEther(BigInt(settings.lowBalanceThreshold)) : "0.1",
    enabled: settings?.enabled ?? true,
  });
  const { chains } = useChains()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload: any = {
      maxAmountPerRequest: parseEther(formData.maxAmountPerRequest).toString(),
      lowBalanceThreshold: parseEther(formData.lowBalanceThreshold).toString(),
      enabled: formData.enabled,
    };

    // Only include if not creating new settings
    if (!settings) {
      payload.chainId = parseInt(formData.chainId.toString());
    }

    // Only include if values are provided
    if (formData.rateLimitHours) {
      payload.rateLimitHours = parseFloat(formData.rateLimitHours);
    }
    if (formData.bufferPercentage) {
      payload.bufferPercentage = parseInt(formData.bufferPercentage);
    }

    onSave(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!settings && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Chain
          </label>
          <select
            value={formData.chainId}
            onChange={(e) => setFormData({ ...formData, chainId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
            required
          >
            <option value="">Select a chain</option>
            {chains.map((network) => (
              <option key={network.chainId} value={network.chainId}>
                {network.name} (ID: {network.chainId})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Max Amount Per Request (ETH)
          </label>
          <input
            type="number"
            step="0.001"
            value={formData.maxAmountPerRequest}
            onChange={(e) => setFormData({ ...formData, maxAmountPerRequest: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Rate Limit (hours)
            <span className="text-xs text-gray-500 ml-1">(e.g., 0.0167 = 1 minute)</span>
          </label>
          <input
            type="number"
            step="0.0001"
            value={formData.rateLimitHours}
            onChange={(e) => setFormData({ ...formData, rateLimitHours: e.target.value })}
            placeholder="Leave empty for default"
            className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Buffer Percentage (%)
          </label>
          <input
            type="number"
            value={formData.bufferPercentage}
            onChange={(e) => setFormData({ ...formData, bufferPercentage: e.target.value })}
            placeholder="Leave empty for default"
            className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Low Balance Threshold (ETH)
          </label>
          <input
            type="number"
            step="0.001"
            value={formData.lowBalanceThreshold}
            onChange={(e) => setFormData({ ...formData, lowBalanceThreshold: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
            required
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="enabled"
          checked={formData.enabled}
          onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
          className="rounded border-gray-300 dark:border-zinc-600"
        />
        <label htmlFor="enabled" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Enable faucet for this chain
        </label>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Save Settings
        </button>
      </div>
    </form>
  );
}