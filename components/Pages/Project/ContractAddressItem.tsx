"use client";

import { CheckBadgeIcon, ExclamationTriangleIcon, TrashIcon } from "@heroicons/react/24/outline";
import { memo, useEffect, useMemo, useState } from "react";
import { SearchDropdown } from "@/components/Pages/ProgramRegistry/SearchDropdown";
import { Button } from "@/components/Utilities/Button";
import { validateContractAddress } from "@/schemas/contractAddress";
import { getContractKey } from "@/utilities/contractKey";
import { getBaseUrl } from "@/utilities/getBaseUrl";
import type { ContractAddressItemProps, InvalidInfo } from "./types";

export type { InvalidInfo };

export const ContractAddressItem = memo<ContractAddressItemProps>(
  ({
    pair,
    index,
    invalidContracts,
    canRemove,
    onNetworkChange,
    onAddressChange,
    onRemove,
    onVerify,
    supportedNetworks,
    readOnly = false,
  }) => {
    // Local state for real-time format validation
    const [formatError, setFormatError] = useState<string | null>(null);

    // Calculate base URL once
    const baseUrl = useMemo(() => getBaseUrl(), []);

    // Calculate validation state based on the invalidContracts Map
    const contractKey = useMemo(
      () => getContractKey(pair.network, pair.address),
      [pair.network, pair.address]
    );

    const isInvalid = useMemo(
      () => invalidContracts.has(contractKey),
      [invalidContracts, contractKey]
    );

    const invalidInfo = useMemo(
      () => invalidContracts.get(contractKey),
      [invalidContracts, contractKey]
    );

    // Validate address format in real-time
    useEffect(() => {
      if (pair.address.trim() === "") {
        setFormatError(null);
        return;
      }

      const validation = validateContractAddress(pair.address);
      if (!validation.isValid) {
        setFormatError(validation.error || "Invalid address format");
      } else {
        setFormatError(null);
      }
    }, [pair.address]);

    // Combined validation state (format error or backend validation error)
    const hasError = useMemo(() => isInvalid || formatError !== null, [isInvalid, formatError]);

    return (
      <div className="flex flex-col space-y-2">
        <div className="flex items-center space-x-2">
          <div
            className={`flex items-center justify-between p-4 rounded-lg flex-grow ${
              hasError
                ? "bg-red-50 dark:bg-red-900/20 border-2 border-red-500"
                : "bg-gray-100 dark:bg-zinc-700"
            }`}
          >
            <div className="flex items-center space-x-4 w-full">
              <span className="text-md font-bold capitalize whitespace-nowrap">
                Contract {index + 1}
              </span>
              <div className="flex-1 flex space-x-4">
                {readOnly ? (
                  <div className="flex-1 px-3 py-2 text-sm capitalize text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-zinc-600 rounded-md">
                    {pair.network || "No network"}
                  </div>
                ) : (
                  <SearchDropdown
                    onSelectFunction={(value) => onNetworkChange(index, value)}
                    selected={pair.network ? [pair.network] : []}
                    list={[...supportedNetworks]}
                    type="network"
                    prefixUnselected="Select"
                    buttonClassname="flex-1"
                  />
                )}
                <input
                  type="text"
                  value={pair.address}
                  onChange={(e) => onAddressChange(index, e.target.value)}
                  readOnly={readOnly}
                  className={`flex-1 text-sm rounded-md bg-transparent border-b focus:outline-none ${
                    readOnly
                      ? "text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 cursor-default"
                      : hasError
                        ? "text-red-600 dark:text-red-400 border-red-500 focus:border-red-600"
                        : "text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 focus:border-blue-500"
                  }`}
                  placeholder={readOnly ? "" : "Enter contract address (0x...)"}
                  aria-label={`Contract address ${index + 1}`}
                  aria-invalid={hasError}
                  aria-describedby={hasError ? `contract-error-${index}` : undefined}
                />
              </div>
              {pair.address && pair.network && (
                <div className="flex items-center space-x-2 ml-2">
                  {pair.verified ? (
                    <div
                      className="flex items-center space-x-1 text-green-600 dark:text-green-400"
                      title={`Verified on ${
                        pair.verifiedAt ? new Date(pair.verifiedAt).toLocaleDateString() : "N/A"
                      }`}
                    >
                      <CheckBadgeIcon className="h-5 w-5" />
                      <span className="text-xs font-medium">Verified</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center space-x-1 text-yellow-600 dark:text-yellow-400">
                        <ExclamationTriangleIcon className="h-5 w-5" />
                        <span className="text-xs font-medium">Unverified</span>
                      </div>
                      {onVerify && (
                        <button
                          type="button"
                          onClick={() => onVerify(index)}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                          aria-label={`Verify contract ${index + 1}`}
                        >
                          Verify
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          {canRemove && !readOnly && (
            <Button
              onClick={() => onRemove(index)}
              className="p-2 text-red-500 hover:text-red-700 bg-transparent dark:bg-transparent hover:bg-transparent dark:hover:bg-transparent"
              aria-label="Remove contract"
            >
              <TrashIcon className="h-5 w-5" />
            </Button>
          )}
        </div>
        {hasError && (
          <div
            id={`contract-error-${index}`}
            className="ml-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded"
            role="alert"
          >
            <p className="text-sm text-red-700 dark:text-red-400">
              {formatError ? (
                <>
                  <span className="font-bold">Invalid Address Format:</span> {formatError}
                </>
              ) : invalidInfo?.projectName === "Validation Failed" ? (
                <>
                  <span className="font-bold">Validation Error:</span>{" "}
                  {invalidInfo.errorMessage ||
                    "Failed to validate this contract address. Please check the network and address, then try again."}
                </>
              ) : invalidInfo ? (
                <>
                  You can&apos;t add this contract address. This contract is already associated with
                  Project{" "}
                  {invalidInfo.projectSlug ? (
                    <a
                      href={`${baseUrl}/project/${invalidInfo.projectSlug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold underline hover:text-red-800 dark:hover:text-red-300"
                    >
                      {invalidInfo.projectName}
                    </a>
                  ) : (
                    <span className="font-bold">{invalidInfo.projectName}</span>
                  )}
                  .
                </>
              ) : null}
            </p>
          </div>
        )}
      </div>
    );
  }
);

ContractAddressItem.displayName = "ContractAddressItem";
