"use client";

import { useQuery } from "@tanstack/react-query";
import {
  type ApplicationInvoiceConfig,
  getApplicationInvoiceConfig,
} from "../services/milestone-completion.service";

export function useApplicationInvoiceConfig(
  referenceNumber: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery<ApplicationInvoiceConfig | null, Error>({
    queryKey: ["applicationInvoiceConfig", referenceNumber],
    queryFn: () => getApplicationInvoiceConfig(referenceNumber!),
    enabled: (options?.enabled ?? true) && !!referenceNumber,
    staleTime: 1000 * 60 * 5,
  });
}
