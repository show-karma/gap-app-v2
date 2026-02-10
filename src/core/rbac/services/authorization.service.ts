import { errorManager } from "@/components/Utilities/errorManager";
import fetchData from "@/utilities/fetchData";
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
  isCommunityAdmin: false,
  isProgramAdmin: false,
  isReviewer: false,
  isRegistryAdmin: false,
  isProgramCreator: false,
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
    };
  },
};
