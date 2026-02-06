import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "react-hot-toast";
import { ReviewerType } from "@/hooks/useReviewerAssignment";
import { applicationReviewersService } from "@/services/application-reviewers.service";
import type { MilestoneReviewer } from "@/services/milestone-reviewers.service";
import type { ProgramReviewer } from "@/services/program-reviewers.service";
import { ReviewerAssignmentDropdown } from "../ReviewerAssignmentDropdown";

// Mock dependencies
jest.mock("@/services/application-reviewers.service");
jest.mock("react-hot-toast", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("@/components/Utilities/MultiSelectDropdown", () => {
  const React = require("react");
  return {
    MultiSelectDropdown: ({
      items,
      selectedIds: initialSelectedIds,
      onChange,
      placeholder,
    }: {
      items: Array<{ id: string; label: string }>;
      selectedIds: string[];
      onChange: (ids: string[]) => void;
      placeholder: string;
    }) => {
      // Maintain local state to handle rapid clicks
      const [localSelectedIds, setLocalSelectedIds] = React.useState<string[]>(initialSelectedIds);

      React.useEffect(() => {
        setLocalSelectedIds(initialSelectedIds);
      }, [initialSelectedIds]);

      return (
        <div data-testid="multi-select-dropdown">
          <div data-testid="placeholder">{placeholder}</div>
          <div data-testid="selected-ids">{localSelectedIds.join(",")}</div>
          {items.map((item) => (
            <button
              key={item.id}
              data-testid={`option-${item.id}`}
              onClick={() => {
                const newIds = localSelectedIds.includes(item.id)
                  ? localSelectedIds.filter((id) => id !== item.id)
                  : [...localSelectedIds, item.id];
                setLocalSelectedIds(newIds);
                onChange(newIds);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      );
    },
  };
});

const mockAssignReviewers = applicationReviewersService.assignReviewers as jest.MockedFunction<
  typeof applicationReviewersService.assignReviewers
>;

describe("ReviewerAssignmentDropdown", () => {
  let queryClient: QueryClient;

  const mockProgramReviewers: ProgramReviewer[] = [
    {
      publicAddress: "0x1111111111111111111111111111111111111111",
      name: "John Doe",
      email: "john@example.com",
      assignedAt: "2024-01-01T00:00:00Z",
    },
    {
      publicAddress: "0x2222222222222222222222222222222222222222",
      name: "Jane Smith",
      email: "jane@example.com",
      assignedAt: "2024-01-02T00:00:00Z",
    },
  ];

  const mockMilestoneReviewers: MilestoneReviewer[] = [
    {
      publicAddress: "0x3333333333333333333333333333333333333333",
      name: "Bob Wilson",
      email: "bob@example.com",
      assignedAt: "2024-01-03T00:00:00Z",
    },
  ];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    jest.clearAllMocks();
    mockAssignReviewers.mockResolvedValue(undefined);
  });

  const renderComponent = (
    props: {
      applicationId?: string;
      availableReviewers?: ProgramReviewer[] | MilestoneReviewer[];
      assignedReviewerAddresses?: string[];
      reviewerType?: ReviewerType;
      onAssignmentChange?: () => void;
    } = {}
  ) => {
    const {
      applicationId = "APP-12345-ABCDE",
      availableReviewers = mockProgramReviewers,
      assignedReviewerAddresses = [],
      reviewerType = ReviewerType.APP,
      onAssignmentChange,
    } = props;

    return render(
      <QueryClientProvider client={queryClient}>
        <ReviewerAssignmentDropdown
          applicationId={applicationId}
          availableReviewers={availableReviewers}
          assignedReviewerAddresses={assignedReviewerAddresses}
          reviewerType={reviewerType}
          onAssignmentChange={onAssignmentChange}
        />
      </QueryClientProvider>
    );
  };

  describe("Rendering", () => {
    it("should render dropdown with correct placeholder for app reviewers", () => {
      renderComponent({ reviewerType: ReviewerType.APP });

      expect(screen.getByTestId("multi-select-dropdown")).toBeInTheDocument();
      expect(screen.getByTestId("placeholder")).toHaveTextContent("Select app reviewers...");
    });

    it("should render dropdown with correct placeholder for milestone reviewers", () => {
      renderComponent({ reviewerType: ReviewerType.MILESTONE });

      expect(screen.getByTestId("placeholder")).toHaveTextContent("Select milestone reviewers...");
    });

    it("should render all available reviewers as options", () => {
      renderComponent({ availableReviewers: mockProgramReviewers });

      expect(
        screen.getByTestId("option-0x1111111111111111111111111111111111111111")
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("option-0x2222222222222222222222222222222222222222")
      ).toBeInTheDocument();
    });

    it("should display reviewer names as labels", () => {
      renderComponent({ availableReviewers: mockProgramReviewers });

      expect(
        screen.getByTestId("option-0x1111111111111111111111111111111111111111")
      ).toHaveTextContent("John Doe");
      expect(
        screen.getByTestId("option-0x2222222222222222222222222222222222222222")
      ).toHaveTextContent("Jane Smith");
    });

    it("should use email as label when name is not available", () => {
      const reviewersWithoutName: ProgramReviewer[] = [
        {
          publicAddress: "0x1111111111111111111111111111111111111111",
          name: "",
          email: "john@example.com",
          assignedAt: "2024-01-01T00:00:00Z",
        },
      ];

      renderComponent({ availableReviewers: reviewersWithoutName });

      expect(
        screen.getByTestId("option-0x1111111111111111111111111111111111111111")
      ).toHaveTextContent("john@example.com");
    });

    it("should use address as label when name and email are not available", () => {
      const reviewersWithoutNameOrEmail: ProgramReviewer[] = [
        {
          publicAddress: "0x1111111111111111111111111111111111111111",
          name: "",
          email: "",
          assignedAt: "2024-01-01T00:00:00Z",
        },
      ];

      renderComponent({ availableReviewers: reviewersWithoutNameOrEmail });

      expect(
        screen.getByTestId("option-0x1111111111111111111111111111111111111111")
      ).toHaveTextContent("0x1111111111111111111111111111111111111111");
    });

    it("should display assigned reviewers", () => {
      const assignedAddresses = ["0x1111111111111111111111111111111111111111"];
      renderComponent({ assignedReviewerAddresses: assignedAddresses });

      expect(screen.getByTestId("selected-ids")).toHaveTextContent(
        "0x1111111111111111111111111111111111111111"
      );
    });

    it("should normalize addresses to lowercase for comparison", () => {
      const assignedAddresses = ["0x1111111111111111111111111111111111111111".toUpperCase()];
      renderComponent({ assignedReviewerAddresses: assignedAddresses });

      // Should still match because we normalize
      expect(screen.getByTestId("selected-ids")).toHaveTextContent(
        "0x1111111111111111111111111111111111111111"
      );
    });
  });

  describe("Reviewer Assignment", () => {
    it("should call assignReviewers when reviewers are selected", async () => {
      renderComponent({ reviewerType: ReviewerType.APP });

      const option = screen.getByTestId("option-0x1111111111111111111111111111111111111111");
      fireEvent.click(option);

      await waitFor(() => {
        expect(mockAssignReviewers).toHaveBeenCalledWith("APP-12345-ABCDE", {
          appReviewerAddresses: ["0x1111111111111111111111111111111111111111"],
        });
      });
    });

    it("should call assignReviewers with milestone reviewers when type is milestone", async () => {
      renderComponent({
        reviewerType: ReviewerType.MILESTONE,
        availableReviewers: mockMilestoneReviewers,
      });

      const option = screen.getByTestId("option-0x3333333333333333333333333333333333333333");
      fireEvent.click(option);

      await waitFor(() => {
        expect(mockAssignReviewers).toHaveBeenCalledWith("APP-12345-ABCDE", {
          milestoneReviewerAddresses: ["0x3333333333333333333333333333333333333333"],
        });
      });
    });

    it("should show success toast on successful assignment", async () => {
      renderComponent({ reviewerType: ReviewerType.APP });

      const option = screen.getByTestId("option-0x1111111111111111111111111111111111111111");
      fireEvent.click(option);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("App reviewers updated successfully");
      });
    });

    it("should show success toast for milestone reviewers", async () => {
      renderComponent({
        reviewerType: ReviewerType.MILESTONE,
        availableReviewers: mockMilestoneReviewers,
      });

      const option = screen.getByTestId("option-0x3333333333333333333333333333333333333333");
      fireEvent.click(option);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Milestone reviewers updated successfully");
      });
    });

    it("should call onAssignmentChange callback on success", async () => {
      const onAssignmentChange = jest.fn();
      renderComponent({ reviewerType: ReviewerType.APP, onAssignmentChange });

      const option = screen.getByTestId("option-0x1111111111111111111111111111111111111111");
      fireEvent.click(option);

      await waitFor(() => {
        expect(onAssignmentChange).toHaveBeenCalled();
      });
    });

    it("should handle multiple reviewer selection", async () => {
      renderComponent({ reviewerType: ReviewerType.APP });

      const option1 = screen.getByTestId("option-0x1111111111111111111111111111111111111111");
      const option2 = screen.getByTestId("option-0x2222222222222222222222222222222222222222");

      fireEvent.click(option1);

      // Wait for first API call to complete before clicking second option
      await waitFor(() => {
        expect(mockAssignReviewers).toHaveBeenCalled();
      });

      fireEvent.click(option2);

      await waitFor(() => {
        // Check that the last call includes both reviewers
        const calls = mockAssignReviewers.mock.calls;
        const lastCall = calls[calls.length - 1];
        expect(lastCall[0]).toBe("APP-12345-ABCDE");
        expect(lastCall[1].appReviewerAddresses).toEqual(
          expect.arrayContaining([
            "0x1111111111111111111111111111111111111111",
            "0x2222222222222222222222222222222222222222",
          ])
        );
      });
    });
  });

  describe("Error Handling", () => {
    it("should show error toast on API failure", async () => {
      const error = new Error("Failed to assign reviewers");
      mockAssignReviewers.mockRejectedValue(error);

      renderComponent({ reviewerType: ReviewerType.APP });

      const option = screen.getByTestId("option-0x1111111111111111111111111111111111111111");
      fireEvent.click(option);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to assign reviewers");
      });
    });

    it("should show error message from API response", async () => {
      const error = {
        response: {
          status: 422,
          data: {
            message: "Reviewer not configured",
            details: [
              {
                field: "appReviewerAddresses[0]",
                message: "Reviewer 0x1234...abcd is not configured",
              },
            ],
          },
        },
      };
      mockAssignReviewers.mockRejectedValue(error);

      renderComponent({ reviewerType: ReviewerType.APP });

      const option = screen.getByTestId("option-0x1111111111111111111111111111111111111111");
      fireEvent.click(option);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Reviewer 0x1234...abcd is not configured");
      });
    });

    it("should show multiple error messages from details array", async () => {
      const error = {
        response: {
          status: 422,
          data: {
            message: "Validation failed",
            details: [
              {
                field: "appReviewerAddresses[0]",
                message: "Error 1",
              },
              {
                field: "appReviewerAddresses[1]",
                message: "Error 2",
              },
            ],
          },
        },
      };
      mockAssignReviewers.mockRejectedValue(error);

      renderComponent({ reviewerType: ReviewerType.APP });

      const option = screen.getByTestId("option-0x1111111111111111111111111111111111111111");
      fireEvent.click(option);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Error 1; Error 2");
      });
    });

    it("should handle 400 error", async () => {
      const error = {
        response: {
          status: 400,
          data: {
            message: "Bad Request",
          },
        },
      };
      mockAssignReviewers.mockRejectedValue(error);

      renderComponent({ reviewerType: ReviewerType.APP });

      const option = screen.getByTestId("option-0x1111111111111111111111111111111111111111");
      fireEvent.click(option);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Bad Request");
      });
    });

    it("should handle 404 error", async () => {
      const error = {
        response: {
          status: 404,
          data: {
            message: "Application not found",
          },
        },
      };
      mockAssignReviewers.mockRejectedValue(error);

      renderComponent({ reviewerType: ReviewerType.APP });

      const option = screen.getByTestId("option-0x1111111111111111111111111111111111111111");
      fireEvent.click(option);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Application not found");
      });
    });

    it("should handle network errors", async () => {
      const error = new Error("Network error");
      mockAssignReviewers.mockRejectedValue(error);

      renderComponent({ reviewerType: ReviewerType.APP });

      const option = screen.getByTestId("option-0x1111111111111111111111111111111111111111");
      fireEvent.click(option);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Network error");
      });
    });

    it("should not call onAssignmentChange on error", async () => {
      const onAssignmentChange = jest.fn();
      const error = new Error("Failed");
      mockAssignReviewers.mockRejectedValue(error);

      renderComponent({ reviewerType: ReviewerType.APP, onAssignmentChange });

      const option = screen.getByTestId("option-0x1111111111111111111111111111111111111111");
      fireEvent.click(option);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });

      expect(onAssignmentChange).not.toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty reviewers list", () => {
      renderComponent({ availableReviewers: [] });

      expect(screen.getByTestId("multi-select-dropdown")).toBeInTheDocument();
      expect(screen.queryByTestId(/option-/)).not.toBeInTheDocument();
    });

    it("should handle empty assigned reviewers", () => {
      renderComponent({ assignedReviewerAddresses: [] });

      expect(screen.getByTestId("selected-ids")).toHaveTextContent("");
    });

    it("should handle different application IDs", async () => {
      renderComponent({ applicationId: "APP-99999-ZZZZZ" });

      const option = screen.getByTestId("option-0x1111111111111111111111111111111111111111");
      fireEvent.click(option);

      await waitFor(() => {
        expect(mockAssignReviewers).toHaveBeenCalledWith("APP-99999-ZZZZZ", {
          appReviewerAddresses: ["0x1111111111111111111111111111111111111111"],
        });
      });
    });

    it("should handle reviewer removal", async () => {
      const assignedAddresses = ["0x1111111111111111111111111111111111111111"];
      renderComponent({
        assignedReviewerAddresses: assignedAddresses,
        reviewerType: ReviewerType.APP,
      });

      // Click to remove (toggle off)
      const option = screen.getByTestId("option-0x1111111111111111111111111111111111111111");
      fireEvent.click(option);

      await waitFor(() => {
        expect(mockAssignReviewers).toHaveBeenCalledWith("APP-12345-ABCDE", {
          appReviewerAddresses: [],
        });
      });
    });
  });

  describe("Query Invalidation", () => {
    it("should invalidate application queries after successful assignment", async () => {
      const invalidateQueries = jest.spyOn(queryClient, "invalidateQueries");

      renderComponent({ reviewerType: ReviewerType.APP });

      const option = screen.getByTestId("option-0x1111111111111111111111111111111111111111");
      fireEvent.click(option);

      await waitFor(() => {
        expect(invalidateQueries).toHaveBeenCalled();
      });

      const callArgs = invalidateQueries.mock.calls[0][0];
      expect(callArgs).toHaveProperty("predicate");
    });
  });
});
