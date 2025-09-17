import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { useAuthStore } from "@/store/auth";
import { defaultQueryOptions } from "@/utilities/queries/defaultOptions";
import axios from "axios";
import { getCookiesFromStoredWallet } from "@/utilities/getCookiesFromStoredWallet";
import { envVars } from "@/utilities/enviromentVars";

const API_URL = envVars.NEXT_PUBLIC_GAP_INDEXER_URL;

// Create axios instance with authentication
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor for authentication
apiClient.interceptors.request.use((config) => {
  const { token } = getCookiesFromStoredWallet();
  if (token) {
    config.headers.Authorization = token;
  }
  return config;
});

/**
 * Options for configuring the usePermissions hook
 */
export interface PermissionOptions {
  /** Program ID to check permissions for */
  programId?: string;
  /** Chain ID for the program */
  chainID?: number;
  /** Specific action to check permission for (e.g., 'comment', 'view', 'edit') */
  action?: string;
  /** Role to check (e.g., 'reviewer', 'admin') */
  role?: string;
  /** Whether the query should be enabled. Defaults to true when prerequisites are met */
  enabled?: boolean;
}

/**
 * Program information for reviewer role
 */
export interface ReviewerProgram {
  programId: string;
  chainID: number;
  name?: string;
  assignedAt: string;
  permissions: string[];
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
interface ReviewerProgramsResponse {
  programs: ReviewerProgram[];
}

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
  const { address } = useAccount();
  const { isAuth } = useAuthStore();
  const { programId, chainID, action, role, enabled = true } = options;

  const query = useQuery({
    queryKey: ["permissions", programId, chainID, action, role, address, isAuth],
    queryFn: async () => {
      if (!isAuth || !address) {
        return {
          hasPermission: false,
          permissions: [],
          programs: []
        };
      }

      // Check specific program permission
      if (programId && chainID) {
        try {
          const params = new URLSearchParams();
          if (action) params.append("action", action);

          const response = await apiClient.get<PermissionCheckResponse>(
            `/v2/funding-program-configs/${programId}/${chainID}/check-permission?${params.toString()}`
          );

          return {
            hasPermission: response.data.hasPermission,
            permissions: response.data.permissions || [],
            programs: []
          };
        } catch (error) {
          console.error("Error checking permission:", error);
          return {
            hasPermission: false,
            permissions: [],
            programs: []
          };
        }
      }

      // Get user's reviewer programs
      if (role === "reviewer") {
        try {
          const response = await apiClient.get<ReviewerProgramsResponse>(
            "/v2/funding-program-configs/my-reviewer-programs"
          );

          const programs = response.data.programs || [];

          return {
            hasPermission: programs.length > 0,
            permissions: ["read", "comment"],
            programs
          };
        } catch (error) {
          console.error("Error fetching reviewer programs:", error);
          return {
            hasPermission: false,
            permissions: [],
            programs: []
          };
        }
      }

      // Default: no permissions
      return {
        hasPermission: false,
        permissions: [],
        programs: []
      };
    },
    ...defaultQueryOptions,
    enabled: enabled && !!isAuth && !!address,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
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
 * @param chainID - The chain ID for the program
 *
 * @example
 * ```tsx
 * const { isReviewer, isLoading } = useIsReviewer('program123', 1);
 * if (isReviewer) {
 *   // Show reviewer-specific UI
 * }
 * ```
 */
export const useIsReviewer = (programId?: string, chainID?: number) => {
  const result = usePermissions({
    role: "reviewer",
    programId,
    chainID,
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