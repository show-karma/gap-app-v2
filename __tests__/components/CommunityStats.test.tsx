import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  spyOn,
  test,
} from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import CommunityStats from "@/components/CommunityStats";
import * as errorManagerModule from "@/components/Utilities/errorManager";
// Import modules for spyOn
import * as fetchDataModule from "@/utilities/fetchData";

// Create spies
let mockFetchData: ReturnType<typeof spyOn>;
let mockErrorManager: ReturnType<typeof spyOn>;

// Mock Headless UI Dialog
jest.mock("@headlessui/react", () => {
  const React = require("react");

  // List of Headless UI Transition props that should be filtered
  const TRANSITION_PROPS = [
    "appear",
    "show",
    "enter",
    "enterFrom",
    "enterTo",
    "leave",
    "leaveFrom",
    "leaveTo",
    "entered",
    "beforeEnter",
    "afterEnter",
    "beforeLeave",
    "afterLeave",
  ];

  const MockDialog = ({ children, onClose, ...props }: any) => (
    <div data-testid="dialog" {...props}>
      {children}
    </div>
  );
  MockDialog.Panel = ({ children, ...props }: any) => (
    <div data-testid="dialog-panel" {...props}>
      {children}
    </div>
  );

  const MockTransitionRoot = ({ show, children, as, ...props }: any) => {
    if (!show) return null;

    // Filter out Transition-specific props
    const filteredProps = Object.keys(props).reduce((acc, key) => {
      if (!TRANSITION_PROPS.includes(key)) {
        acc[key] = props[key];
      }
      return acc;
    }, {} as any);

    const Component = as || "div";
    return <Component {...filteredProps}>{children}</Component>;
  };

  const MockTransitionChild = ({ children, as, ...props }: any) => {
    // Filter out Transition-specific props
    const filteredProps = Object.keys(props).reduce((acc, key) => {
      if (!TRANSITION_PROPS.includes(key)) {
        acc[key] = props[key];
      }
      return acc;
    }, {} as any);

    const Component = as || "div";
    return <Component {...filteredProps}>{children}</Component>;
  };

  // Assign Child as a property of the MockTransitionRoot function
  MockTransitionRoot.Child = MockTransitionChild;

  return {
    Dialog: MockDialog,
    Transition: MockTransitionRoot,
    Fragment: React.Fragment,
  };
});

// Mock Heroicons
jest.mock("@heroicons/react/24/solid", () => ({
  ArrowPathIcon: (props: any) => <svg {...props} data-testid="refresh-icon" aria-label="Refresh" />,
  ChartBarSquareIcon: (props: any) => (
    <svg {...props} data-testid="chart-icon" aria-label="Chart" />
  ),
}));

// Mock Button
jest.mock("@/components/Utilities/Button", () => ({
  Button: ({ onClick, children, className }: any) => (
    <button onClick={onClick} className={className}>
      {children}
    </button>
  ),
}));

// NOTE: errorManager is mocked via spyOn in beforeEach to avoid polluting global mock state

describe("CommunityStats", () => {
  const mockCommunityId = "community-123";
  const mockStatsData = {
    projects: 50,
    ProjectEdits: 120,
    ProjectEndorsements: 35,
    ProjectImpacts: 80,
    ProjectImpactVerifieds: 60,
    grants: 25,
    GrantEdits: 45,
    GrantUpdates: 90,
    GrantUpdateStatuses: 70,
    GrantCompleted: 15,
    Milestones: 100,
    MilestoneCompleted: 75,
    MilestoneVerified: 60,
    MemberOf: 200,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Set up spies
    mockFetchData = spyOn(fetchDataModule, "default").mockResolvedValue([mockStatsData, null]);
    mockErrorManager = spyOn(errorManagerModule, "errorManager").mockImplementation(() => {});
  });

  // NOTE: No afterEach cleanup needed - spyOn creates fresh mocks in beforeEach

  describe("Rendering", () => {
    it("should render Stats button", () => {
      render(<CommunityStats communityId={mockCommunityId} />);

      expect(screen.getByText("Stats")).toBeInTheDocument();
    });

    it("should render chart icon on Stats button", () => {
      render(<CommunityStats communityId={mockCommunityId} />);

      expect(screen.getByTestId("chart-icon")).toBeInTheDocument();
    });

    it("should not show modal initially", () => {
      render(<CommunityStats communityId={mockCommunityId} />);

      expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
    });

    it("should have proper styling on Stats button", () => {
      render(<CommunityStats communityId={mockCommunityId} />);

      const button = screen.getByText("Stats").closest("button");
      expect(button?.className).toContain("text-fuchsia-600");
      expect(button?.className).toContain("border-fuchsia-200");
    });
  });

  describe("Modal Opening", () => {
    it("should open modal when Stats button is clicked", async () => {
      render(<CommunityStats communityId={mockCommunityId} />);

      const statsButton = screen.getByText("Stats");
      fireEvent.click(statsButton);

      await waitFor(() => {
        expect(screen.getByTestId("dialog")).toBeInTheDocument();
      });
    });

    it("should fetch stats when modal is opened", async () => {
      render(<CommunityStats communityId={mockCommunityId} />);

      const statsButton = screen.getByText("Stats");
      fireEvent.click(statsButton);

      await waitFor(() => {
        expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining(mockCommunityId));
      });
    });

    it("should show loading state when fetching stats", async () => {
      mockFetchData.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([mockStatsData, null]), 100))
      );

      render(<CommunityStats communityId={mockCommunityId} />);

      const statsButton = screen.getByText("Stats");
      fireEvent.click(statsButton);

      await waitFor(() => {
        expect(screen.getByText("Loading stats...")).toBeInTheDocument();
      });
    });
  });

  describe("Stats Display", () => {
    it("should display Community Stats title", async () => {
      render(<CommunityStats communityId={mockCommunityId} />);

      const statsButton = screen.getByText("Stats");
      fireEvent.click(statsButton);

      await waitFor(() => {
        expect(screen.getByText("Community Stats")).toBeInTheDocument();
      });
    });

    it("should display all stats after loading", async () => {
      render(<CommunityStats communityId={mockCommunityId} />);

      const statsButton = screen.getByText("Stats");
      fireEvent.click(statsButton);

      await waitFor(() => {
        expect(screen.getByText("No. of Projects")).toBeInTheDocument();
        expect(screen.getByText("50")).toBeInTheDocument();
      });
    });

    it("should display calculated total attestations", async () => {
      render(<CommunityStats communityId={mockCommunityId} />);

      const statsButton = screen.getByText("Stats");
      fireEvent.click(statsButton);

      await waitFor(() => {
        expect(screen.getByText("Total Attestations")).toBeInTheDocument();
      });

      // Total = 50 + 25 + 90 + 15 + 80 + 200 + 35 + 100 + 75 + 60 + 60 + 70 + 45 + 120 = 1025
      const totalValue = screen.getByText("1025");
      expect(totalValue).toBeInTheDocument();
    });

    it("should display grants stats", async () => {
      render(<CommunityStats communityId={mockCommunityId} />);

      const statsButton = screen.getByText("Stats");
      fireEvent.click(statsButton);

      await waitFor(() => {
        expect(screen.getByText("No. of Grants")).toBeInTheDocument();
        expect(screen.getByText("25")).toBeInTheDocument();
      });
    });

    it("should display milestone stats", async () => {
      render(<CommunityStats communityId={mockCommunityId} />);

      const statsButton = screen.getByText("Stats");
      fireEvent.click(statsButton);

      await waitFor(() => {
        expect(screen.getByText("No. of Milestones")).toBeInTheDocument();
        expect(screen.getByText("100")).toBeInTheDocument();
      });
    });

    it("should display completed milestones", async () => {
      render(<CommunityStats communityId={mockCommunityId} />);

      const statsButton = screen.getByText("Stats");
      fireEvent.click(statsButton);

      await waitFor(() => {
        expect(screen.getByText("No. of Milestones Completed")).toBeInTheDocument();
        expect(screen.getByText("75")).toBeInTheDocument();
      });
    });
  });

  describe("Refresh Functionality", () => {
    it("should render refresh button", async () => {
      render(<CommunityStats communityId={mockCommunityId} />);

      const statsButton = screen.getByText("Stats");
      fireEvent.click(statsButton);

      await waitFor(() => {
        expect(screen.getByTestId("refresh-icon")).toBeInTheDocument();
      });
    });

    it("should refetch stats when refresh button is clicked", async () => {
      render(<CommunityStats communityId={mockCommunityId} />);

      const statsButton = screen.getByText("Stats");
      fireEvent.click(statsButton);

      await waitFor(() => {
        expect(screen.getByTestId("refresh-icon")).toBeInTheDocument();
      });

      const refreshButton = screen.getByTestId("refresh-icon").closest("button");
      if (refreshButton) fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockFetchData).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("Error Handling", () => {
    it("should display error message when fetch fails", async () => {
      const errorMessage = "Failed to fetch stats";
      mockFetchData.mockResolvedValue([null, errorMessage]);

      render(<CommunityStats communityId={mockCommunityId} />);

      const statsButton = screen.getByText("Stats");
      fireEvent.click(statsButton);

      await waitFor(() => {
        expect(screen.getByText(/Error fetching stats/i)).toBeInTheDocument();
      });
    });

    it("should display error when no stats found", async () => {
      mockFetchData.mockResolvedValue([{}, null]);

      render(<CommunityStats communityId={mockCommunityId} />);

      const statsButton = screen.getByText("Stats");
      fireEvent.click(statsButton);

      await waitFor(() => {
        expect(screen.getByText(/Error fetching stats/i)).toBeInTheDocument();
      });
    });

    it("should display error when projects data is missing", async () => {
      mockFetchData.mockResolvedValue([{ grants: 10 }, null]);

      render(<CommunityStats communityId={mockCommunityId} />);

      const statsButton = screen.getByText("Stats");
      fireEvent.click(statsButton);

      await waitFor(() => {
        expect(screen.getByText(/Error fetching stats/i)).toBeInTheDocument();
      });
    });

    it("should call errorManager on fetch error", async () => {
      const error = new Error("Network error");
      mockFetchData.mockRejectedValue(error);

      render(<CommunityStats communityId={mockCommunityId} />);

      const statsButton = screen.getByText("Stats");
      fireEvent.click(statsButton);

      await waitFor(() => {
        expect(mockErrorManager).toHaveBeenCalled();
      });
    });
  });

  describe("Stats Format", () => {
    it("should display stats in key-value pairs", async () => {
      render(<CommunityStats communityId={mockCommunityId} />);

      const statsButton = screen.getByText("Stats");
      fireEvent.click(statsButton);

      await waitFor(() => {
        const statsContainer = screen.getByText("No. of Projects").parentElement;
        expect(statsContainer).toBeInTheDocument();
      });
    });

    it("should style stat values in blue", async () => {
      render(<CommunityStats communityId={mockCommunityId} />);

      const statsButton = screen.getByText("Stats");
      fireEvent.click(statsButton);

      await waitFor(() => {
        const value = screen.getByText("50");
        expect(value.className).toContain("text-blue-500");
      });
    });

    it("should display stats with proper labels", async () => {
      render(<CommunityStats communityId={mockCommunityId} />);

      const statsButton = screen.getByText("Stats");
      fireEvent.click(statsButton);

      await waitFor(() => {
        expect(screen.getByText("No. of Project Edits")).toBeInTheDocument();
        expect(screen.getByText("No. of Grant Updates")).toBeInTheDocument();
        expect(screen.getByText("No. of Members Added")).toBeInTheDocument();
      });
    });
  });

  describe("Styling", () => {
    it("should have dark mode classes on dialog panel", async () => {
      render(<CommunityStats communityId={mockCommunityId} />);

      const statsButton = screen.getByText("Stats");
      fireEvent.click(statsButton);

      await waitFor(() => {
        const panel = screen.getByTestId("dialog-panel");
        expect(panel.className).toContain("dark:bg-zinc-800");
      });
    });

    it("should have rounded corners on modal", async () => {
      render(<CommunityStats communityId={mockCommunityId} />);

      const statsButton = screen.getByText("Stats");
      fireEvent.click(statsButton);

      await waitFor(() => {
        const panel = screen.getByTestId("dialog-panel");
        expect(panel.className).toContain("rounded-2xl");
      });
    });

    it("should have border on header", async () => {
      render(<CommunityStats communityId={mockCommunityId} />);

      const statsButton = screen.getByText("Stats");
      fireEvent.click(statsButton);

      await waitFor(() => {
        const header = screen.getByText("Community Stats").parentElement;
        expect(header?.className).toContain("border-b-2");
      });
    });
  });

  describe("Accessibility", () => {
    it("should have heading for modal title", async () => {
      render(<CommunityStats communityId={mockCommunityId} />);

      const statsButton = screen.getByText("Stats");
      fireEvent.click(statsButton);

      await waitFor(() => {
        const title = screen.getByText("Community Stats");
        expect(title.tagName).toBe("H1");
      });
    });

    it("should have proper font styling for title", async () => {
      render(<CommunityStats communityId={mockCommunityId} />);

      const statsButton = screen.getByText("Stats");
      fireEvent.click(statsButton);

      await waitFor(() => {
        const title = screen.getByText("Community Stats");
        expect(title.className).toContain("font-bold");
        expect(title.className).toContain("text-xl");
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero values in stats", async () => {
      const zeroStats = {
        ...mockStatsData,
        projects: 1, // Must have at least 1 project for data validation
        grants: 0,
        ProjectEdits: 0,
        ProjectEndorsements: 0,
      };
      mockFetchData.mockResolvedValue([zeroStats, null]);

      render(<CommunityStats communityId={mockCommunityId} />);

      const statsButton = screen.getByText("Stats");
      fireEvent.click(statsButton);

      await waitFor(() => {
        expect(screen.getByText("No. of Grants")).toBeInTheDocument();
        const zeroValues = screen.getAllByText("0");
        expect(zeroValues.length).toBeGreaterThan(0);
      });
    });

    it("should handle very large numbers", async () => {
      const largeStats = {
        ...mockStatsData,
        projects: 999999,
      };
      mockFetchData.mockResolvedValue([largeStats, null]);

      render(<CommunityStats communityId={mockCommunityId} />);

      const statsButton = screen.getByText("Stats");
      fireEvent.click(statsButton);

      await waitFor(() => {
        expect(screen.getByText("999999")).toBeInTheDocument();
      });
    });

    it("should handle missing optional stats fields", async () => {
      const partialStats = {
        projects: 10,
        grants: 5,
      };
      mockFetchData.mockResolvedValue([partialStats, null]);

      render(<CommunityStats communityId={mockCommunityId} />);

      const statsButton = screen.getByText("Stats");
      fireEvent.click(statsButton);

      await waitFor(() => {
        expect(screen.getByText("No. of Projects")).toBeInTheDocument();
      });
    });

    it("should handle empty communityId gracefully", async () => {
      render(<CommunityStats communityId="" />);

      const statsButton = screen.getByText("Stats");
      fireEvent.click(statsButton);

      await waitFor(() => {
        expect(mockFetchData).toHaveBeenCalled();
      });
    });
  });

  describe("Loading States", () => {
    it("should show loading initially after opening modal", async () => {
      mockFetchData.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([mockStatsData, null]), 500))
      );

      render(<CommunityStats communityId={mockCommunityId} />);

      const statsButton = screen.getByText("Stats");
      fireEvent.click(statsButton);

      expect(await screen.findByText("Loading stats...")).toBeInTheDocument();
    });

    it("should hide loading after stats are fetched", async () => {
      render(<CommunityStats communityId={mockCommunityId} />);

      const statsButton = screen.getByText("Stats");
      fireEvent.click(statsButton);

      await waitFor(() => {
        expect(screen.queryByText("Loading stats...")).not.toBeInTheDocument();
      });
    });

    it("should show loading when refreshing stats", async () => {
      mockFetchData.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([mockStatsData, null]), 100))
      );

      render(<CommunityStats communityId={mockCommunityId} />);

      const statsButton = screen.getByText("Stats");
      fireEvent.click(statsButton);

      await waitFor(() => {
        expect(screen.getByTestId("refresh-icon")).toBeInTheDocument();
      });

      const refreshButton = screen.getByTestId("refresh-icon").closest("button");
      if (refreshButton) fireEvent.click(refreshButton);

      expect(await screen.findByText("Loading stats...")).toBeInTheDocument();
    });
  });
});
