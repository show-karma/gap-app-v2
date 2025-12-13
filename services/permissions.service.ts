import { createAuthenticatedApiClient } from "@/utilities/auth/api-client";
import { envVars } from "@/utilities/enviromentVars";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import type { FundingProgram } from "./fundingPlatformService";

const API_URL = envVars.NEXT_PUBLIC_GAP_INDEXER_URL;

// Keep apiClient for batch POST operations
const apiClient = createAuthenticatedApiClient(API_URL, 30000);

/**
 * Permission check options
 */
export interface PermissionCheckOptions {
  programId?: string;
  chainID?: number;
  action?: string;
  role?: string;
}

/**
 * Permission check response
 */
export interface PermissionCheckResponse {
  hasPermission: boolean;
  permissions: string[];
}

/**
 * User permissions response
 */
export interface UserPermissionsResponse {
  permissions: Array<{
    resource: string;
    actions: string[];
    role?: string;
  }>;
}

/**
 * Reviewer program
 */
export interface ReviewerProgram {
  programId: string;
  chainID: number;
  name?: string;
  assignedAt: string;
  permissions: string[];
}

/**
 * Service for handling permission checks and role management
 */
export class PermissionsService {
  /**
   * Check if a user has permission for a specific action
   */
  async checkPermission(options: PermissionCheckOptions): Promise<PermissionCheckResponse> {
    const { programId, chainID, action } = options;

    if (!programId || !chainID) {
      throw new Error("Program ID and Chain ID are required for permission check");
    }

    const [data, error] = await fetchData<PermissionCheckResponse>(
      INDEXER.V2.FUNDING_PROGRAMS.CHECK_PERMISSION(programId, chainID, action)
    );

    if (error || !data) {
      console.error("Permission API Error:", error);
      throw new Error(error || "Failed to check permission");
    }

    return data;
  }

  /**
   * Get user's permissions for a resource
   */
  async getUserPermissions(resource?: string): Promise<UserPermissionsResponse> {
    const [data, error] = await fetchData<UserPermissionsResponse>(
      INDEXER.V2.USER.PERMISSIONS(resource)
    );

    if (error || !data) {
      console.error("Permission API Error:", error);
      throw new Error(error || "Failed to get user permissions");
    }

    return data;
  }

  /**
   * Get programs where the user is a reviewer
   */
  async getReviewerPrograms(): Promise<FundingProgram[]> {
    const [data, error] = await fetchData<FundingProgram[]>(
      INDEXER.V2.FUNDING_PROGRAMS.MY_REVIEWER_PROGRAMS()
    );

    if (error || !data) {
      console.error("Permission API Error:", error);
      throw new Error(error || "Failed to get reviewer programs");
    }

    return data;
  }

  /**
   * Check if user has a specific role
   */
  async hasRole(role: string, resource?: string): Promise<boolean> {
    if (role === "reviewer" && !resource) {
      // Check if user has any reviewer programs
      const programs = await this.getReviewerPrograms();
      return programs.length > 0;
    }

    if (resource) {
      // Check specific resource permission
      const permissions = await this.getUserPermissions(resource);
      return permissions.permissions.some((p) => p.role === role && p.resource === resource);
    }

    return false;
  }

  /**
   * Check if user can perform an action on a resource
   */
  async canPerformAction(resource: string, action: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(resource);
    const resourcePermissions = permissions.permissions.find((p) => p.resource === resource);
    return resourcePermissions?.actions.includes(action) ?? false;
  }

  /**
   * Batch check permissions for multiple programs
   * Falls back to parallel individual calls if batch endpoint doesn't exist
   */
  async checkMultiplePermissions(
    programIds: Array<{ programId: string; chainID: number; action?: string }>
  ): Promise<Map<string, PermissionCheckResponse>> {
    const results = new Map<string, PermissionCheckResponse>();

    try {
      // Try batch endpoint first
      const response = await apiClient.post<{
        permissions: Array<{
          programId: string;
          chainID: number;
          hasPermission: boolean;
          permissions: string[];
        }>;
      }>("/v2/funding-program-configs/batch-check-permissions", {
        programs: programIds,
      });

      // Map results
      response.data.permissions.forEach((item) => {
        const key = `${item.programId}-${item.chainID}`;
        results.set(key, {
          hasPermission: item.hasPermission,
          permissions: item.permissions,
        });
      });
    } catch (_error) {
      const promises = programIds.map(async ({ programId, chainID, action }) => {
        try {
          const result = await this.checkPermission({ programId, chainID, action });
          return { key: `${programId}-${chainID}`, result };
        } catch (err) {
          console.error(`Error checking permission for ${programId}-${chainID}:`, err);
          return {
            key: `${programId}-${chainID}`,
            result: { hasPermission: false, permissions: [] },
          };
        }
      });

      const responses = await Promise.allSettled(promises);
      responses.forEach((response) => {
        if (response.status === "fulfilled" && response.value) {
          results.set(response.value.key, response.value.result);
        }
      });
    }

    return results;
  }
}
