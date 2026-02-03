import { errorManager } from "@/components/Utilities/errorManager";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import type { Permission, PermissionsResponse, ResourceContext, ReviewerType } from "../types";
import { isValidRole, Role } from "../types";

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
  isAdmin: boolean;
  isReviewer: boolean;
}

export interface GetPermissionsParams {
  communityId?: string;
  programId?: string;
  applicationId?: string;
  milestoneId?: string;
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
  isAdmin: false,
  isReviewer: false,
};

export const authorizationService = {
  async getPermissions(params: GetPermissionsParams = {}): Promise<PermissionsResponse> {
    const [response, error] = await fetchData<AuthPermissionsApiResponse>(
      INDEXER.V2.AUTH.PERMISSIONS(params)
    );

    if (error || !response) {
      if (error) {
        errorManager("Failed to fetch user permissions", error, {
          context: "authorization.service.getPermissions",
          params,
        });
      }
      return DEFAULT_GUEST_PERMISSIONS;
    }

    const primaryRole = isValidRole(response.roles.primaryRole)
      ? response.roles.primaryRole
      : Role.GUEST;
    const validRoles = response.roles.roles.filter(isValidRole);

    return {
      roles: {
        primaryRole,
        roles: validRoles.length > 0 ? validRoles : [Role.GUEST],
        reviewerTypes: (response.roles.reviewerTypes || []) as ReviewerType[],
      },
      permissions: response.permissions as Permission[],
      resourceContext: response.resourceContext as ResourceContext,
      isAdmin: response.isAdmin,
      isReviewer: response.isReviewer,
    };
  },
};
