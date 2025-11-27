"use client";

import { useCallback } from "react";
import { signMoonPayUrl } from "@/services/moonpay-signature.service";
import { errorManager } from "@/components/Utilities/errorManager";

/**
 * Custom hook for signing MoonPay widget URLs
 *
 * @description
 * This hook provides a callback function that signs MoonPay URLs using the backend
 * signing endpoint. The signature is required by MoonPay to prevent URL tampering
 * and ensure secure widget initialization.
 *
 * @error_handling
 * - Logs errors via errorManager (displays toast notification to user)
 * - Re-throws errors to allow MoonPay SDK to handle them appropriately
 * - MoonPay SDK will display its own error UI if signature request fails
 *
 * @usage
 * ```tsx
 * const getSignature = useMoonPaySignature();
 *
 * <MoonPayBuyWidget
 *   onUrlSignatureRequested={getSignature}
 *   // ... other props
 * />
 * ```
 *
 * @returns Memoized callback function that takes a URL and returns a Promise<string> signature
 */
export function useMoonPaySignature() {
  const getSignature = useCallback(async (url: string): Promise<string> => {
    try {
      const signature = await signMoonPayUrl(url);
      return signature;
    } catch (error: any) {
      errorManager("Failed to sign MoonPay URL. Please try again.", error);
      throw error;
    }
  }, []);

  return getSignature;
}
