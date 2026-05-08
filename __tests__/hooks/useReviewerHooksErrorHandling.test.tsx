import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { useMilestoneReviewers } from "@/hooks/useMilestoneReviewers";
import { useProgramReviewers } from "@/hooks/useProgramReviewers";
import { milestoneReviewersService } from "@/services/milestone-reviewers.service";
import { programReviewersService } from "@/services/program-reviewers.service";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/services/program-reviewers.service", () => ({
  programReviewersService: {
    getReviewers: vi.fn(),
    addReviewer: vi.fn(),
    removeReviewer: vi.fn(),
    validateReviewerData: vi.fn(),
  },
}));

vi.mock("@/services/milestone-reviewers.service", () => ({
  milestoneReviewersService: {
    getReviewers: vi.fn(),
    addReviewer: vi.fn(),
    removeReviewer: vi.fn(),
    validateReviewerData: vi.fn(),
  },
}));

const mockUseAuth = useAuth as vi.MockedFunction<typeof useAuth>;
const mockToast = toast as vi.Mocked<typeof toast>;
const mockProgramReviewersService = programReviewersService as vi.Mocked<
  typeof programReviewersService
>;
const mockMilestoneReviewersService = milestoneReviewersService as vi.Mocked<
  typeof milestoneReviewersService
>;

describe("Reviewer hooks error handling", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.clearAllMocks();

    mockUseAuth.mockReturnValue({
      authenticated: true,
      ready: true,
    } as any);

    mockProgramReviewersService.getReviewers.mockResolvedValue([]);
    mockMilestoneReviewersService.getReviewers.mockResolvedValue([]);
    mockProgramReviewersService.validateReviewerData.mockReturnValue({
      valid: true,
      errors: [],
      sanitized: { name: "Program Reviewer", email: "program@example.com", telegram: undefined },
    });
    mockMilestoneReviewersService.validateReviewerData.mockReturnValue({
      valid: true,
      errors: [],
      sanitized: {
        name: "Milestone Reviewer",
        email: "milestone@example.com",
        telegram: undefined,
      },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("shows a specific message for program reviewer email conflicts (409)", async () => {
    const conflictError = {
      isAxiosError: true,
      message: "Request failed with status code 409",
      response: { status: 409, data: { message: "Conflict" } },
    };
    mockProgramReviewersService.addReviewer.mockRejectedValue(conflictError);

    const { result } = renderHook(() => useProgramReviewers("program-1"), { wrapper });

    await act(async () => {
      await expect(
        result.current.addReviewer({
          name: "Program Reviewer",
          email: "program@example.com",
        })
      ).rejects.toEqual(conflictError);
    });

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("A reviewer with this email already exists.");
    });
  });

  it("shows a specific message for milestone reviewer email conflicts (409)", async () => {
    const conflictError = {
      isAxiosError: true,
      message: "Request failed with status code 409",
      response: { status: 409, data: { message: "Conflict" } },
    };
    mockMilestoneReviewersService.addReviewer.mockRejectedValue(conflictError);

    const { result } = renderHook(() => useMilestoneReviewers("program-1"), { wrapper });

    await act(async () => {
      await expect(
        result.current.addReviewer({
          name: "Milestone Reviewer",
          email: "milestone@example.com",
        })
      ).rejects.toEqual(conflictError);
    });

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("A reviewer with this email already exists.");
    });
  });

  it("refetches program reviewers when addReviewer succeeds without a publicAddress", async () => {
    mockProgramReviewersService.addReviewer.mockResolvedValue({
      name: "Program Reviewer",
      email: "program@example.com",
      assignedAt: "2024-01-01T00:00:00Z",
    });
    mockProgramReviewersService.getReviewers.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        publicAddress: "0x1111111111111111111111111111111111111111",
        name: "Program Reviewer",
        email: "program@example.com",
        assignedAt: "2024-01-01T00:00:00Z",
      },
    ]);

    const { result } = renderHook(() => useProgramReviewers("program-1"), { wrapper });

    let addedReviewer: Awaited<ReturnType<typeof result.current.addReviewer>> | undefined;
    await act(async () => {
      addedReviewer = await result.current.addReviewer({
        name: "Program Reviewer",
        email: "program@example.com",
      });
    });

    expect(mockProgramReviewersService.getReviewers).toHaveBeenCalledTimes(3);
    expect(addedReviewer).toMatchObject({
      publicAddress: "0x1111111111111111111111111111111111111111",
      email: "program@example.com",
    });
  });

  it("refetches milestone reviewers when addReviewer succeeds without a publicAddress", async () => {
    mockMilestoneReviewersService.addReviewer.mockResolvedValue({
      name: "Milestone Reviewer",
      email: "milestone@example.com",
      assignedAt: "2024-01-01T00:00:00Z",
    });
    mockMilestoneReviewersService.getReviewers.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        publicAddress: "0x2222222222222222222222222222222222222222",
        name: "Milestone Reviewer",
        email: "milestone@example.com",
        assignedAt: "2024-01-01T00:00:00Z",
      },
    ]);

    const { result } = renderHook(() => useMilestoneReviewers("program-1"), { wrapper });

    let addedReviewer: Awaited<ReturnType<typeof result.current.addReviewer>> | undefined;
    await act(async () => {
      addedReviewer = await result.current.addReviewer({
        name: "Milestone Reviewer",
        email: "milestone@example.com",
      });
    });

    expect(mockMilestoneReviewersService.getReviewers).toHaveBeenCalledTimes(3);
    expect(addedReviewer).toMatchObject({
      publicAddress: "0x2222222222222222222222222222222222222222",
      email: "milestone@example.com",
    });
  });
});
