"use client";

import { ExclamationTriangleIcon, PlayIcon } from "@heroicons/react/24/outline";

interface EmergencyControlsProps {
  chainId: number;
  enabled: boolean;
  onEmergencyStop: () => void;
  onResume: () => void;
}

export function EmergencyControls({
  chainId,
  enabled,
  onEmergencyStop,
  onResume,
}: EmergencyControlsProps) {
  return (
    <div className="flex space-x-2">
      {enabled ? (
        <button
          onClick={() => {
            if (confirm(`Are you sure you want to emergency stop the faucet for chain ${chainId}? This will disable all operations and expire pending requests.`)) {
              onEmergencyStop();
            }
          }}
          className="flex items-center space-x-1 px-3 py-1 text-sm bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/30 transition-colors"
        >
          <ExclamationTriangleIcon className="w-4 h-4" />
          <span>Emergency Stop</span>
        </button>
      ) : (
        <button
          onClick={() => {
            if (confirm(`Are you sure you want to resume operations for chain ${chainId}?`)) {
              onResume();
            }
          }}
          className="flex items-center space-x-1 px-3 py-1 text-sm bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded hover:bg-green-200 dark:hover:bg-green-900/30 transition-colors"
        >
          <PlayIcon className="w-4 h-4" />
          <span>Resume</span>
        </button>
      )}
    </div>
  );
}