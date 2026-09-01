/**
 * Unit tests for useMilestoneSubmissionAuthority.
 *
 * Being the APPLICANT is an off-chain funding-platform role; the indexer
 * authorizes the resulting on-chain attestation against PROJECT authority
 * (owner / MemberOf / on-chain admin, resolved server-side across linked
 * wallets). Both signals are required or the grantee pays gas for a write the
 * indexer silently discards — so the hook must fail closed on every
 * undecided/unresolvable path.
 *
 * usePermissionsQuery is mocked so the React Query states (pending,
 * placeholder, error-with-retained-data) can be simulated directly.
 */

import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUsePermissionsQuery = vi.fn();

vi.mock("@/src/core/rbac/hooks/use-permissions", () => ({
  usePermissionsQuery: (...args: unknown[]) => mockUsePermissionsQuery(...args),
}));

import { useMilestoneSubmissionAuthority } from "../use-milestone-submission-authority";

const PROJECT_UID = "0xproject1";

function mockQueryState(
  overrides: {
    data?: Record<string, boolean> | null;
    isPending?: boolean;
    isPlaceholderData?: boolean;
    isError?: boolean;
    refetch?: () => void;
  } = {}
) {
  const refetch = overrides.refetch ?? vi.fn();
  mockUsePermissionsQuery.mockReturnValue({
    data: null,
    isPending: false,
    isPlaceholderData: false,
    isError: false,
    ...overrides,
    refetch,
  });
  return refetch;
}

// `{ projectUID: undefined }` would hit destructuring defaults — the
// hasLinkedProject flag sidesteps that trap, mirroring the component tests.
function renderAuthority({ isApplicant = true, hasLinkedProject = true } = {}) {
  return renderHook(() =>
    useMilestoneSubmissionAuthority({
      isApplicant,
      projectUID: hasLinkedProject ? PROJECT_UID : undefined,
    })
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useMilestoneSubmissionAuthority query wiring", () => {
  it("should_enable_the_permissions_query_scoped_to_the_project_when_applicant_has_linked_project", () => {
    mockQueryState({ isPending: true });

    renderAuthority();

    expect(mockUsePermissionsQuery).toHaveBeenCalledWith(
      { projectId: PROJECT_UID },
      { enabled: true }
    );
  });

  it("should_disable_the_permissions_query_when_viewer_is_not_the_applicant", () => {
    mockQueryState();

    renderAuthority({ isApplicant: false });

    expect(mockUsePermissionsQuery).toHaveBeenCalledWith(
      { projectId: PROJECT_UID },
      { enabled: false }
    );
  });

  it("should_disable_the_permissions_query_when_application_has_no_linked_project", () => {
    mockQueryState({ isPending: true });

    renderAuthority({ hasLinkedProject: false });

    expect(mockUsePermissionsQuery).toHaveBeenCalledWith(
      { projectId: undefined },
      { enabled: false }
    );
  });
});

describe("useMilestoneSubmissionAuthority non-applicants", () => {
  it("should_report_not_applicant_when_viewer_is_not_the_applicant", () => {
    mockQueryState();

    const { result } = renderAuthority({ isApplicant: false });

    expect(result.current).toEqual({ status: "not-applicant" });
  });

  it("should_never_report_denied_or_unverified_for_non_applicants_even_when_the_lookup_errors", () => {
    // Non-applicants never had the affordance; a denial/unverified notice
    // would be noise for them.
    mockQueryState({ isError: true });

    const { result } = renderAuthority({ isApplicant: false });

    expect(result.current.status).toBe("not-applicant");
  });
});

describe("useMilestoneSubmissionAuthority resolving", () => {
  it("should_report_resolving_while_the_lookup_is_pending", () => {
    mockQueryState({ isPending: true });

    const { result } = renderAuthority();

    expect(result.current.status).toBe("resolving");
  });

  it("should_report_resolving_while_serving_placeholder_permissions_from_a_previous_project", () => {
    // `placeholderData: keepPreviousData` serves the PRIOR project's resolved
    // permissions under status "success" — trusting it would flash the submit
    // affordance for a project the applicant has no authority on.
    mockQueryState({
      data: { isProjectOwner: true, isProjectAdmin: true, isProjectMember: true },
      isPlaceholderData: true,
    });

    const { result } = renderAuthority();

    expect(result.current.status).toBe("resolving");
  });
});

describe("useMilestoneSubmissionAuthority resolved outcomes", () => {
  it.each([
    ["owner", { isProjectOwner: true, isProjectAdmin: false, isProjectMember: false }],
    ["admin", { isProjectAdmin: true, isProjectOwner: false, isProjectMember: false }],
    ["member", { isProjectMember: true, isProjectOwner: false, isProjectAdmin: false }],
  ])("should_report_authorized_when_applicant_is_project_%s", (_arm, permissions) => {
    // Any single arm suffices — the indexer's validator accepts MemberOf
    // alone, so the UI must not demand owner/admin.
    mockQueryState({ data: permissions });

    const { result } = renderAuthority();

    expect(result.current).toEqual({ status: "authorized" });
  });

  it("should_report_denied_when_applicant_holds_no_project_authority", () => {
    mockQueryState({
      data: { isProjectOwner: false, isProjectAdmin: false, isProjectMember: false },
    });

    const { result } = renderAuthority();

    expect(result.current).toEqual({ status: "denied" });
  });
});

describe("useMilestoneSubmissionAuthority unverified", () => {
  it("should_report_unverified_not_denied_when_application_has_no_linked_project", () => {
    // Disabled v5 query reports isPending=true forever — unknowable authority
    // must read as unverified, never as "still loading" or a denial.
    mockQueryState({ isPending: true });

    const { result } = renderAuthority({ hasLinkedProject: false });

    expect(result.current.status).toBe("unverified");
  });

  it("should_report_unverified_when_the_lookup_errors", () => {
    mockQueryState({ isError: true });

    const { result } = renderAuthority();

    expect(result.current.status).toBe("unverified");
  });

  it("should_report_unverified_when_a_refetch_fails_even_with_retained_last_good_permissions", () => {
    // Regression (CodeRabbit Major): on a background refetch failure React
    // Query keeps the last-good `data` alongside isError=true. Authority must
    // not read as authorized off stale permissions.
    mockQueryState({
      data: { isProjectOwner: true, isProjectAdmin: true, isProjectMember: true },
      isError: true,
    });

    const { result } = renderAuthority();

    expect(result.current.status).toBe("unverified");
  });

  it("should_expose_a_retry_wired_to_the_permissions_refetch", () => {
    const refetch = vi.fn();
    mockQueryState({ isError: true, refetch });

    const { result } = renderAuthority();

    expect(result.current.status).toBe("unverified");
    if (result.current.status === "unverified") {
      result.current.retry();
    }
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
