"use client";

import type { Hex } from "viem";
import EthereumAddressToENSAvatar from "@/components/EthereumAddressToENSAvatar";
import EthereumAddressToENSName from "@/components/EthereumAddressToENSName";
import { useContributorProfile } from "@/hooks/useContributorProfile";

interface DashboardHeaderProps {
  address: Hex;
}

export function DashboardHeader({ address }: DashboardHeaderProps) {
  const { profile } = useContributorProfile(address);
  const displayName = profile?.data?.name;

  return (
    <div className="flex items-center gap-4">
      <EthereumAddressToENSAvatar
        address={address}
        className="h-12 w-12 min-h-12 min-w-12 rounded-full border border-border"
      />
      <div className="flex flex-col">
        <p className="text-sm text-muted-foreground">Dashboard</p>
        <h1 className="text-2xl font-semibold text-foreground">
          Welcome back
          {displayName ? (
            <span className="ml-1">, {displayName}</span>
          ) : (
            <span className="ml-1">
              , <EthereumAddressToENSName address={address} />
            </span>
          )}
        </h1>
      </div>
    </div>
  );
}
