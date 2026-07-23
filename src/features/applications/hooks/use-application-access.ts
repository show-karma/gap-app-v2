"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/utilities/api/client";
import { HttpError, isApiError } from "@/utilities/api/errors";
import { INDEXER } from "@/utilities/indexer";

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

type ApplicationAccessRole =
  | "SUPER_ADMIN"
  | "COMMUNITY_ADMIN"
  | "PROGRAM_REVIEWER"
  | "MILESTONE_REVIEWER"
  | "APPLICANT"
  | "GUEST"
  | "NONE";

interface ApplicationAccessInfo {
  canView: boolean;
  canEdit: boolean;
  canReview: boolean;
  canAdminister: boolean;
  isOwner: boolean;
  accessRole: ApplicationAccessRole;
}

interface UseApplicationAccessReturn {
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
        // TODO(#1775): add zod schema
        const response = await api.get<ApplicationAccessInfo>(
          INDEXER.V2.FUNDING_APPLICATIONS.ACCESS(referenceNumber)
        );
        if (!response) {
          throw ApplicationAccessError.network("Failed to connect to the server");
        }
        return response;
      } catch (fetchError) {
        if (fetchError instanceof ApplicationAccessError) throw fetchError;

        if (isApiError(fetchError) && fetchError instanceof HttpError) {
          const httpStatus = fetchError.status;
          if (httpStatus === 401 || httpStatus === 403) {
            throw ApplicationAccessError.auth(
              "Authentication required or access denied",
              fetchError
            );
          }
          if (httpStatus === 404) {
            throw ApplicationAccessError.notFound("Application not found", fetchError);
          }
          if (httpStatus >= 500) {
            throw ApplicationAccessError.network("Failed to connect to the server", fetchError);
          }
          throw ApplicationAccessError.unknown(
            fetchError.message ?? "Failed to check access",
            fetchError
          );
        }
        // Network / timeout / aborted — no HTTP status at all.
        throw ApplicationAccessError.network("Failed to connect to the server", fetchError);
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
