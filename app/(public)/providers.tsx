"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/utilities/query-client";

export function PublicProviders({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
