"use client";

import type { Hex } from "viem";
import EthereumAddressToENSAvatar from "@/components/EthereumAddressToENSAvatar";
import EthereumAddressToProfileName from "@/components/EthereumAddressToProfileName";
import { useAuth } from "@/hooks/useAuth";
import { useContributorProfile } from "@/hooks/useContributorProfile";

interface DashboardHeaderProps {
  address?: Hex;
}

export function DashboardHeader({ address }: DashboardHeaderProps) {
  const { user } = useAuth();
  const { profile } = useContributorProfile(address);
  const displayName = profile?.data?.name;
  const userEmail = user?.email?.address || user?.google?.email;

  return (
    <div className="flex items-center gap-4">
      {user?.farcaster?.pfp ? (
        <img
          src={user.farcaster.pfp}
          alt="Farcaster avatar"
          className="h-12 w-12 min-h-12 min-w-12 rounded-full border border-border"
        />
      ) : address ? (
        <EthereumAddressToENSAvatar
          address={address}
          className="h-12 w-12 min-h-12 min-w-12 rounded-full border border-border"
        />
      ) : (
        <div className="h-12 w-12 min-h-12 min-w-12 rounded-full border border-border bg-muted" />
      )}
      <div className="flex flex-col">
        <p className="text-sm text-muted-foreground">Dashboard</p>
        <h1 className="text-2xl font-semibold text-foreground">
          Welcome back
          {displayName ? (
            <span className="ml-1">, {displayName}</span>
          ) : user?.farcaster ? (
            <span className="ml-1">, {user.farcaster.displayName || user.farcaster.username}</span>
          ) : userEmail ? (
            <span className="ml-1">, {userEmail}</span>
          ) : address ? (
            <span className="ml-1">
              , <EthereumAddressToProfileName address={address} />
            </span>
          ) : null}
        </h1>
      </div>
    </div>
  );
}
