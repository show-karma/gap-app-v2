"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import fetchData from "@/utilities/fetchData";
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
      const [response, fetchError, , httpStatus] = await fetchData<ApplicationAccessInfo>(
        INDEXER.V2.FUNDING_APPLICATIONS.ACCESS(referenceNumber)
      );
      if (fetchError || !response) {
        if (httpStatus === 401 || httpStatus === 403) {
          throw ApplicationAccessError.auth("Authentication required or access denied");
        }
        if (httpStatus === 404) {
          throw ApplicationAccessError.notFound("Application not found");
        }
        if (!httpStatus || httpStatus === 0 || httpStatus >= 500) {
          throw ApplicationAccessError.network("Failed to connect to the server");
        }
        throw ApplicationAccessError.unknown(fetchError ?? "Failed to check access");
      }
      return response;
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
