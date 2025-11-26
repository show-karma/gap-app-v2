"use client";

import { PlusIcon } from "@heroicons/react/24/outline";
import type { FC } from "react";
import { ContractAddressItem } from "@/components/Pages/Project/ContractAddressItem";
import { Button } from "@/components/ui/button";
import type { InvalidInfo, NetworkAddressPair } from "./types";

interface ContractAddressListProps {
  pairs: NetworkAddressPair[];
  invalidContracts: Map<string, InvalidInfo>;
  onNetworkChange: (index: number, value: string) => void;
  onAddressChange: (index: number, value: string) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
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
  supportedNetworks,
  error,
}) => {
  return (
    <div className="max-h-[60vh] flex flex-col gap-4 mt-8 overflow-y-auto">
      {pairs.map((pair, index) => (
        <ContractAddressItem
          key={index}
          pair={pair}
          index={index}
          invalidContracts={invalidContracts}
          canRemove={pairs.length > 1}
          onNetworkChange={onNetworkChange}
          onAddressChange={onAddressChange}
          onRemove={onRemove}
          supportedNetworks={supportedNetworks}
        />
      ))}
      <Button
        onClick={onAdd}
        className="flex items-center justify-center gap-2 border border-primary-500"
      >
        <PlusIcon className="h-5 w-5" />
        Add Another Contract
      </Button>
      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  );
};
