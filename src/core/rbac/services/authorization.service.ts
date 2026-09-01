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
  isProjectMember?: boolean;
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
  isProjectMember: false,
};

/**
 * Hard deadline for a single permissions fetch.
 *
 * `/v2/auth/permissions` is a cheap authorization lookup that answers in
 * ~100ms in practice. It inherits the shared api client's 360s indexer
 * ceiling, which exists for long-poll endpoints (AI evaluation, bulk jobs,
 * report generation) and is meaningless here: a permissions request that
 * hasn't answered in 15s will not usefully answer at 360s, and every second
 * it stays in flight is a second every RBAC-gated surface renders a skeleton.
 */
export const PERMISSIONS_TIMEOUT_MS = 15_000;

/**
 * Transport ceiling handed to the api client. Deliberately LONGER than
 * {@link PERMISSIONS_TIMEOUT_MS} so the two timers cannot tie.
 *
 * Both bounds are armed against the same stalled request. Set to the same
 * value, axios' timer and ours fire in the same tick and `Promise.race`
 * picks a winner arbitrarily — which decides the error *type*, which decides
 * whether `usePermissionsQuery` retries. That coin flip is the difference
 * between a 15s failure and a ~48s one. Giving the transport headroom makes
 * our deadline deterministically first; the transport bound stays as a
 * backstop that releases the socket if the abort somehow doesn't.
 */
export const PERMISSIONS_TRANSPORT_TIMEOUT_MS = PERMISSIONS_TIMEOUT_MS + 5_000;

/** Raised when a permissions fetch blows {@link PERMISSIONS_TIMEOUT_MS}. */
export class PermissionsTimeoutError extends Error {
  readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`Permissions request did not complete within ${timeoutMs}ms`);
    this.name = "PermissionsTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

export function isPermissionsTimeoutError(error: unknown): error is PermissionsTimeoutError {
  return error instanceof PermissionsTimeoutError;
}

/**
 * Races the permissions request against a wall-clock deadline, aborting the
 * in-flight request when the deadline wins.
 *
 * The deadline is deliberately applied here rather than relying solely on the
 * transport timeout: `api.get` awaits `TokenManager.getToken()` *before* it
 * issues the XHR, so a stalled Privy token bootstrap would never reach axios'
 * timer. Racing the whole call guarantees the promise settles no matter which
 * stage stalls, which is what the React Query loading gate depends on.
 */
async function fetchPermissionsWithDeadline(
  params: GetPermissionsParams
): Promise<AuthPermissionsApiResponse | null> {
  const controller = new AbortController();
  let deadlineTimer: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;

  const deadline = new Promise<never>((_, reject) => {
    deadlineTimer = setTimeout(() => {
      timedOut = true;
      controller.abort();
      reject(new PermissionsTimeoutError(PERMISSIONS_TIMEOUT_MS));
    }, PERMISSIONS_TIMEOUT_MS);
  });

  // Once the deadline has fired the outcome IS a timeout: whatever the
  // transport reports afterwards (an abort, a socket error) is downstream of
  // our own cancellation and must not be mistaken for a distinct, retryable
  // failure. Normalising on the way out keeps the retry decision independent
  // of rejection ordering.
  try {
    return await Promise.race([
      // TODO(#1775): add zod schema
      api.get<AuthPermissionsApiResponse>(INDEXER.V2.AUTH.PERMISSIONS(params), {
        signal: controller.signal,
        timeoutMs: PERMISSIONS_TRANSPORT_TIMEOUT_MS,
      }),
      deadline,
    ]);
  } catch (error) {
    throw timedOut ? new PermissionsTimeoutError(PERMISSIONS_TIMEOUT_MS) : error;
  } finally {
    clearTimeout(deadlineTimer);
  }
}

/** Forwards a permissions failure to Sentry via the shared error reporter. */
function reportPermissionsFailure(error: unknown, params: GetPermissionsParams): void {
  errorManager("Failed to fetch user permissions", error, {
    context: "authorization.service.getPermissions",
    params,
  });
}

export const authorizationService = {
  async getPermissions(params: GetPermissionsParams = {}): Promise<PermissionsResponse> {
    let response: AuthPermissionsApiResponse | null;

    // Every failure is reported and rethrown — never swallowed into a default.
    // Rethrowing lets React Query retry transient failures and hold
    // isLoading=true while it does (see `usePermissionsQuery`; timeouts are
    // deliberately NOT retried). This previously returned
    // DEFAULT_GUEST_PERMISSIONS, which React Query cached as "success" for 5
    // minutes — a persistent "Access Denied" long after the API had recovered.
    try {
      response = await fetchPermissionsWithDeadline(params);
    } catch (error) {
      reportPermissionsFailure(error, params);
      throw error;
    }

    if (!response) {
      const emptyError = new Error("Failed to fetch permissions: empty response");
      reportPermissionsFailure(emptyError, params);
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
      isProjectMember: response.isProjectMember === true,
    };
  },
};
