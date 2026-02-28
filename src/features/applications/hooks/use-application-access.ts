"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import fetchData from "@/utilities/fetchData";

export class ApplicationAccessError extends Error {
  constructor(
    message: string,
    public readonly code: "NETWORK" | "AUTH" | "NOT_FOUND" | "UNKNOWN",
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "ApplicationAccessError";
  }

  static network(message: string, cause?: unknown): ApplicationAccessError {
    return new ApplicationAccessError(message, "NETWORK", cause);
  }

  static auth(message: string, cause?: unknown): ApplicationAccessError {
    return new ApplicationAccessError(message, "AUTH", cause);
  }

  static notFound(message: string, cause?: unknown): ApplicationAccessError {
    return new ApplicationAccessError(message, "NOT_FOUND", cause);
  }

  static unknown(message: string, cause?: unknown): ApplicationAccessError {
    return new ApplicationAccessError(message, "UNKNOWN", cause);
  }
}

type ApplicationAccessRole = "OWNER" | "ADMIN" | "REVIEWER" | "TEAM_MEMBER" | "NONE";

interface ApplicationAccessInfo {
  canView: boolean;
  canEdit: boolean;
  canReview: boolean;
  canAdminister: boolean;
  isOwner: boolean;
  accessRole: ApplicationAccessRole;
}

export interface UseApplicationAccessReturn {
  accessInfo: ApplicationAccessInfo | null;
  isLoading: boolean;
  error: ApplicationAccessError | null;
  refetch: () => void;
  canView: boolean;
  canEdit: boolean;
  canReview: boolean;
  canAdminister: boolean;
  isOwner: boolean;
  accessRole: ApplicationAccessRole;
}

export function useApplicationAccess(
  communityId: string,
  referenceNumber: string | undefined,
  enabled = true
): UseApplicationAccessReturn {
  const { authenticated, ready } = useAuth();

  const {
    data: accessInfo,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["application-access", communityId, referenceNumber, authenticated],
    queryFn: async () => {
      if (!referenceNumber) {
        throw ApplicationAccessError.unknown("Reference number is required");
      }
      try {
        const [response, fetchError] = await fetchData<ApplicationAccessInfo>(
          `/v2/funding-applications/${referenceNumber}/access`
        );
        if (fetchError || !response) {
          throw new Error(fetchError ?? "Failed to check access");
        }
        return response;
      } catch (err) {
        if (err instanceof Error) {
          const message = err.message.toLowerCase();
          if (
            message.includes("network") ||
            message.includes("fetch") ||
            message.includes("timeout")
          ) {
            throw ApplicationAccessError.network("Failed to connect to the server", err);
          }
          if (
            message.includes("401") ||
            message.includes("403") ||
            message.includes("unauthorized") ||
            message.includes("forbidden")
          ) {
            throw ApplicationAccessError.auth("Authentication required or access denied", err);
          }
          if (message.includes("404") || message.includes("not found")) {
            throw ApplicationAccessError.notFound("Application not found", err);
          }
        }
        throw ApplicationAccessError.unknown("An unexpected error occurred", err);
      }
    },
    enabled: !!referenceNumber && enabled && ready,
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
  });

  const typedError =
    error instanceof ApplicationAccessError
      ? error
      : error
        ? ApplicationAccessError.unknown(
            error instanceof Error ? error.message : "Unknown error",
            error
          )
        : null;

  return {
    accessInfo: accessInfo || null,
    isLoading,
    error: typedError,
    refetch,
    canView: accessInfo?.canView ?? false,
    canEdit: accessInfo?.canEdit ?? false,
    canReview: accessInfo?.canReview ?? false,
    canAdminister: accessInfo?.canAdminister ?? false,
    isOwner: accessInfo?.isOwner ?? false,
    accessRole: accessInfo?.accessRole ?? "NONE",
  };
}
