"use client";

import { useEffect, useState } from "react";
import { Spinner } from "@/components/Utilities/Spinner";
import { useFaucetConfig } from "@/hooks/useFaucetAdmin";

export function GlobalConfigForm() {
  const { config, isLoading, updateGlobalConfig } = useFaucetConfig();
  const [formData, setFormData] = useState({
    defaultRateLimitHours: 1,
    defaultBufferPercentage: 20,
    maxChainsPerRequest: 1,
    globalEnabled: true,
  });

  useEffect(() => {
    if (config?.configurations.global) {
      setFormData({
        defaultRateLimitHours: config.configurations.global.defaultRateLimitHours,
        defaultBufferPercentage: config.configurations.global.defaultBufferPercentage,
        maxChainsPerRequest: config.configurations.global.maxChainsPerRequest,
        globalEnabled: config.configurations.global.globalEnabled,
      });
    }
  }, [config]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateGlobalConfig(formData);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Global Faucet Configuration
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="global-config-rate-limit"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Default Rate Limit (hours)
          </label>
          <input
            id="global-config-rate-limit"
            type="number"
            step="0.0001"
            value={formData.defaultRateLimitHours}
            onChange={(e) =>
              setFormData({ ...formData, defaultRateLimitHours: parseFloat(e.target.value) })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-gray-900 dark:text-white"
            required
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Default rate limit between claims. Can be overridden per chain. (0.0167 = 1 minute)
          </p>
        </div>

        <div>
          <label
            htmlFor="global-config-buffer"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Default Buffer Percentage (%)
          </label>
          <input
            id="global-config-buffer"
            type="number"
            value={formData.defaultBufferPercentage}
            onChange={(e) =>
              setFormData({ ...formData, defaultBufferPercentage: parseInt(e.target.value, 10) })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-gray-900 dark:text-white"
            required
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Additional gas buffer to ensure transactions succeed
          </p>
        </div>

        <div>
          <label
            htmlFor="global-config-max-chains"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Max Chains Per Request
          </label>
          <input
            id="global-config-max-chains"
            type="number"
            value={formData.maxChainsPerRequest}
            onChange={(e) =>
              setFormData({ ...formData, maxChainsPerRequest: parseInt(e.target.value, 10) })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-gray-900 dark:text-white"
            required
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Maximum number of chains a user can request funds for simultaneously
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="globalEnabled"
            checked={formData.globalEnabled}
            onChange={(e) => setFormData({ ...formData, globalEnabled: e.target.checked })}
            className="rounded border-gray-300 dark:border-zinc-600"
          />
          <label
            htmlFor="globalEnabled"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Enable faucet globally
          </label>
        </div>

        {!formData.globalEnabled && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Warning: Disabling the faucet globally will prevent all users from claiming funds on
              any chain.
            </p>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Update Global Configuration
          </button>
        </div>
      </form>
    </div>
  );
}
