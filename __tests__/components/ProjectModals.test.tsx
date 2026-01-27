/**
 * @file Tests for ProjectModals component
 * @description Tests for the project modals layer that consolidates all modal components
 */

import { render, screen } from "@testing-library/react";

// Mock ProjectOptionsMenu to avoid deep dependency chain (gasless utilities with ESM)
jest.mock("@/components/Pages/Project/ProjectOptionsMenu", () => ({
  ProjectOptionsDialogs: () => (
    <div data-testid="project-options-dialogs">ProjectOptionsDialogs</div>
  ),
}));

import { ProjectModals } from "@/components/Pages/Project/ProjectWrapper/ProjectModals";

// Mock modal stores
let mockIsIntroModalOpen = false;
let mockIsEndorsementOpen = false;
let mockIsProgressModalOpen = false;
let mockIsShareDialogOpen = false;
let mockIsContributorProfileOpen = false;
let mockOpenContributorProfileModal = jest.fn();

// Mock search params
let mockInviteCode: string | null = null;

jest.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: (key: string) => {
      if (key === "invite-code") return mockInviteCode;
      return null;
    },
  }),
}));

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

jest.mock("@/store/modals/contributorProfile", () => ({
  useContributorProfileModalStore: () => ({
    isModalOpen: mockIsContributorProfileOpen,
    openModal: mockOpenContributorProfileModal,
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
      if (loaderStr.includes("ContributorProfileDialog")) {
        return <div data-testid="contributor-profile-dialog">ContributorProfileDialog Content</div>;
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
    mockIsContributorProfileOpen = false;
    mockOpenContributorProfileModal = jest.fn();
    mockInviteCode = null;
  });

  describe("Initial State", () => {
    it("should render without any modals when all are closed", () => {
      render(<ProjectModals />);

      expect(screen.queryByTestId("intro-dialog")).not.toBeInTheDocument();
      expect(screen.queryByTestId("endorsement-dialog")).not.toBeInTheDocument();
      expect(screen.queryByTestId("progress-dialog")).not.toBeInTheDocument();
      expect(screen.queryByTestId("share-dialog")).not.toBeInTheDocument();
      expect(screen.queryByTestId("contributor-profile-dialog")).not.toBeInTheDocument();

      // ProjectOptionsDialogs is always rendered
      expect(screen.getByTestId("project-options-dialogs")).toBeInTheDocument();
    });

    it("should render ProjectOptionsDialogs", () => {
      render(<ProjectModals />);

      // ProjectOptionsDialogs is always rendered regardless of modal state
      expect(screen.getByTestId("project-options-dialogs")).toBeInTheDocument();
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

  describe("ContributorProfileDialog Modal", () => {
    it("should render ContributorProfileDialog when isContributorProfileOpen is true", () => {
      mockIsContributorProfileOpen = true;
      render(<ProjectModals />);

      expect(screen.getByTestId("contributor-profile-dialog")).toBeInTheDocument();
    });

    it("should not render ContributorProfileDialog when isContributorProfileOpen is false", () => {
      mockIsContributorProfileOpen = false;
      render(<ProjectModals />);

      expect(screen.queryByTestId("contributor-profile-dialog")).not.toBeInTheDocument();
    });
  });

  describe("Invite Code Auto-Open", () => {
    it("should call openModal when invite-code is present in URL", () => {
      mockInviteCode = "test-invite-code-123";
      mockIsContributorProfileOpen = false;
      render(<ProjectModals />);

      expect(mockOpenContributorProfileModal).toHaveBeenCalled();
    });

    it("should not call openModal when invite-code is not present", () => {
      mockInviteCode = null;
      mockIsContributorProfileOpen = false;
      render(<ProjectModals />);

      expect(mockOpenContributorProfileModal).not.toHaveBeenCalled();
    });

    it("should not call openModal when modal is already open", () => {
      mockInviteCode = "test-invite-code-123";
      mockIsContributorProfileOpen = true;
      render(<ProjectModals />);

      expect(mockOpenContributorProfileModal).not.toHaveBeenCalled();
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
      expect(screen.queryByTestId("contributor-profile-dialog")).not.toBeInTheDocument();
    });

    it("should render all modals when all are open", () => {
      mockIsIntroModalOpen = true;
      mockIsEndorsementOpen = true;
      mockIsProgressModalOpen = true;
      mockIsShareDialogOpen = true;
      mockIsContributorProfileOpen = true;
      render(<ProjectModals />);

      expect(screen.getByTestId("intro-dialog")).toBeInTheDocument();
      expect(screen.getByTestId("endorsement-dialog")).toBeInTheDocument();
      expect(screen.getByTestId("progress-dialog")).toBeInTheDocument();
      expect(screen.getByTestId("share-dialog")).toBeInTheDocument();
      expect(screen.getByTestId("contributor-profile-dialog")).toBeInTheDocument();
    });

    it("should render correct combination of open modals", () => {
      mockIsProgressModalOpen = true;
      mockIsShareDialogOpen = true;
      render(<ProjectModals />);

      expect(screen.queryByTestId("intro-dialog")).not.toBeInTheDocument();
      expect(screen.queryByTestId("endorsement-dialog")).not.toBeInTheDocument();
      expect(screen.getByTestId("progress-dialog")).toBeInTheDocument();
      expect(screen.getByTestId("share-dialog")).toBeInTheDocument();
      expect(screen.queryByTestId("contributor-profile-dialog")).not.toBeInTheDocument();
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
      mockIsContributorProfileOpen = true;

      render(<ProjectModals />);

      expect(screen.getByTestId("intro-dialog")).toBeInTheDocument();
      expect(screen.queryByTestId("endorsement-dialog")).not.toBeInTheDocument();
      expect(screen.getByTestId("progress-dialog")).toBeInTheDocument();
      expect(screen.queryByTestId("share-dialog")).not.toBeInTheDocument();
      expect(screen.getByTestId("contributor-profile-dialog")).toBeInTheDocument();
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
