import { render, screen } from "@testing-library/react";
import { TabPanel } from "@/components/FundingPlatform/ApplicationView/TabPanel";

// Mock cn utility
vi.mock("@/utilities/tailwind", () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(" "),
}));

// Mock Spinner component
vi.mock("@/components/Utilities/Spinner", () => ({
  Spinner: () => <div data-testid="spinner">Loading...</div>,
}));

describe("TabPanel", () => {
  describe("Rendering", () => {
    it("renders children correctly", () => {
      render(
        <TabPanel>
          <div data-testid="child-content">Test Content</div>
        </TabPanel>
      );

      expect(screen.getByTestId("child-content")).toBeInTheDocument();
      expect(screen.getByText("Test Content")).toBeInTheDocument();
    });

    it("renders multiple children", () => {
      render(
        <TabPanel>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
        </TabPanel>
      );

      expect(screen.getByTestId("child-1")).toBeInTheDocument();
      expect(screen.getByTestId("child-2")).toBeInTheDocument();
    });
  });

  describe("Loading State", () => {
    it("shows spinner when isLoading is true", () => {
      render(
        <TabPanel isLoading>
          <div data-testid="child-content">Test Content</div>
        </TabPanel>
      );

      expect(screen.getByTestId("spinner")).toBeInTheDocument();
      expect(screen.queryByTestId("child-content")).not.toBeInTheDocument();
    });

    it("shows children when isLoading is false", () => {
      render(
        <TabPanel isLoading={false}>
          <div data-testid="child-content">Test Content</div>
        </TabPanel>
      );

      expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
      expect(screen.getByTestId("child-content")).toBeInTheDocument();
    });

    it("defaults to not loading", () => {
      render(
        <TabPanel>
          <div data-testid="child-content">Test Content</div>
        </TabPanel>
      );

      expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
      expect(screen.getByTestId("child-content")).toBeInTheDocument();
    });

    it("shows skeleton loader when showSkeleton is true", () => {
      render(
        <TabPanel isLoading showSkeleton>
          <div data-testid="child-content">Test Content</div>
        </TabPanel>
      );

      expect(screen.getByRole("status")).toBeInTheDocument();
      expect(screen.getByLabelText("Loading content")).toBeInTheDocument();
      expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
      expect(screen.queryByTestId("child-content")).not.toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles empty children", () => {
      const { container } = render(<TabPanel>{null}</TabPanel>);
      expect(container.firstChild).toBeInTheDocument();
    });

    it("handles string children", () => {
      render(<TabPanel>Simple text content</TabPanel>);
      expect(screen.getByText("Simple text content")).toBeInTheDocument();
    });
  });
});
