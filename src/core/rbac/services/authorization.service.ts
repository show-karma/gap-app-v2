import { errorManager } from "@/components/Utilities/errorManager";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import type { Permission, PermissionsResponse, ResourceContext, ReviewerType } from "../types";
import { Role } from "../types";

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
};

export const authorizationService = {
  async getPermissions(params: GetPermissionsParams = {}): Promise<PermissionsResponse> {
    const [response, error] = await fetchData<AuthPermissionsApiResponse>(
      INDEXER.V2.AUTH.PERMISSIONS(params)
    );

    if (error || !response) {
      // Log error for monitoring but don't show intrusive UI
      // Users will still have guest access, just with limited permissions
      if (error) {
        errorManager("Failed to fetch user permissions", error, {
          context: "authorization.service.getPermissions",
          params,
        });
      }
      return DEFAULT_GUEST_PERMISSIONS;
    }

    return {
      roles: {
        primaryRole: response.roles.primaryRole as Role,
        roles: response.roles.roles as Role[],
        reviewerTypes: (response.roles.reviewerTypes || []) as ReviewerType[],
      },
      permissions: response.permissions as Permission[],
      resourceContext: response.resourceContext as ResourceContext,
    };
  },
};
