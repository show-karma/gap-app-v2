"use client";

import * as Tooltip from "@radix-ui/react-tooltip";
import { ShoppingCartIcon as ShoppingCartIconCustom } from "@/components/Icons/ShoppingCartIcon";
import { hasConfiguredPayoutAddresses } from "@/src/features/chain-payout-address/hooks/use-chain-payout-address";
import type { ChainPayoutAddressMap } from "@/src/features/chain-payout-address/types/chain-payout-address";

interface ProjectCartButtonProps {
  projectUid: string;
  projectTitle: string;
  projectSlug?: string;
  projectImageURL?: string;
  chainPayoutAddress?: ChainPayoutAddressMap;
  isInCart: boolean;
  onToggle: (item: { uid: string; title: string; slug?: string; imageURL?: string }) => void;
}

export function ProjectCartButton({
  projectUid,
  projectTitle,
  projectSlug,
  projectImageURL,
  chainPayoutAddress,
  isInCart,
  onToggle,
}: ProjectCartButtonProps) {
  const hasPayoutConfigured = hasConfiguredPayoutAddresses(chainPayoutAddress);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!hasPayoutConfigured) return;
    onToggle({
      uid: projectUid,
      title: projectTitle,
      slug: projectSlug,
      imageURL: projectImageURL,
    });
  };

  if (!hasPayoutConfigured) {
    return (
      <Tooltip.Provider>
        <Tooltip.Root delayDuration={0}>
          <Tooltip.Trigger asChild>
            <button
              type="button"
              onClick={handleClick}
              className="group relative flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 shadow-sm border bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60"
              aria-label="Donations not available"
            >
              <div className="w-5 h-5 flex items-center justify-center">
                <ShoppingCartIconCustom className="text-gray-400" />
              </div>
              Add to Cart
            </button>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              className="TooltipContent bg-brand-darkblue rounded-lg text-white p-3 max-w-[260px] z-[1000]"
              sideOffset={5}
              side="top"
            >
              <p className="text-sm">This project hasn't set up donation addresses yet.</p>
              <Tooltip.Arrow className="TooltipArrow" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`group relative flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 shadow-sm border ${
        isInCart
          ? "bg-red-100 hover:bg-red-200 text-red-700 border-red-200 hover:border-red-300"
          : "bg-[#F0FDF4] hover:bg-emerald-100 text-emerald-700 border-[#BDEFE2] hover:border-emerald-300"
      } hover:shadow-md`}
      aria-label={isInCart ? "Remove from donation cart" : "Add to donation cart"}
    >
      <div
        className={`w-5 h-5 flex items-center justify-center transition-transform duration-200 ${
          isInCart ? "group-hover:rotate-90" : ""
        }`}
      >
        <ShoppingCartIconCustom className={isInCart ? "text-red-700" : "text-emerald-700"} />
      </div>
      {isInCart ? "Remove" : "Add to Cart"}
      {isInCart && (
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
      )}
    </button>
  );
}
