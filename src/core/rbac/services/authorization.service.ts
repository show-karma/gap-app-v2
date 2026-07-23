import { errorManager } from "@/components/Utilities/errorManager";
import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";
import type { PermissionsResponse, ResourceContext } from "../types";
import { isValidPermission, isValidReviewerType, isValidRole, Role } from "../types";

interface AuthPermissionsApiResponse {
  roles: {
    primaryRole: string;
    roles: string[];
    reviewerTypes?: string[];
  };
  permissions: string[];
  resourceContext: {
    communityId?: string;
    programId?: string;
    applicationId?: string;
    milestoneId?: string;
  };
  isCommunityAdmin: boolean;
  isProgramAdmin: boolean;
  isReviewer: boolean;
  isRegistryAdmin: boolean;
  isProgramCreator: boolean;
  isProjectOwner?: boolean;
  isProjectAdmin?: boolean;
}

export interface GetPermissionsParams {
  communityId?: string;
  programId?: string;
  applicationId?: string;
  milestoneId?: string;
  projectId?: string;
  chainId?: number;
}

const DEFAULT_GUEST_PERMISSIONS: PermissionsResponse = {
  roles: {
    primaryRole: Role.GUEST,
    roles: [Role.GUEST],
    reviewerTypes: [],
  },
  permissions: [],
  resourceContext: {},
  isCommunityAdmin: false,
  isProgramAdmin: false,
  isReviewer: false,
  isRegistryAdmin: false,
  isProgramCreator: false,
  isProjectOwner: false,
  isProjectAdmin: false,
};

export const authorizationService = {
  async getPermissions(params: GetPermissionsParams = {}): Promise<PermissionsResponse> {
    let response: AuthPermissionsApiResponse | null;
    try {
      // TODO(#1775): add zod schema
      response = await api.get<AuthPermissionsApiResponse>(INDEXER.V2.AUTH.PERMISSIONS(params));
    } catch (error) {
      errorManager("Failed to fetch user permissions", error, {
        context: "authorization.service.getPermissions",
        params,
      });
      // Throw so React Query retries (up to 2x) and keeps isLoading=true during retries.
      // Previously returned DEFAULT_GUEST_PERMISSIONS, which React Query cached as "success"
      // for 5 minutes — causing persistent "Access Denied" even after the API recovered.
      throw error;
    }

    if (!response) {
      const emptyError = new Error("Failed to fetch permissions: empty response");
      errorManager("Failed to fetch user permissions", emptyError, {
        context: "authorization.service.getPermissions",
        params,
      });
      throw emptyError;
    }

    const primaryRole = isValidRole(response.roles.primaryRole)
      ? response.roles.primaryRole
      : Role.GUEST;
    const validRoles = response.roles.roles.filter(isValidRole);

    const validReviewerTypes = (response.roles.reviewerTypes || []).filter(isValidReviewerType);
    const validPermissions = response.permissions.filter(isValidPermission);

    return {
      roles: {
        primaryRole,
        roles: validRoles.length > 0 ? validRoles : [Role.GUEST],
        reviewerTypes: validReviewerTypes,
      },
      permissions: validPermissions,
      resourceContext: response.resourceContext as ResourceContext,
      isCommunityAdmin: response.isCommunityAdmin === true,
      isProgramAdmin: response.isProgramAdmin === true,
      isReviewer: response.isReviewer === true,
      isRegistryAdmin: response.isRegistryAdmin === true,
      isProgramCreator: response.isProgramCreator === true,
      isProjectOwner: response.isProjectOwner === true,
      isProjectAdmin: response.isProjectAdmin === true,
    };
  },
};
