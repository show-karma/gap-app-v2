import { api } from "@/utilities/api/client";
import { HttpError } from "@/utilities/api/errors";
import { createAuthenticatedApiClient } from "@/utilities/auth/api-client";
import { envVars } from "@/utilities/enviromentVars";
import { INDEXER } from "@/utilities/indexer";
import type { FundingProgram } from "./fundingPlatformService";

const API_URL = envVars.NEXT_PUBLIC_GAP_INDEXER_URL;

// Keep apiClient for batch POST operations
const apiClient = createAuthenticatedApiClient(API_URL, 30000);

/**
 * Extracts the same human-readable error message the legacy `fetchData`
 * adapter surfaced for an `HttpError`: prefer the server response body's
 * `message`, then the original axios error's message, then the client's
 * synthetic message. Falls back to a plain `Error.message` (or
 * `String(error)`) for non-HTTP `ApiError`s.
 */
function httpErrorMessage(error: unknown): string {
  if (error instanceof HttpError) {
    const bodyMessage = (error.body as { message?: string } | undefined)?.message;
    const causeMessage = (error.cause as { message?: string } | undefined)?.message;
    return bodyMessage || causeMessage || error.message;
  }
  return error instanceof Error ? error.message : String(error);
}

/**
 * Permission check options
 */
export interface PermissionCheckOptions {
  programId?: string;
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
    const { programId, action } = options;

    if (!programId) {
      throw new Error("Program ID is required for permission check");
    }

    let data: PermissionCheckResponse | null;
    try {
      // TODO(#1775): add zod schema
      data = await api.get<PermissionCheckResponse>(
        INDEXER.V2.FUNDING_PROGRAMS.CHECK_PERMISSION(programId, action)
      );
    } catch (error) {
      console.error("Permission API Error:", error);
      throw new Error(httpErrorMessage(error) || "Failed to check permission");
    }

    if (!data) {
      console.error("Permission API Error:", "empty response");
      throw new Error("Failed to check permission");
    }

    return data;
  }

  /**
   * Get user's permissions for a resource
   */
  async getUserPermissions(resource?: string): Promise<UserPermissionsResponse> {
    let data: UserPermissionsResponse | null;
    try {
      // TODO(#1775): add zod schema
      data = await api.get<UserPermissionsResponse>(INDEXER.V2.USER.PERMISSIONS(resource));
    } catch (error) {
      console.error("Permission API Error:", error);
      throw new Error(httpErrorMessage(error) || "Failed to get user permissions");
    }

    if (!data) {
      console.error("Permission API Error:", "empty response");
      throw new Error("Failed to get user permissions");
    }

    return data;
  }

  /**
   * Get programs where the user is a reviewer
   */
  async getReviewerPrograms(): Promise<FundingProgram[]> {
    let data: FundingProgram[] | null;
    try {
      // TODO(#1775): add zod schema
      data = await api.get<FundingProgram[]>(INDEXER.V2.FUNDING_PROGRAMS.MY_REVIEWER_PROGRAMS());
    } catch (error) {
      console.error("Permission API Error:", error);
      throw new Error(httpErrorMessage(error) || "Failed to get reviewer programs");
    }

    if (!data) {
      console.error("Permission API Error:", "empty response");
      throw new Error("Failed to get reviewer programs");
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
    programIds: Array<{ programId: string; action?: string }>
  ): Promise<Map<string, PermissionCheckResponse>> {
    const results = new Map<string, PermissionCheckResponse>();

    try {
      // Try batch endpoint first
      const response = await apiClient.post<{
        permissions: Array<{
          programId: string;
          hasPermission: boolean;
          permissions: string[];
        }>;
      }>("/v2/funding-program-configs/batch-check-permissions", {
        programs: programIds,
      });

      // Map results
      response.data.permissions.forEach((item) => {
        results.set(item.programId, {
          hasPermission: item.hasPermission,
          permissions: item.permissions,
        });
      });
    } catch (_error) {
      const promises = programIds.map(async ({ programId, action }) => {
        try {
          const result = await this.checkPermission({ programId, action });
          return { key: programId, result };
        } catch (err) {
          console.error(`Error checking permission for ${programId}:`, err);
          return {
            key: programId,
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
