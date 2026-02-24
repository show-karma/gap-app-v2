"use client";

import { useMemo } from "react";
import { useAccount } from "wagmi";
import { getDefaultGapChainId, getGapClient } from "@/utilities/gapClient";

export const useGap = () => {
  const { chain } = useAccount();

  const gap = useMemo(() => {
    const defaultChainId = getDefaultGapChainId();
    const targetChainId = chain?.id ?? defaultChainId;
    if (!targetChainId) return undefined;

    try {
      return getGapClient(targetChainId);
    } catch {
      // Unsupported chain — fall back to default
      if (defaultChainId && defaultChainId !== targetChainId) {
        try {
          return getGapClient(defaultChainId);
        } catch {
          /* noop */
        }
      }
      return undefined;
    }
  }, [chain?.id]);

  return { gap };
};
