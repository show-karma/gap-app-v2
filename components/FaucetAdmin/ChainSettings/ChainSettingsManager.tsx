"use client";

import { useState } from "react";
import { formatEther } from "viem";
import { Spinner } from "@/components/Utilities/Spinner";
import { useFaucetConfig, useFaucetEmergency } from "@/hooks/useFaucetAdmin";
import type { FaucetChainSettings } from "@/utilities/faucet/faucetService";
import { appNetwork } from "@/utilities/network";
import { ChainSettingsForm } from "./ChainSettingsForm";
import { EmergencyControls } from "./EmergencyControls";

export function ChainSettingsManager() {
  const { config, isLoading, updateChainSettings, createChainSettings, deleteChainSettings } =
    useFaucetConfig();
  const { emergencyStop, resumeOperations } = useFaucetEmergency();
  const [editingChain, setEditingChain] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  const handleSaveSettings = (chainId: number, settings: Partial<FaucetChainSettings>) => {
    updateChainSettings({ chainId, settings });
    setEditingChain(null);
  };

  const handleCreateSettings = (settings: FaucetChainSettings) => {
    createChainSettings(settings);
    setShowAddForm(false);
  };

  const getChainName = (chainId: number) => {
    return appNetwork.find((n) => n.id === chainId)?.name || `Chain ${chainId}`;
  };

  return (
    <div className="space-y-6">
      {/* Add New Chain Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Add New Chain
        </button>
      </div>

      {/* Add New Chain Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Add New Chain Settings</h3>
          <ChainSettingsForm
            onSave={(settings) => handleCreateSettings(settings as FaucetChainSettings)}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}

      {/* Chain Settings List */}
      <div className="space-y-4">
        {config?.configurations.chains?.map((settings) => (
          <div
            key={settings.chainId}
            className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {getChainName(settings.chainId)}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Chain ID: {settings.chainId}
                </p>
              </div>
              <div className="flex space-x-2">
                <EmergencyControls
                  chainId={settings.chainId}
                  enabled={settings.enabled}
                  onEmergencyStop={() => emergencyStop(settings.chainId)}
                  onResume={() => resumeOperations(settings.chainId)}
                />
                <button
                  onClick={() => setEditingChain(settings.chainId)}
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-zinc-600"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    if (confirm("Are you sure you want to delete these settings?")) {
                      deleteChainSettings(settings.chainId);
                    }
                  }}
                  className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/30"
                >
                  Delete
                </button>
              </div>
            </div>

            {editingChain === settings.chainId ? (
              <ChainSettingsForm
                settings={settings}
                onSave={(updated) => handleSaveSettings(settings.chainId, updated)}
                onCancel={() => setEditingChain(null)}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Max Amount Per Request</p>
                  <p className="text-lg font-medium text-gray-900 dark:text-white">
                    {formatEther(BigInt(settings.maxAmountPerRequest))} ETH
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Rate Limit</p>
                  <p className="text-lg font-medium text-gray-900 dark:text-white">
                    {settings.rateLimitHours
                      ? settings.rateLimitHours < 1
                        ? `${Math.round(settings.rateLimitHours * 60)} minutes`
                        : `${settings.rateLimitHours} hours`
                      : "Default"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Buffer Percentage</p>
                  <p className="text-lg font-medium text-gray-900 dark:text-white">
                    {settings.bufferPercentage || "Default"}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Low Balance Threshold</p>
                  <p className="text-lg font-medium text-gray-900 dark:text-white">
                    {formatEther(BigInt(settings.lowBalanceThreshold))} ETH
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                  <p
                    className={`text-lg font-medium ${settings.enabled ? "text-green-600" : "text-red-600"}`}
                  >
                    {settings.enabled ? "Enabled" : "Disabled"}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}

        {(!config?.configurations.chains || config?.configurations.chains.length === 0) &&
          !showAddForm && (
            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                No chain settings configured yet
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Add First Chain
              </button>
            </div>
          )}
      </div>
    </div>
  );
}
