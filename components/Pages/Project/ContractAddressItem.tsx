"use client";

import { TrashIcon } from "@heroicons/react/24/outline";
import { memo, useMemo } from "react";
import { SearchDropdown } from "@/components/Pages/ProgramRegistry/SearchDropdown";
import { Button } from "@/components/Utilities/Button";
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
    supportedNetworks,
  }) => {
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

    return (
    <div className="flex flex-col space-y-2">
      <div className="flex items-center space-x-2">
        <div
          className={`flex items-center justify-between p-4 rounded-lg flex-grow ${
            isInvalid
              ? "bg-red-50 dark:bg-red-900/20 border-2 border-red-500"
              : "bg-gray-100 dark:bg-zinc-700"
          }`}
        >
          <div className="flex items-center space-x-4 w-full">
            <span className="text-md font-bold capitalize whitespace-nowrap">
              Contract {index + 1}
            </span>
            <div className="flex-1 flex space-x-4">
              <SearchDropdown
                onSelectFunction={(value) => onNetworkChange(index, value)}
                selected={pair.network ? [pair.network] : []}
                list={[...supportedNetworks]}
                type="network"
                prefixUnselected="Select"
                buttonClassname="flex-1"
              />
              <input
                type="text"
                value={pair.address}
                onChange={(e) => onAddressChange(index, e.target.value)}
                className={`flex-1 text-sm rounded-md bg-transparent border-b focus:outline-none ${
                  isInvalid
                    ? "text-red-600 dark:text-red-400 border-red-500 focus:border-red-600"
                    : "text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 focus:border-blue-500"
                }`}
                placeholder="Enter contract address"
              />
            </div>
          </div>
        </div>
        {canRemove && (
          <Button
            onClick={() => onRemove(index)}
            className="p-2 text-red-500 hover:text-red-700"
            aria-label="Remove contract"
          >
            <TrashIcon className="h-5 w-5" />
          </Button>
        )}
      </div>
      {isInvalid && invalidInfo && (
        <div className="ml-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded">
          <p className="text-sm text-red-700 dark:text-red-400">
            {invalidInfo.projectName === "Validation Failed" ? (
              <>
                <span className="font-bold">Validation Error:</span>{" "}
                {invalidInfo.errorMessage ||
                  "Failed to validate this contract address. Please check the network and address, then try again."}
              </>
            ) : (
              <>
                You can&apos;t add this contract address. This contract is
                already associated with Project{" "}
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
            )}
          </p>
        </div>
      )}
    </div>
    );
  }
);

ContractAddressItem.displayName = "ContractAddressItem";
