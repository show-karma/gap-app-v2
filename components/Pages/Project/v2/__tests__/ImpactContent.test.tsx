import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ImpactContent } from "../MainContent/ImpactContent";

// Mock the OutputsAndOutcomes component
jest.mock("@/components/Pages/Project/Impact/OutputsAndOutcomes", () => ({
  OutputsAndOutcomes: () => (
    <div data-testid="outputs-and-outcomes">Outputs and Outcomes Content</div>
  ),
}));

// Mock the AddImpactScreen component
jest.mock("@/components/Pages/Project/Impact/AddImpactScreen", () => ({
  AddImpactScreen: () => <div data-testid="add-impact-screen">Add Impact Screen</div>,
}));

// Mock useOwnerStore
jest.mock("@/store", () => ({
  useOwnerStore: jest.fn(),
  useProjectStore: jest.fn(),
}));

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useSearchParams: jest.fn(),
}));

import { useSearchParams } from "next/navigation";
import { useOwnerStore, useProjectStore } from "@/store";

const mockUseOwnerStore = useOwnerStore as jest.MockedFunction<typeof useOwnerStore>;
const mockUseProjectStore = useProjectStore as jest.MockedFunction<typeof useProjectStore>;
const mockUseSearchParams = useSearchParams as jest.MockedFunction<typeof useSearchParams>;

describe("ImpactContent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseOwnerStore.mockImplementation((selector) => {
      const state = { isOwner: false };
      return selector ? selector(state as never) : state;
    });
    mockUseProjectStore.mockImplementation((selector) => {
      const state = { isProjectAdmin: false };
      return selector ? selector(state as never) : state;
    });
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
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
        const state = { isProjectAdmin: true };
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
