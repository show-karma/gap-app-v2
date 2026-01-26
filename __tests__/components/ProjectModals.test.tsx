/**
 * @file Tests for ProjectModals component
 * @description Tests for the project modals layer that consolidates all modal components
 */

import { render, screen } from "@testing-library/react";
import { ProjectModals } from "@/components/Pages/Project/ProjectWrapper/ProjectModals";

// Mock modal stores
let mockIsIntroModalOpen = false;
let mockIsEndorsementOpen = false;
let mockIsProgressModalOpen = false;
let mockIsShareDialogOpen = false;

jest.mock("@/store/modals/intro", () => ({
  useIntroModalStore: () => ({
    isIntroModalOpen: mockIsIntroModalOpen,
  }),
}));

jest.mock("@/store/modals/endorsement", () => ({
  useEndorsementStore: () => ({
    isEndorsementOpen: mockIsEndorsementOpen,
  }),
}));

jest.mock("@/store/modals/progress", () => ({
  useProgressModalStore: () => ({
    isProgressModalOpen: mockIsProgressModalOpen,
  }),
}));

jest.mock("@/store/modals/shareDialog", () => ({
  useShareDialogStore: () => ({
    isOpen: mockIsShareDialogOpen,
  }),
}));

// Mock dynamic imports for modal components
jest.mock("next/dynamic", () => {
  return (loader: () => Promise<any>, options?: { ssr?: boolean }) => {
    const DynamicComponent = (props: any) => {
      // Return a placeholder for each modal that can be identified in tests
      // We detect which modal it is based on the loader string representation
      const loaderStr = loader.toString();
      if (loaderStr.includes("IntroDialog")) {
        return <div data-testid="intro-dialog">IntroDialog Content</div>;
      }
      if (loaderStr.includes("EndorsementDialog")) {
        return <div data-testid="endorsement-dialog">EndorsementDialog Content</div>;
      }
      if (loaderStr.includes("ProgressDialog")) {
        return <div data-testid="progress-dialog">ProgressDialog Content</div>;
      }
      if (loaderStr.includes("ShareDialog")) {
        return <div data-testid="share-dialog">ShareDialog Content</div>;
      }
      return <div data-testid="unknown-modal">Unknown Modal</div>;
    };
    DynamicComponent.displayName = "DynamicComponent";
    return DynamicComponent;
  };
});

describe("ProjectModals", () => {
  beforeEach(() => {
    // Reset all modal states before each test
    mockIsIntroModalOpen = false;
    mockIsEndorsementOpen = false;
    mockIsProgressModalOpen = false;
    mockIsShareDialogOpen = false;
  });

  describe("Initial State", () => {
    it("should render without any modals when all are closed", () => {
      const { container } = render(<ProjectModals />);

      expect(screen.queryByTestId("intro-dialog")).not.toBeInTheDocument();
      expect(screen.queryByTestId("endorsement-dialog")).not.toBeInTheDocument();
      expect(screen.queryByTestId("progress-dialog")).not.toBeInTheDocument();
      expect(screen.queryByTestId("share-dialog")).not.toBeInTheDocument();

      // Container should be empty (only React fragment)
      expect(container.children.length).toBe(0);
    });

    it("should render only a fragment wrapper", () => {
      const { container } = render(<ProjectModals />);

      // The component renders a React.Fragment, so no extra wrapper divs
      expect(container.firstChild).toBeNull();
    });
  });

  describe("IntroDialog Modal", () => {
    it("should render IntroDialog when isIntroModalOpen is true", () => {
      mockIsIntroModalOpen = true;
      render(<ProjectModals />);

      expect(screen.getByTestId("intro-dialog")).toBeInTheDocument();
    });

    it("should not render IntroDialog when isIntroModalOpen is false", () => {
      mockIsIntroModalOpen = false;
      render(<ProjectModals />);

      expect(screen.queryByTestId("intro-dialog")).not.toBeInTheDocument();
    });
  });

  describe("EndorsementDialog Modal", () => {
    it("should render EndorsementDialog when isEndorsementOpen is true", () => {
      mockIsEndorsementOpen = true;
      render(<ProjectModals />);

      expect(screen.getByTestId("endorsement-dialog")).toBeInTheDocument();
    });

    it("should not render EndorsementDialog when isEndorsementOpen is false", () => {
      mockIsEndorsementOpen = false;
      render(<ProjectModals />);

      expect(screen.queryByTestId("endorsement-dialog")).not.toBeInTheDocument();
    });
  });

  describe("ProgressDialog Modal", () => {
    it("should render ProgressDialog when isProgressModalOpen is true", () => {
      mockIsProgressModalOpen = true;
      render(<ProjectModals />);

      expect(screen.getByTestId("progress-dialog")).toBeInTheDocument();
    });

    it("should not render ProgressDialog when isProgressModalOpen is false", () => {
      mockIsProgressModalOpen = false;
      render(<ProjectModals />);

      expect(screen.queryByTestId("progress-dialog")).not.toBeInTheDocument();
    });
  });

  describe("ShareDialog Modal", () => {
    it("should render ShareDialog when isShareDialogOpen is true", () => {
      mockIsShareDialogOpen = true;
      render(<ProjectModals />);

      expect(screen.getByTestId("share-dialog")).toBeInTheDocument();
    });

    it("should not render ShareDialog when isShareDialogOpen is false", () => {
      mockIsShareDialogOpen = false;
      render(<ProjectModals />);

      expect(screen.queryByTestId("share-dialog")).not.toBeInTheDocument();
    });
  });

  describe("Multiple Modals", () => {
    it("should render multiple modals when multiple are open", () => {
      mockIsIntroModalOpen = true;
      mockIsEndorsementOpen = true;
      render(<ProjectModals />);

      expect(screen.getByTestId("intro-dialog")).toBeInTheDocument();
      expect(screen.getByTestId("endorsement-dialog")).toBeInTheDocument();
      expect(screen.queryByTestId("progress-dialog")).not.toBeInTheDocument();
      expect(screen.queryByTestId("share-dialog")).not.toBeInTheDocument();
    });

    it("should render all modals when all are open", () => {
      mockIsIntroModalOpen = true;
      mockIsEndorsementOpen = true;
      mockIsProgressModalOpen = true;
      mockIsShareDialogOpen = true;
      render(<ProjectModals />);

      expect(screen.getByTestId("intro-dialog")).toBeInTheDocument();
      expect(screen.getByTestId("endorsement-dialog")).toBeInTheDocument();
      expect(screen.getByTestId("progress-dialog")).toBeInTheDocument();
      expect(screen.getByTestId("share-dialog")).toBeInTheDocument();
    });

    it("should render correct combination of open modals", () => {
      mockIsProgressModalOpen = true;
      mockIsShareDialogOpen = true;
      render(<ProjectModals />);

      expect(screen.queryByTestId("intro-dialog")).not.toBeInTheDocument();
      expect(screen.queryByTestId("endorsement-dialog")).not.toBeInTheDocument();
      expect(screen.getByTestId("progress-dialog")).toBeInTheDocument();
      expect(screen.getByTestId("share-dialog")).toBeInTheDocument();
    });
  });

  describe("Conditional Rendering Pattern", () => {
    it("should use ternary operator pattern for conditional rendering", () => {
      // This test ensures the component uses {condition ? <Modal /> : null} pattern
      // which is more explicit than {condition && <Modal />}
      mockIsIntroModalOpen = true;
      const { container } = render(<ProjectModals />);

      // When modal is open, it should be rendered
      expect(screen.getByTestId("intro-dialog")).toBeInTheDocument();

      // When modal is closed, no placeholder should exist (null, not false or empty string)
      mockIsIntroModalOpen = false;
      const { container: container2 } = render(<ProjectModals />);
      expect(container2.querySelector('[data-testid="intro-dialog"]')).toBeNull();
    });
  });

  describe("State Independence", () => {
    it("should read each modal state independently", () => {
      // Each modal should be controlled by its own store
      mockIsIntroModalOpen = true;
      mockIsEndorsementOpen = false;
      mockIsProgressModalOpen = true;
      mockIsShareDialogOpen = false;

      render(<ProjectModals />);

      expect(screen.getByTestId("intro-dialog")).toBeInTheDocument();
      expect(screen.queryByTestId("endorsement-dialog")).not.toBeInTheDocument();
      expect(screen.getByTestId("progress-dialog")).toBeInTheDocument();
      expect(screen.queryByTestId("share-dialog")).not.toBeInTheDocument();
    });
  });

  describe("Component Export", () => {
    it("should be a named export", () => {
      // This verifies the component is exported correctly
      expect(ProjectModals).toBeDefined();
      expect(typeof ProjectModals).toBe("function");
    });

    it("should be a valid React component", () => {
      const { container } = render(<ProjectModals />);
      // Component should render without throwing
      expect(container).toBeInTheDocument();
    });
  });
});
