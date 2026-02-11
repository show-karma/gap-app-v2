import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { useMilestoneReviewers } from "@/hooks/useMilestoneReviewers";
import { useProgramReviewers } from "@/hooks/useProgramReviewers";
import { milestoneReviewersService } from "@/services/milestone-reviewers.service";
import { programReviewersService } from "@/services/program-reviewers.service";

jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("react-hot-toast", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("@/services/program-reviewers.service", () => ({
  programReviewersService: {
    getReviewers: jest.fn(),
    addReviewer: jest.fn(),
    removeReviewer: jest.fn(),
    validateReviewerData: jest.fn(),
  },
}));

jest.mock("@/services/milestone-reviewers.service", () => ({
  milestoneReviewersService: {
    getReviewers: jest.fn(),
    addReviewer: jest.fn(),
    removeReviewer: jest.fn(),
    validateReviewerData: jest.fn(),
  },
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockToast = toast as jest.Mocked<typeof toast>;
const mockProgramReviewersService = programReviewersService as jest.Mocked<
  typeof programReviewersService
>;
const mockMilestoneReviewersService = milestoneReviewersService as jest.Mocked<
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

    jest.clearAllMocks();

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
});
