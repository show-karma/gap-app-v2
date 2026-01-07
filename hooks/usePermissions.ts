import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useAccount } from "wagmi";
import { useAuth } from "@/hooks/useAuth";
import type { FundingProgram } from "@/services/fundingPlatformService";
import { PermissionsService } from "@/services/permissions.service";
import { createAuthenticatedApiClient } from "@/utilities/auth/api-client";
import { defaultQueryOptions } from "@/utilities/queries/defaultOptions";

const _apiClient = createAuthenticatedApiClient();

/**
 * Options for configuring the usePermissions hook
 */
export interface PermissionOptions {
  /** Program ID to check permissions for */
  programId?: string;
  /** Specific action to check permission for (e.g., 'comment', 'view', 'edit') */
  action?: string;
  /** Role to check (e.g., 'reviewer', 'admin') */
  role?: string;
  /** Whether the query should be enabled. Defaults to true when prerequisites are met */
  enabled?: boolean;
}

/**
 * Permission check response
 */
interface PermissionCheckResponse {
  hasPermission: boolean;
  permissions: string[];
}

/**
 * Reviewer programs response
 */
type ReviewerProgramsResponse = FundingProgram[];

/**
 * Generic hook for checking permissions and roles
 *
 * @param options - Configuration options for permission checking
 *
 * @returns {Object} Object containing:
 * - hasPermission: boolean indicating if the user has the requested permission
 * - hasRole: boolean alias for hasPermission (for role checks)
 * - isLoading: boolean indicating if the check is in progress
 * - permissions: array of permissions the user has
 * - programs: array of programs for reviewer role (if applicable)
 * - error: any error that occurred during the check
 * - refetch: function to manually trigger a re-check
 *
 * @example
 * ```tsx
 * // Check if user is a reviewer for a specific program
 * const { hasRole } = usePermissions({
 *   role: 'reviewer',
 *   programId: 'program123',
 *   chainID: 1
 * });
 *
 * // Check if user can comment on a program
 * const { hasPermission } = usePermissions({
 *   programId: 'program123',
 *   chainID: 1,
 *   action: 'comment'
 * });
 *
 * // Get all programs where user is a reviewer
 * const { programs } = usePermissions({ role: 'reviewer' });
 * ```
 */
export const usePermissions = (options: PermissionOptions = {}) => {
  const { address: wagmiAddress } = useAccount();
  const { authenticated: isAuth, getAccessToken: getToken, ready } = useAuth();
  const { programId, action, role, enabled = true } = options;

  const query = useQuery({
    queryKey: ["permissions", programId, action, role, wagmiAddress, isAuth],
    queryFn: async () => {
      if (!isAuth || !wagmiAddress || !ready) {
        return {
          hasPermission: false,
          permissions: [],
          programs: [],
        };
      }

      const permissionsService = new PermissionsService();

      // Check specific program permission
      if (programId) {
        try {
          const response = await permissionsService.checkPermission({ programId, action });

          return {
            hasPermission: response.hasPermission,
            permissions: response.permissions || [],
            programs: [],
          };
        } catch (error) {
          if (axios.isAxiosError(error)) {
            if (error.response?.status === 401) {
              console.error("Authentication error: Please reconnect your wallet");
            } else if (error.response?.status === 403) {
              console.error("Permission denied: You don't have access to this resource");
            } else if (error.code === "ECONNABORTED") {
              console.error("Request timeout: Please check your connection and try again");
            } else {
              console.error(
                `Error checking permission (${error.response?.status || "network error"}): ${error.message}`
              );
            }
          } else {
            console.error("Error checking permission:", error);
          }
          return {
            hasPermission: false,
            permissions: [],
            programs: [],
          };
        }
      }

      // Get user's reviewer programs
      if (role === "reviewer") {
        try {
          const programs = (await permissionsService.getReviewerPrograms()) || [];

          return {
            hasPermission: programs.length > 0,
            permissions: ["read", "comment"],
            programs,
          };
        } catch (error) {
          if (axios.isAxiosError(error)) {
            if (error.response?.status === 401) {
              console.error(
                "Authentication error: Please reconnect your wallet to view reviewer programs"
              );
            } else if (error.response?.status === 403) {
              console.error("Access denied: You don't have permission to view reviewer programs");
            } else if (error.code === "ECONNABORTED") {
              console.error("Request timeout: Unable to fetch reviewer programs. Please try again");
            } else {
              console.error(
                `Error fetching reviewer programs (${error.response?.status || "network error"}): ${error.message}`
              );
            }
          } else {
            console.error("Error fetching reviewer programs:", error);
          }
          return {
            hasPermission: false,
            permissions: [],
            programs: [],
          };
        }
      }

      // Default: no permissions
      return {
        hasPermission: false,
        permissions: [],
        programs: [],
      };
    },
    ...defaultQueryOptions,
    enabled: enabled && !!isAuth && !!wagmiAddress,
    staleTime: 1 * 60 * 1000, // Cache for 5 minutes
    retry: (failureCount, error) => {
      // Retry only network errors, not auth issues
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        return false;
      }
      return failureCount < 3;
    },
  });

  return {
    hasPermission: query.data?.hasPermission ?? false,
    hasRole: query.data?.hasPermission ?? false, // Alias for role checks
    isLoading: query.isLoading,
    permissions: query.data?.permissions ?? [],
    programs: query.data?.programs ?? [],
    error: query.error,
    refetch: query.refetch,
    isError: query.isError,
  };
};

/**
 * Convenience hook for checking reviewer role
 *
 * @param programId - The program ID to check
 *
 * @example
 * ```tsx
 * const { isReviewer, isLoading } = useIsReviewer('program123');
 * if (isReviewer) {
 *   // Show reviewer-specific UI
 * }
 * ```
 */
export const useIsReviewer = (programId?: string) => {
  const result = usePermissions({
    role: "reviewer",
    programId,
  });

  return {
    isReviewer: result.hasRole,
    isLoading: result.isLoading,
    permissions: result.permissions,
    error: result.error,
    refetch: result.refetch,
  };
};

/**
 * Hook to get all programs where the user is a reviewer
 *
 * @example
 * ```tsx
 * const { programs, isLoading } = useReviewerPrograms();
 * programs.forEach(program => {
 *   console.log(`Reviewer for ${program.name}`);
 * });
 * ```
 */
export const useReviewerPrograms = () => {
  const result = usePermissions({ role: "reviewer" });

  return {
    programs: result.programs,
    isLoading: result.isLoading,
    hasPrograms: result.hasPermission,
    error: result.error,
    refetch: result.refetch,
  };
};
