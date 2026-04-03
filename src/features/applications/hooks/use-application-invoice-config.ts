"use client";

import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/utilities/queryKeys";
import {
  type ApplicationInvoiceConfig,
  getApplicationInvoiceConfig,
} from "../services/milestone-completion.service";

export function useApplicationInvoiceConfig(
  referenceNumber: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery<ApplicationInvoiceConfig | null, Error>({
    queryKey: QUERY_KEYS.APPLICATIONS.INVOICE_CONFIG(referenceNumber ?? ""),
    queryFn: () => getApplicationInvoiceConfig(referenceNumber!),
    enabled: (options?.enabled ?? true) && !!referenceNumber,
    staleTime: 1000 * 60 * 5,
  });
}
