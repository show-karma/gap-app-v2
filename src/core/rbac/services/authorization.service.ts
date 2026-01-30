import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import type {
  Permission,
  PermissionsResponse,
  ResourceContext,
  ReviewerType,
  Role,
} from "../types";

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

export const authorizationService = {
  async getPermissions(params: GetPermissionsParams = {}): Promise<PermissionsResponse> {
    const [response, error] = await fetchData<AuthPermissionsApiResponse>(
      INDEXER.V2.AUTH.PERMISSIONS(params)
    );

    if (error || !response) {
      return {
        roles: {
          primaryRole: "GUEST" as Role,
          roles: ["GUEST" as Role],
          reviewerTypes: [],
        },
        permissions: [],
        resourceContext: {},
      };
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
