/**
 * @file Tests for ProjectModals component
 * @description Tests conditional rendering behavior driven by Zustand modal stores.
 * Each modal should appear/disappear based on its store state, and ProjectOptionsDialogs
 * should always be present.
 */

import { render, screen } from "@testing-library/react";

// Mock ProjectOptionsMenu to avoid deep dependency chain (gasless utilities with ESM)
vi.mock("@/components/Pages/Project/ProjectOptionsMenu", () => ({
  ProjectOptionsDialogs: () => (
    <div data-testid="project-options-dialogs">ProjectOptionsDialogs</div>
  ),
}));

import { ProjectModals } from "@/components/Pages/Project/ProjectWrapper/ProjectModals";

// Modal store state holders — mutated per test to drive conditional rendering
let mockIsIntroModalOpen = false;
let mockIsEndorsementOpen = false;
let mockIsProgressModalOpen = false;
let mockIsShareDialogOpen = false;
let mockIsContributorProfileOpen = false;

vi.mock("@/store/modals/intro", () => ({
  useIntroModalStore: () => ({
    isIntroModalOpen: mockIsIntroModalOpen,
  }),
}));

vi.mock("@/store/modals/endorsement", () => ({
  useEndorsementStore: () => ({
    isEndorsementOpen: mockIsEndorsementOpen,
  }),
}));

vi.mock("@/store/modals/progress", () => ({
  useProgressModalStore: () => ({
    isProgressModalOpen: mockIsProgressModalOpen,
  }),
}));

vi.mock("@/store/modals/shareDialog", () => ({
  useShareDialogStore: () => ({
    isOpen: mockIsShareDialogOpen,
  }),
}));

vi.mock("@/store/modals/contributorProfile", () => ({
  useContributorProfileModalStore: () => ({
    isModalOpen: mockIsContributorProfileOpen,
  }),
}));

// Mock dynamic imports — each modal returns a testid so we can detect which loaded
vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<any>, _options?: { ssr?: boolean }) => {
    const DynamicComponent = (_props: any) => {
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
  },
}));

describe("ProjectModals", () => {
  beforeEach(() => {
    mockIsIntroModalOpen = false;
    mockIsEndorsementOpen = false;
    mockIsProgressModalOpen = false;
    mockIsShareDialogOpen = false;
    mockIsContributorProfileOpen = false;
  });

  describe("always-present elements", () => {
    it("renders ProjectOptionsDialogs regardless of modal state", () => {
      render(<ProjectModals />);
      expect(screen.getByTestId("project-options-dialogs")).toBeInTheDocument();
    });
  });

  describe("conditional rendering driven by store state", () => {
    const modalCases = [
      {
        name: "IntroDialog",
        testId: "intro-dialog",
        activate: () => {
          mockIsIntroModalOpen = true;
        },
      },
      {
        name: "EndorsementDialog",
        testId: "endorsement-dialog",
        activate: () => {
          mockIsEndorsementOpen = true;
        },
      },
      {
        name: "ProgressDialog",
        testId: "progress-dialog",
        activate: () => {
          mockIsProgressModalOpen = true;
        },
      },
      {
        name: "ShareDialog",
        testId: "share-dialog",
        activate: () => {
          mockIsShareDialogOpen = true;
        },
      },
      {
        name: "ContributorProfileDialog",
        testId: "contributor-profile-dialog",
        activate: () => {
          mockIsContributorProfileOpen = true;
        },
      },
    ];

    it.each(modalCases)(
      "renders $name only when its store flag is true",
      ({ testId, activate }) => {
        // When closed, modal is not in the DOM
        const { unmount } = render(<ProjectModals />);
        expect(screen.queryByTestId(testId)).not.toBeInTheDocument();
        unmount();

        // When opened, modal appears
        activate();
        render(<ProjectModals />);
        expect(screen.getByTestId(testId)).toBeInTheDocument();
      }
    );

    it.each(modalCases)(
      "does not render other modals when only $name is open",
      ({ testId, activate }) => {
        activate();
        render(<ProjectModals />);

        // The activated modal is present
        expect(screen.getByTestId(testId)).toBeInTheDocument();

        // All other modals are absent
        const otherTestIds = modalCases.filter((c) => c.testId !== testId).map((c) => c.testId);
        for (const otherId of otherTestIds) {
          expect(screen.queryByTestId(otherId)).not.toBeInTheDocument();
        }
      }
    );
  });

  describe("multiple modals open simultaneously", () => {
    it("renders exactly the modals whose flags are true", () => {
      mockIsIntroModalOpen = true;
      mockIsProgressModalOpen = true;
      mockIsContributorProfileOpen = true;

      render(<ProjectModals />);

      // Open modals are present
      expect(screen.getByTestId("intro-dialog")).toBeInTheDocument();
      expect(screen.getByTestId("progress-dialog")).toBeInTheDocument();
      expect(screen.getByTestId("contributor-profile-dialog")).toBeInTheDocument();

      // Closed modals are absent
      expect(screen.queryByTestId("endorsement-dialog")).not.toBeInTheDocument();
      expect(screen.queryByTestId("share-dialog")).not.toBeInTheDocument();
    });

    it("renders all five modals when every flag is true", () => {
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
  });

  describe("state independence", () => {
    it("each modal responds only to its own store, not sibling stores", () => {
      // Alternating pattern: open, closed, open, closed, open
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
});
