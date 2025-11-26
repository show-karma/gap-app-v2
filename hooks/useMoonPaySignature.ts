"use client";

import { useCallback } from "react";
import { signMoonPayUrl } from "@/services/moonpay-signature.service";
import { errorManager } from "@/components/Utilities/errorManager";

export function useMoonPaySignature() {
  const getSignature = useCallback(async (url: string): Promise<string> => {
    try {
      const signature = await signMoonPayUrl(url);
      return signature;
    } catch (error: any) {
      errorManager("Failed to sign MoonPay URL", error);
      throw error;
    }
  }, []);

  return getSignature;
}
