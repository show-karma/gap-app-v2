import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ImpactContent } from "../MainContent/ImpactContent";

// Mock the OutputsAndOutcomes component
vi.mock("@/components/Pages/Project/Impact/OutputsAndOutcomes", () => ({
  OutputsAndOutcomes: () => (
    <div data-testid="outputs-and-outcomes">Outputs and Outcomes Content</div>
  ),
}));

// Mock the AddImpactScreen component
vi.mock("@/components/Pages/Project/Impact/AddImpactScreen", () => ({
  AddImpactScreen: () => <div data-testid="add-impact-screen">Add Impact Screen</div>,
}));

// Mock the ImpactStatsSummary component to avoid QueryClient dependency
vi.mock("../MainContent/ImpactStatsSummary", () => ({
  ImpactStatsSummary: () => <div data-testid="impact-stats-summary">Impact Stats Summary</div>,
}));

// Mock useOwnerStore
vi.mock("@/store", () => ({
  useOwnerStore: vi.fn(),
  useProjectStore: vi.fn(),
}));

// Authorization moved into useProjectAuthorization; mock it so the component
// never reaches the real useQuery-backed hook chain. The mock derives
// isAuthorized from the same stores these tests already control.
vi.mock("@/hooks/useProjectAuthorization", () => ({
  useProjectAuthorization: vi.fn(),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
  usePathname: vi.fn(() => "/"),
}));

import { useSearchParams } from "next/navigation";
import { useProjectAuthorization } from "@/hooks/useProjectAuthorization";
import { useOwnerStore, useProjectStore } from "@/store";

const mockUseOwnerStore = useOwnerStore as vi.MockedFunction<typeof useOwnerStore>;
const mockUseProjectStore = useProjectStore as vi.MockedFunction<typeof useProjectStore>;
const mockUseSearchParams = useSearchParams as vi.MockedFunction<typeof useSearchParams>;
const mockUseProjectAuthorization = useProjectAuthorization as vi.MockedFunction<
  typeof useProjectAuthorization
>;

describe("ImpactContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseOwnerStore.mockImplementation((selector) => {
      const state = { isOwner: false };
      return selector ? selector(state as never) : state;
    });
    mockUseProjectStore.mockImplementation((selector) => {
      const state = { isProjectAdmin: false, isProjectOwner: false };
      return selector ? selector(state as never) : state;
    });
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
    // Derive authorization from the same stores the tests control, so existing
    // store-based test setups keep driving isAuthorized after #1624.
    mockUseProjectAuthorization.mockImplementation(() => {
      const ownerState = mockUseOwnerStore() as unknown as { isOwner?: boolean };
      const projectState = mockUseProjectStore() as unknown as {
        isProjectAdmin?: boolean;
        isProjectOwner?: boolean;
      };
      return {
        isAuthorized: Boolean(
          ownerState?.isOwner || projectState?.isProjectAdmin || projectState?.isProjectOwner
        ),
        isLoading: false,
      };
    });
  });

  describe("Rendering", () => {
    it("should render impact content section", () => {
      render(<ImpactContent />);

      expect(screen.getByTestId("impact-content")).toBeInTheDocument();
    });

    it("should render Outputs and Outcomes heading", () => {
      render(<ImpactContent />);

      expect(screen.getByText("Outputs and Outcomes")).toBeInTheDocument();
    });

    it("should render OutputsAndOutcomes component", () => {
      render(<ImpactContent />);

      expect(screen.getByTestId("outputs-and-outcomes")).toBeInTheDocument();
    });

    it("should accept custom className", () => {
      render(<ImpactContent className="custom-class" />);

      expect(screen.getByTestId("impact-content")).toHaveClass("custom-class");
    });
  });

  describe("Authorization", () => {
    it("should show AddImpactScreen when authorized and tab=add-impact", () => {
      mockUseOwnerStore.mockImplementation((selector) => {
        const state = { isOwner: true };
        return selector ? selector(state as never) : state;
      });
      mockUseSearchParams.mockReturnValue(new URLSearchParams("tab=add-impact"));

      render(<ImpactContent />);

      expect(screen.getByTestId("add-impact-screen")).toBeInTheDocument();
      expect(screen.queryByTestId("impact-content")).not.toBeInTheDocument();
    });

    it("should show AddImpactScreen when project admin and tab=add-impact", () => {
      mockUseProjectStore.mockImplementation((selector) => {
        const state = { isProjectAdmin: true, isProjectOwner: false };
        return selector ? selector(state as never) : state;
      });
      mockUseSearchParams.mockReturnValue(new URLSearchParams("tab=add-impact"));

      render(<ImpactContent />);

      expect(screen.getByTestId("add-impact-screen")).toBeInTheDocument();
    });

    it("should show AddImpactScreen when project owner (not admin) and tab=add-impact", () => {
      mockUseProjectStore.mockImplementation((selector) => {
        const state = { isProjectAdmin: false, isProjectOwner: true };
        return selector ? selector(state as never) : state;
      });
      mockUseSearchParams.mockReturnValue(new URLSearchParams("tab=add-impact"));

      render(<ImpactContent />);

      expect(screen.getByTestId("add-impact-screen")).toBeInTheDocument();
    });

    it("should NOT show AddImpactScreen when not authorized even with tab=add-impact", () => {
      mockUseSearchParams.mockReturnValue(new URLSearchParams("tab=add-impact"));

      render(<ImpactContent />);

      expect(screen.queryByTestId("add-impact-screen")).not.toBeInTheDocument();
      expect(screen.getByTestId("impact-content")).toBeInTheDocument();
    });

    it("should NOT show AddImpactScreen when authorized but tab is not add-impact", () => {
      mockUseOwnerStore.mockImplementation((selector) => {
        const state = { isOwner: true };
        return selector ? selector(state as never) : state;
      });
      mockUseSearchParams.mockReturnValue(new URLSearchParams("tab=something-else"));

      render(<ImpactContent />);

      expect(screen.queryByTestId("add-impact-screen")).not.toBeInTheDocument();
      expect(screen.getByTestId("impact-content")).toBeInTheDocument();
    });
  });
});
