import { describe, expect, it } from "bun:test";
import { render, screen } from "@testing-library/react";
import { TabPanel } from "@/components/FundingPlatform/ApplicationView/TabPanel";

// Mock cn utility
jest.mock("@/utilities/tailwind", () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(" "),
}));

// Mock Spinner component
jest.mock("@/components/Utilities/Spinner", () => ({
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

    it("applies centered styling to loading container", () => {
      const { container } = render(
        <TabPanel isLoading>
          <div>Content</div>
        </TabPanel>
      );

      // Outer container has padding
      const outerContainer = container.firstChild;
      expect(outerContainer).toHaveClass("p-6");

      // Inner spinner container has centering styles
      const spinnerContainer = outerContainer?.firstChild;
      expect(spinnerContainer).toHaveClass("flex");
      expect(spinnerContainer).toHaveClass("items-center");
      expect(spinnerContainer).toHaveClass("justify-center");
      expect(spinnerContainer).toHaveClass("py-12");
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

  describe("Padding", () => {
    it("applies default padding when padded is true", () => {
      const { container } = render(
        <TabPanel padded>
          <div>Content</div>
        </TabPanel>
      );

      expect(container.firstChild).toHaveClass("p-6");
    });

    it("applies padding by default", () => {
      const { container } = render(
        <TabPanel>
          <div>Content</div>
        </TabPanel>
      );

      expect(container.firstChild).toHaveClass("p-6");
    });

    it("removes padding when padded is false", () => {
      const { container } = render(
        <TabPanel padded={false}>
          <div>Content</div>
        </TabPanel>
      );

      expect(container.firstChild).not.toHaveClass("p-6");
    });
  });

  describe("Custom className", () => {
    it("applies custom className", () => {
      const { container } = render(
        <TabPanel className="custom-class">
          <div>Content</div>
        </TabPanel>
      );

      expect(container.firstChild).toHaveClass("custom-class");
    });

    it("combines custom className with default classes", () => {
      const { container } = render(
        <TabPanel className="custom-class" padded>
          <div>Content</div>
        </TabPanel>
      );

      expect(container.firstChild).toHaveClass("p-6");
      expect(container.firstChild).toHaveClass("custom-class");
    });

    it("applies custom className to loading state", () => {
      const { container } = render(
        <TabPanel isLoading className="custom-loading-class">
          <div>Content</div>
        </TabPanel>
      );

      expect(container.firstChild).toHaveClass("custom-loading-class");
    });
  });

  describe("Props Combinations", () => {
    it("handles loading with custom className", () => {
      const { container } = render(
        <TabPanel isLoading className="my-class">
          <div>Content</div>
        </TabPanel>
      );

      expect(container.firstChild).toHaveClass("my-class");
      expect(screen.getByTestId("spinner")).toBeInTheDocument();
    });

    it("handles padded={false} with custom className", () => {
      const { container } = render(
        <TabPanel padded={false} className="my-class">
          <div>Content</div>
        </TabPanel>
      );

      expect(container.firstChild).toHaveClass("my-class");
      expect(container.firstChild).not.toHaveClass("p-6");
    });

    it("handles all props together", () => {
      const { container } = render(
        <TabPanel padded className="my-class" isLoading={false}>
          <div data-testid="content">Content</div>
        </TabPanel>
      );

      expect(container.firstChild).toHaveClass("p-6");
      expect(container.firstChild).toHaveClass("my-class");
      expect(screen.getByTestId("content")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles empty children", () => {
      const { container } = render(<TabPanel>{null}</TabPanel>);
      expect(container.firstChild).toBeInTheDocument();
    });

    it("handles undefined children", () => {
      const { container } = render(<TabPanel>{undefined}</TabPanel>);
      expect(container.firstChild).toBeInTheDocument();
    });

    it("handles string children", () => {
      render(<TabPanel>Simple text content</TabPanel>);
      expect(screen.getByText("Simple text content")).toBeInTheDocument();
    });

    it("handles number children", () => {
      render(<TabPanel>{42}</TabPanel>);
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    it("handles fragment children", () => {
      render(
        <TabPanel>
          <>
            <span data-testid="fragment-child-1">One</span>
            <span data-testid="fragment-child-2">Two</span>
          </>
        </TabPanel>
      );

      expect(screen.getByTestId("fragment-child-1")).toBeInTheDocument();
      expect(screen.getByTestId("fragment-child-2")).toBeInTheDocument();
    });
  });

  describe("Types", () => {
    it("accepts ReactNode children", () => {
      const complexChildren = (
        <div>
          <h1>Title</h1>
          <p>Paragraph</p>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
          </ul>
        </div>
      );

      render(<TabPanel>{complexChildren}</TabPanel>);

      expect(screen.getByText("Title")).toBeInTheDocument();
      expect(screen.getByText("Paragraph")).toBeInTheDocument();
      expect(screen.getByText("Item 1")).toBeInTheDocument();
      expect(screen.getByText("Item 2")).toBeInTheDocument();
    });
  });
});
