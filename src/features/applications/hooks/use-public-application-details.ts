"use client";

import { useQuery } from "@tanstack/react-query";
import type { Application } from "@/types/whitelabel-entities";
import { api } from "@/utilities/api/client";
import { HttpError, isApiError } from "@/utilities/api/errors";

/**
 * Best-effort text extraction from a thrown ApiError, mirroring the
 * pre-migration `fetchData` error-string shape (backend body message, else
 * the ApiError's own message) so the "private"/"404" substring checks below
 * keep working the same way they did against the legacy tuple's error slot.
 */
function getErrorText(err: unknown): string {
  if (isApiError(err)) {
    if (err instanceof HttpError) {
      const bodyMessage = (err.body as { message?: string } | undefined)?.message;
      return bodyMessage || err.message;
    }
    return err.message;
  }
  return err instanceof Error ? err.message : String(err);
}

interface UsePublicApplicationDetailsParams {
  referenceNumber: string;
  communityId: string;
  enabled?: boolean;
}

interface UsePublicApplicationDetailsReturn {
  application: Application | null;
  isLoading: boolean;
  error: Error | null;
  isPrivate: boolean;
  refetch: () => void;
}

export function usePublicApplicationDetails({
  referenceNumber,
  communityId,
  enabled = true,
}: UsePublicApplicationDetailsParams): UsePublicApplicationDetailsReturn {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["public-application-details", referenceNumber, communityId],
    queryFn: async () => {
      if (!referenceNumber) {
        return { application: null, isPrivate: false };
      }

      try {
        // TODO(#1775): add zod schema
        const response = await api.get<Application & { message?: string }>(
          `/v2/funding-applications/${referenceNumber}`
        );

        if (
          response &&
          "message" in response &&
          typeof response.message === "string" &&
          response.message.includes("private")
        ) {
          return { application: null, isPrivate: true };
        }

        return {
          application: response ?? null,
          isPrivate: false,
        };
      } catch (err) {
        const errorText = getErrorText(err);
        if (errorText.includes("private")) {
          return { application: null, isPrivate: true };
        }
        if (
          (isApiError(err) && err instanceof HttpError && err.status === 404) ||
          errorText.includes("404")
        ) {
          return { application: null, isPrivate: false };
        }
        throw err;
      }
    },
    enabled: enabled && !!referenceNumber,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  return {
    application: data?.application || null,
    isLoading,
    error: error as Error | null,
    isPrivate: data?.isPrivate || false,
    refetch,
  };
}
