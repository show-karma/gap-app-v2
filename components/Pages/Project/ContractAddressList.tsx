"use client";

import { PlusIcon } from "@heroicons/react/24/outline";
import type { FC } from "react";
import { ContractAddressItem } from "@/components/Pages/Project/ContractAddressItem";
import { Button } from "@/components/Utilities/Button";
import type { InvalidInfo, NetworkAddressPair } from "./types";

interface ContractAddressListProps {
  pairs: NetworkAddressPair[];
  invalidContracts: Map<string, InvalidInfo>;
  onNetworkChange: (index: number, value: string) => void;
  onAddressChange: (index: number, value: string) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
  onVerify?: (index: number) => void;
  supportedNetworks: readonly string[];
  error?: string | null;
}

export const ContractAddressList: FC<ContractAddressListProps> = ({
  pairs,
  invalidContracts,
  onNetworkChange,
  onAddressChange,
  onRemove,
  onAdd,
  onVerify,
  supportedNetworks,
  error,
}) => {
  return (
    <div className="max-h-[60vh] flex flex-col gap-4 mt-8 overflow-y-auto">
      {pairs.map((pair, index) => {
        // Use network:address as key for filled pairs, fallback to index for empty ones
        const key =
          pair.network && pair.address ? `${pair.network}:${pair.address}` : `empty-${index}`;

        return (
          <ContractAddressItem
            key={key}
            pair={pair}
            index={index}
            invalidContracts={invalidContracts}
            canRemove={pairs.length > 1}
            onNetworkChange={onNetworkChange}
            onAddressChange={onAddressChange}
            onRemove={onRemove}
            onVerify={onVerify}
            supportedNetworks={supportedNetworks}
          />
        );
      })}
      <Button
        onClick={onAdd}
        className="flex items-center justify-center text-white gap-2 border border-brand-blue bg-brand-blue hover:opacity-90"
      >
        <PlusIcon className="h-5 w-5" />
        Add Another Contract
      </Button>
      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  );
};
