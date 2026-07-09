"use client";

import type React from "react";
import type { Hex } from "viem";
import EthereumAddressToENSAvatar from "@/components/EthereumAddressToENSAvatar";
import EthereumAddressToProfileName from "@/components/EthereumAddressToProfileName";
import { useAuth } from "@/hooks/useAuth";
import { useContributorProfile } from "@/hooks/useContributorProfile";

function initialsFrom(name?: string, email?: string, address?: string): string {
  const trimmed = name?.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  if (address) return address.slice(2, 4).toUpperCase();
  return "K";
}

const firstToken = (value: string) => value.trim().split(/\s+/)[0];

export function SoftShell({ address, children }: { address?: Hex; children: React.ReactNode }) {
  const { user } = useAuth();
  const { profile } = useContributorProfile(address);

  const displayName =
    profile?.data?.name || user?.farcaster?.displayName || user?.farcaster?.username || undefined;
  const email = user?.email?.address || user?.google?.email || undefined;
  const pfp = user?.farcaster?.pfp;

  const initials = initialsFrom(displayName, email, address);

  // Mirror the navbar user-menu's identity resolution so the greeting matches
  // the dropdown. Human names are trimmed to the first name; a wallet-only user
  // falls back to the same <EthereumAddressToProfileName> (ENS → truncated).
  let greetingName: React.ReactNode = null;
  if (user?.farcaster?.displayName) greetingName = firstToken(user.farcaster.displayName);
  else if (user?.farcaster?.username) greetingName = user.farcaster.username;
  else if (profile?.data?.name) greetingName = firstToken(profile.data.name);
  else if (email) greetingName = email;
  else if (address) greetingName = <EthereumAddressToProfileName address={address} />;

  const avatarInner = pfp ? (
    <img src={pfp} alt="" className="h-full w-full object-cover" />
  ) : address ? (
    <EthereumAddressToENSAvatar address={address} className="h-full w-full object-cover" />
  ) : (
    initials
  );

  return (
    <div className="dashv3 min-h-[calc(100vh-var(--navbar-height,64px))] bg-sf-panel">
      <div className="mx-auto max-w-[1920px] px-4 sm:px-8 lg:px-24">
        <div className="pb-12 pt-8">
          <div className="mb-[22px] flex items-center gap-3 sm:gap-[18px]">
            <div className="grid h-[44px] w-[44px] flex-none place-items-center overflow-hidden rounded-full border-[3px] border-sf-card bg-brand-100 text-base font-bold text-brand-800 shadow-[0_0_0_1px_var(--sf-line-strong)] sm:h-[60px] sm:w-[60px] sm:text-xl">
              {avatarInner}
            </div>
            <div className="min-w-0">
              <h1 className="m-0 break-words text-[26px] font-bold leading-tight tracking-[-0.02em] text-sf-heading sm:text-[40px] sm:leading-none sm:tracking-[-0.03em]">
                Welcome back{greetingName ? <>, {greetingName}</> : null}
              </h1>
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
