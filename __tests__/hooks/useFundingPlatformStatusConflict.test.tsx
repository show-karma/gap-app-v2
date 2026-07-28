/**
 * Status-update conflict handling for the funding-platform mutations
 * (Sentry GAP-INDEXER-Y5). A reviewer whose tab still shows stale actions gets
 * a 409 from the backend; every mutation must re-sync its caches on failure and
 * surface exactly one conflict toast so the dead buttons disappear.
 */

import { waitFor } from "@testing-library/react";
import { createTestQueryClient, renderHookWithProviders } from "@/__tests__/utils/render";
import { STATUS_CONFLICT_MESSAGE } from "@/utilities/application-status";

const mockUpdateApplicationStatus = vi.fn();
const mockGetApplication = vi.fn();
const mockGetApplicationsByProgram = vi.fn();
const mockGetApplicationStatistics = vi.fn();
const mockToastError = vi.fn();

vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: vi.fn(),
  },
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: vi.fn(),
  },
}));

vi.mock("@/services/fundingPlatformService", () => {
  const applications = {
    updateApplicationStatus: (...args: unknown[]) => mockUpdateApplicationStatus(...args),
    getApplication: (...args: unknown[]) => mockGetApplication(...args),
    getApplicationsByProgram: (...args: unknown[]) => mockGetApplicationsByProgram(...args),
    getApplicationStatistics: (...args: unknown[]) => mockGetApplicationStatistics(...args),
  };
  return {
    fundingApplicationsAPI: applications,
    fundingPlatformService: { applications, programs: {} },
  };
});

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ authenticated: true, address: "0xreviewer" }),
}));

import {
  useApplicationStatus,
  useApplicationStatusV2,
  useFundingApplication,
  useFundingApplications,
} from "@/hooks/useFundingPlatform";

const PROGRAM_ID = "prog-1";
const APPLICATION_ID = "APP-001";

const conflictError = () => ({
  response: {
    status: 409,
    data: { message: "Invalid status transition from 'approved' to 'approved'." },
  },
});

const serverError = () => ({
  response: { status: 500, data: { message: "Something exploded" } },
});

const emptyPage = {
  applications: [],
  pagination: { page: 1, limit: 25, total: 0, totalPages: 1 },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetApplication.mockResolvedValue({ id: APPLICATION_ID, status: "approved" });
  mockGetApplicationsByProgram.mockResolvedValue(emptyPage);
  mockGetApplicationStatistics.mockResolvedValue({});
});

describe("useApplicationStatus", () => {
  it("should_invalidate_application_and_list_caches_when_the_update_conflicts", async () => {
    mockUpdateApplicationStatus.mockRejectedValue(conflictError());
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHookWithProviders(() => useApplicationStatus(PROGRAM_ID), {
      queryClient,
    });

    await expect(
      result.current.updateStatusAsync({ applicationId: APPLICATION_ID, status: "approved" })
    ).rejects.toBeTruthy();

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["funding-application", APPLICATION_ID],
      });
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["applications", PROGRAM_ID, { limit: 25 }],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["reviewer-inbox"] });
  });

  it("should_show_a_single_conflict_toast_when_the_backend_returns_409", async () => {
    mockUpdateApplicationStatus.mockRejectedValue(conflictError());

    const { result } = renderHookWithProviders(() => useApplicationStatus(PROGRAM_ID));

    await expect(
      result.current.updateStatusAsync({ applicationId: APPLICATION_ID, status: "approved" })
    ).rejects.toBeTruthy();

    await waitFor(() => expect(mockToastError).toHaveBeenCalledTimes(1));
    expect(mockToastError).toHaveBeenCalledWith(STATUS_CONFLICT_MESSAGE);
  });

  it("should_show_the_backend_message_when_the_failure_is_not_a_conflict", async () => {
    mockUpdateApplicationStatus.mockRejectedValue(serverError());

    const { result } = renderHookWithProviders(() => useApplicationStatus(PROGRAM_ID));

    await expect(
      result.current.updateStatusAsync({ applicationId: APPLICATION_ID, status: "approved" })
    ).rejects.toBeTruthy();

    await waitFor(() => expect(mockToastError).toHaveBeenCalledTimes(1));
    expect(mockToastError).toHaveBeenCalledWith("Something exploded");
  });
});

describe("useFundingApplications", () => {
  it("should_invalidate_the_list_and_stats_when_the_update_conflicts", async () => {
    mockUpdateApplicationStatus.mockRejectedValue(conflictError());
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHookWithProviders(() => useFundingApplications(PROGRAM_ID), {
      queryClient,
    });

    await expect(
      result.current.updateApplicationStatus({
        applicationId: APPLICATION_ID,
        status: "approved",
      })
    ).rejects.toBeTruthy();

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["applications", PROGRAM_ID, { limit: 25 }],
      });
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["application-stats", PROGRAM_ID],
    });
    expect(mockToastError).toHaveBeenCalledTimes(1);
    expect(mockToastError).toHaveBeenCalledWith(STATUS_CONFLICT_MESSAGE);
  });
});

describe("useFundingApplication", () => {
  it("should_invalidate_the_application_cache_when_the_update_conflicts", async () => {
    mockUpdateApplicationStatus.mockRejectedValue(conflictError());
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHookWithProviders(() => useFundingApplication(APPLICATION_ID), {
      queryClient,
    });

    result.current.updateStatus({ status: "approved" });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["funding-application", APPLICATION_ID],
      });
    });
    expect(mockToastError).toHaveBeenCalledTimes(1);
    expect(mockToastError).toHaveBeenCalledWith(STATUS_CONFLICT_MESSAGE);
  });
});

describe("useApplicationStatusV2", () => {
  it("should_invalidate_the_application_and_all_lists_when_the_update_conflicts", async () => {
    mockUpdateApplicationStatus.mockRejectedValue(conflictError());
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHookWithProviders(() => useApplicationStatusV2(APPLICATION_ID), {
      queryClient,
    });

    result.current.updateStatus(APPLICATION_ID, "approved", "");

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["funding-application", APPLICATION_ID],
      });
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["applications"] });
    expect(mockToastError).toHaveBeenCalledTimes(1);
    expect(mockToastError).toHaveBeenCalledWith(STATUS_CONFLICT_MESSAGE);
  });
});
