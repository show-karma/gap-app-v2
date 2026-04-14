"use client";

import { useQuery } from "@tanstack/react-query";
import { usePrivyBridge } from "@/contexts/privy-bridge-context";
import { QUERY_KEYS } from "@/utilities/queryKeys";
import {
  type ApplicationInvoiceConfig,
  getApplicationInvoiceConfig,
} from "../services/milestone-completion.service";

export function useApplicationInvoiceConfig(
  referenceNumber: string | undefined,
  options?: { enabled?: boolean }
) {
  const { ready, authenticated } = usePrivyBridge();

  return useQuery<ApplicationInvoiceConfig | null, Error>({
    queryKey: QUERY_KEYS.APPLICATIONS.INVOICE_CONFIG(referenceNumber ?? ""),
    queryFn: () => getApplicationInvoiceConfig(referenceNumber!),
    // Delay until Privy has hydrated and the user is authenticated.
    // Without this guard, the query fires before a token is available,
    // gets a 401, caches null, and never retries once auth is ready.
    enabled: (options?.enabled ?? true) && !!referenceNumber && ready && authenticated,
    staleTime: 1000 * 60 * 5,
  });
}
