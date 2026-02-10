import { useReviewerBridge } from "../hooks/use-reviewer-bridge";
import { ReviewerType, Role, type UserRoles } from "../types";

// Track the mock return value so tests can change it
const mockContextValue = {
  isReviewer: false,
  roles: {
    primaryRole: Role.GUEST,
    roles: [Role.GUEST],
    reviewerTypes: [],
  } as UserRoles,
  isLoading: false,
};

jest.mock("../context/permission-context", () => ({
  usePermissionContext: () => mockContextValue,
}));

import { renderHook } from "@testing-library/react";

describe("useReviewerBridge", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockContextValue.isReviewer = false;
    mockContextValue.isLoading = false;
    mockContextValue.roles = {
      primaryRole: Role.GUEST,
      roles: [Role.GUEST],
      reviewerTypes: [],
    };
  });

  it("should return isReviewer=true when user is a reviewer", () => {
    mockContextValue.isReviewer = true;
    mockContextValue.roles = {
      primaryRole: Role.PROGRAM_REVIEWER,
      roles: [Role.PROGRAM_REVIEWER],
      reviewerTypes: [ReviewerType.PROGRAM],
    };

    const { result } = renderHook(() => useReviewerBridge());

    expect(result.current.isReviewer).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it("should return isReviewer=false when user is not a reviewer", () => {
    mockContextValue.isReviewer = false;
    mockContextValue.roles = {
      primaryRole: Role.APPLICANT,
      roles: [Role.APPLICANT],
      reviewerTypes: [],
    };

    const { result } = renderHook(() => useReviewerBridge());

    expect(result.current.isReviewer).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it("should return correct reviewer types for PROGRAM reviewer", () => {
    mockContextValue.isReviewer = true;
    mockContextValue.roles = {
      primaryRole: Role.PROGRAM_REVIEWER,
      roles: [Role.PROGRAM_REVIEWER],
      reviewerTypes: [ReviewerType.PROGRAM],
    };

    const { result } = renderHook(() => useReviewerBridge());

    expect(result.current.reviewerTypes).toEqual([ReviewerType.PROGRAM]);
  });

  it("should return correct reviewer types for MILESTONE reviewer", () => {
    mockContextValue.isReviewer = true;
    mockContextValue.roles = {
      primaryRole: Role.MILESTONE_REVIEWER,
      roles: [Role.MILESTONE_REVIEWER],
      reviewerTypes: [ReviewerType.MILESTONE],
    };

    const { result } = renderHook(() => useReviewerBridge());

    expect(result.current.reviewerTypes).toEqual([ReviewerType.MILESTONE]);
  });

  it("should return both reviewer types when user has dual reviewer role", () => {
    mockContextValue.isReviewer = true;
    mockContextValue.roles = {
      primaryRole: Role.PROGRAM_REVIEWER,
      roles: [Role.PROGRAM_REVIEWER, Role.MILESTONE_REVIEWER],
      reviewerTypes: [ReviewerType.PROGRAM, ReviewerType.MILESTONE],
    };

    const { result } = renderHook(() => useReviewerBridge());

    expect(result.current.reviewerTypes).toEqual([ReviewerType.PROGRAM, ReviewerType.MILESTONE]);
  });

  it("should return empty reviewer types when user is not a reviewer", () => {
    mockContextValue.isReviewer = false;
    mockContextValue.roles = {
      primaryRole: Role.GUEST,
      roles: [Role.GUEST],
      reviewerTypes: [],
    };

    const { result } = renderHook(() => useReviewerBridge());

    expect(result.current.reviewerTypes).toEqual([]);
  });

  it("should return empty reviewer types when reviewerTypes is undefined", () => {
    mockContextValue.isReviewer = false;
    mockContextValue.roles = {
      primaryRole: Role.GUEST,
      roles: [Role.GUEST],
    } as UserRoles;

    const { result } = renderHook(() => useReviewerBridge());

    expect(result.current.reviewerTypes).toEqual([]);
  });

  it("should reflect loading state from permission context", () => {
    mockContextValue.isLoading = true;

    const { result } = renderHook(() => useReviewerBridge());

    expect(result.current.isLoading).toBe(true);
  });
});
