/**
 * Status-conflict handling on the application detail view (Sentry
 * GAP-INDEXER-Y5). The inline status form must not stay open after a 409, and
 * opening it re-reads the application so a stale Approve button can't fire a
 * transition the backend already rejected.
 */

import { act, waitFor } from "@testing-library/react";
import { renderHookWithProviders } from "@/__tests__/utils/render";
import { STATUS_CONFLICT_MESSAGE, STATUS_CONFLICT_TOAST_ID } from "@/utilities/application-status";

const mockToastError = vi.fn();
const mockUpdateStatusAsync = vi.fn();
const mockRefetchApplication = vi.fn();

let mockApplication: { id: string; referenceNumber: string; status: string } | undefined;
let mockIsUpdatingStatus = false;

vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ address: "0xreviewer" }),
}));

vi.mock("@/hooks/useBackNavigation", () => ({
  useBackNavigation: () => vi.fn(),
}));

vi.mock("@/hooks/useFundingPlatform", () => ({
  useApplication: () => ({
    application: mockApplication,
    isLoading: false,
    refetch: mockRefetchApplication,
  }),
  useApplicationComments: () => ({
    comments: [],
    isLoading: false,
    createCommentAsync: vi.fn(),
    editCommentAsync: vi.fn(),
    deleteCommentAsync: vi.fn(),
    refetch: vi.fn(),
  }),
  useApplicationStatus: () => ({
    updateStatusAsync: mockUpdateStatusAsync,
    isUpdating: mockIsUpdatingStatus,
  }),
  useApplicationVersions: () => ({ versions: [], refetch: vi.fn() }),
  useDeleteApplication: () => ({ deleteApplicationAsync: vi.fn(), isDeleting: false }),
  useProgramConfig: () => ({ data: undefined, config: undefined }),
}));

vi.mock("@/hooks/useKycStatus", () => ({
  useKycStatus: () => ({ status: undefined }),
  useKycConfig: () => ({ isEnabled: false }),
}));

vi.mock("@/src/core/rbac", async () => {
  const actual = await vi.importActual<typeof import("@/src/core/rbac")>("@/src/core/rbac");
  return {
    ...actual,
    useIsFundingPlatformAdmin: () => true,
    useIsFundingPlatformReviewer: () => false,
  };
});

vi.mock("@/src/core/rbac/context/permission-context", () => ({
  usePermissionContext: () => ({ isLoading: false, can: () => true }),
}));

vi.mock("@/src/features/applications/hooks/use-milestones-admin-refetch", () => ({
  useMilestonesAdminRefetch: () => undefined,
}));

vi.mock("@/store/applicationVersions", () => ({
  useApplicationVersionsStore: () => ({ selectVersion: vi.fn() }),
}));

import { useApplicationDetailView } from "@/components/FundingPlatform/ApplicationView/useApplicationDetailView";

const renderDetailView = () =>
  renderHookWithProviders(() =>
    useApplicationDetailView({
      applicationId: "APP-001",
      programId: "prog-1",
      combinedProgramId: "prog-1_42161",
      communityId: "octant",
    })
  );

const conflictError = () => ({
  response: {
    status: 409,
    data: { message: "Invalid status transition from 'approved' to 'approved'." },
  },
});

// Same 409, different cause: the reviewer can fix this one in the open form.
const currencyMismatchError = () => ({
  response: {
    status: 409,
    data: {
      message: "Currency mismatch: Approved currency 'USDC' does not match program currency 'ETH'.",
    },
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  mockIsUpdatingStatus = false;
  mockApplication = { id: "app-1", referenceNumber: "APP-001", status: "under_review" };
  mockRefetchApplication.mockResolvedValue({ data: mockApplication });
  mockUpdateStatusAsync.mockResolvedValue(undefined);
});

describe("useApplicationDetailView status conflict", () => {
  it("should_close_the_inline_form_without_a_second_toast_when_the_update_returns_409", async () => {
    mockUpdateStatusAsync.mockRejectedValue(conflictError());
    const { result } = renderDetailView();

    await act(async () => {
      await result.current.handleStatusChangeClick("approved");
    });
    expect(result.current.selectedStatus).toBe("approved");

    await act(async () => {
      await result.current.handleStatusChangeConfirm();
    });

    await waitFor(() => expect(result.current.selectedStatus).toBeNull());
    // The mutation hook owns the failure toast — the view must not add a second one.
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it("should_keep_the_inline_form_open_when_the_failure_is_not_a_conflict", async () => {
    mockUpdateStatusAsync.mockRejectedValue({ response: { status: 500 } });
    const { result } = renderDetailView();

    await act(async () => {
      await result.current.handleStatusChangeClick("approved");
    });
    await act(async () => {
      await result.current.handleStatusChangeConfirm();
    });

    expect(result.current.selectedStatus).toBe("approved");
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it("should_keep_the_inline_form_open_when_a_409_is_a_correctable_validation_error", async () => {
    mockUpdateStatusAsync.mockRejectedValue(currencyMismatchError());
    const { result } = renderDetailView();

    await act(async () => {
      await result.current.handleStatusChangeClick("approved");
    });
    await act(async () => {
      await result.current.handleStatusChangeConfirm(undefined, "100", "USDC");
    });

    // The entered amount/currency must survive so the reviewer can correct them.
    expect(result.current.selectedStatus).toBe("approved");
  });

  it("should_not_open_the_form_when_the_refetched_status_no_longer_allows_the_transition", async () => {
    mockRefetchApplication.mockResolvedValue({
      data: { ...mockApplication, status: "approved" },
    });
    const { result } = renderDetailView();

    await act(async () => {
      await result.current.handleStatusChangeClick("approved");
    });

    expect(result.current.selectedStatus).toBeNull();
    expect(mockToastError).toHaveBeenCalledTimes(1);
    expect(mockToastError).toHaveBeenCalledWith(STATUS_CONFLICT_MESSAGE, {
      id: STATUS_CONFLICT_TOAST_ID,
    });
    expect(mockUpdateStatusAsync).not.toHaveBeenCalled();
  });

  it("should_report_the_actions_as_busy_while_the_pre_flight_read_is_in_flight", async () => {
    let resolveRefetch: (value: { data: typeof mockApplication }) => void = () => undefined;
    mockRefetchApplication.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRefetch = resolve;
        })
    );
    const { result } = renderDetailView();

    let pending: Promise<void> = Promise.resolve();
    await act(async () => {
      pending = result.current.handleStatusChangeClick("approved");
    });

    expect(result.current.isUpdatingStatus).toBe(true);

    await act(async () => {
      resolveRefetch({ data: mockApplication });
      await pending;
    });

    expect(result.current.isUpdatingStatus).toBe(false);
    expect(result.current.selectedStatus).toBe("approved");
  });

  it("should_issue_a_single_pre_flight_read_when_the_action_is_double_clicked", async () => {
    let resolveRefetch: (value: { data: typeof mockApplication }) => void = () => undefined;
    mockRefetchApplication.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRefetch = resolve;
        })
    );
    const { result } = renderDetailView();

    let first: Promise<void> = Promise.resolve();
    let second: Promise<void> = Promise.resolve();
    await act(async () => {
      first = result.current.handleStatusChangeClick("approved");
      second = result.current.handleStatusChangeClick("approved");
    });

    await act(async () => {
      resolveRefetch({ data: { ...mockApplication, status: "approved" } });
      await Promise.all([first, second]);
    });

    expect(mockRefetchApplication).toHaveBeenCalledTimes(1);
    expect(mockToastError).toHaveBeenCalledTimes(1);
  });

  it("should_ignore_a_confirm_that_arrives_while_an_update_is_in_flight", async () => {
    mockIsUpdatingStatus = true;
    const { result } = renderDetailView();

    await act(async () => {
      await result.current.handleStatusChangeClick("approved");
    });
    await act(async () => {
      await result.current.handleStatusChangeConfirm();
    });

    expect(result.current.selectedStatus).toBe("approved");
    expect(mockUpdateStatusAsync).not.toHaveBeenCalled();
  });
});
