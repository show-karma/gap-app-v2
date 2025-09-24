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

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("Permission API Error:", error.response?.data || error.message);
    throw error;
  }
);

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
export const permissionsService = {
  /**
   * Check if a user has permission for a specific action
   */
  async checkPermission(options: PermissionCheckOptions): Promise<PermissionCheckResponse> {
    const { programId, chainID, action } = options;

    if (!programId || !chainID) {
      throw new Error("Program ID and Chain ID are required for permission check");
    }

    const params = new URLSearchParams();
    if (action) {
      params.append("action", action);
    }

    const response = await apiClient.get<PermissionCheckResponse>(
      `/v2/funding-program-configs/${programId}/${chainID}/check-permission?${params.toString()}`
    );

    return response.data;
  },

  /**
   * Get user's permissions for a resource
   */
  async getUserPermissions(resource?: string): Promise<UserPermissionsResponse> {
    const params = new URLSearchParams();
    if (resource) {
      params.append("resource", resource);
    }

    const response = await apiClient.get<UserPermissionsResponse>(
      `/v2/user/permissions?${params.toString()}`
    );

    return response.data;
  },

  /**
   * Get programs where the user is a reviewer
   */
  async getReviewerPrograms(): Promise<{ programs: ReviewerProgram[] }> {
    const response = await apiClient.get<{ programs: ReviewerProgram[] }>(
      "/v2/funding-program-configs/my-reviewer-programs"
    );

    return response.data;
  },

  /**
   * Check if user has a specific role
   */
  async hasRole(role: string, resource?: string): Promise<boolean> {
    if (role === "reviewer" && !resource) {
      // Check if user has any reviewer programs
      const { programs } = await this.getReviewerPrograms();
      return programs.length > 0;
    }

    if (resource) {
      // Check specific resource permission
      const permissions = await this.getUserPermissions(resource);
      return permissions.permissions.some(p => p.role === role && p.resource === resource);
    }

    return false;
  },

  /**
   * Check if user can perform an action on a resource
   */
  async canPerformAction(resource: string, action: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(resource);
    const resourcePermissions = permissions.permissions.find(p => p.resource === resource);
    return resourcePermissions?.actions.includes(action) ?? false;
  },

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
        }>
      }>("/v2/funding-program-configs/batch-check-permissions", {
        programs: programIds
      });

      // Map results
      response.data.permissions.forEach(item => {
        const key = `${item.programId}-${item.chainID}`;
        results.set(key, {
          hasPermission: item.hasPermission,
          permissions: item.permissions
        });
      });
    } catch (error) {
      // Fall back to parallel calls if batch endpoint doesn't exist
      console.log("Batch endpoint not available, falling back to parallel calls");

      const promises = programIds.map(async ({ programId, chainID, action }) => {
        try {
          const result = await this.checkPermission({ programId, chainID, action });
          return { key: `${programId}-${chainID}`, result };
        } catch (err) {
          console.error(`Error checking permission for ${programId}-${chainID}:`, err);
          return {
            key: `${programId}-${chainID}`,
            result: { hasPermission: false, permissions: [] }
          };
        }
      });

      const responses = await Promise.allSettled(promises);
      responses.forEach(response => {
        if (response.status === 'fulfilled' && response.value) {
          results.set(response.value.key, response.value.result);
        }
      });
    }

    return results;
  },

  /**
   * Cache for permission results to avoid duplicate calls
   */
  _permissionCache: new Map<string, { data: PermissionCheckResponse; timestamp: number }>(),

  /**
   * Get cached permission or fetch if not available
   */
  async getCachedPermission(options: PermissionCheckOptions): Promise<PermissionCheckResponse> {
    const cacheKey = `${options.programId}-${options.chainID}-${options.action || ''}`;
    const cached = this._permissionCache.get(cacheKey);

    // Check if cache is valid (5 minutes)
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      return cached.data;
    }

    // Fetch new data
    const result = await this.checkPermission(options);

    // Update cache
    this._permissionCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    return result;
  }
};