"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { getApplicationStatusHistory } from "@/src/features/applications/services/status-history.service";
import type { Application } from "@/types/whitelabel-entities";

type StatusHistory = Application["statusHistory"];

/**
 * Re-fetches an application's status history with the viewer's token.
 *
 * The whitelabel page is server-rendered anonymously (no Privy token exists
 * server-side), so the backend strips the private status-change reasons from
 * that payload — the backend is the access guard. Authenticated viewers call
 * this so the backend can return the reasons to the applicant, reviewers, and
 * admins. Guests are unauthenticated, so the query never runs and they keep the
 * sanitized SSR payload. No authorization happens here.
 */
export function useApplicationStatusHistory(referenceNumber: string | undefined): {
  statusHistory: StatusHistory | undefined;
  isLoading: boolean;
} {
  const { authenticated, ready } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["application-status-history", referenceNumber, authenticated],
    queryFn: () => getApplicationStatusHistory(referenceNumber as string),
    enabled: !!referenceNumber && ready && authenticated,
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
  });

  return { statusHistory: data, isLoading };
}
