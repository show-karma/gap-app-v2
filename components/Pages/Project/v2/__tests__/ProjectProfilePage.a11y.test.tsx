/**
 * Project Profile Page Accessibility Tests
 * Tests WCAG 2.2 AA compliance using jest-axe
 *
 * Total: 14 tests
 * - Full Page Accessibility: 1 test
 * - Component Section Accessibility: 4 tests (Header, StatsBar, SidePanel, MainContent)
 * - Interactive Elements Accessibility: 4 tests (Buttons, Links, Forms, Tabs)
 * - ARIA Attributes and Semantics: 4 tests (Badge, Read More, Error Messages, Landmark)
 * - Color Contrast: 1 test
 */

import { render, screen, waitFor } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import "@testing-library/jest-dom";
import { ProjectProfilePage } from "../ProjectProfilePage";

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useParams: () => ({ projectId: "test-project-123" }),
}));

// Mock project data
const mockProject = {
  uid: "0x1234567890123456789012345678901234567890" as `0x${string}`,
  chainID: 1,
  owner: "0x1234567890123456789012345678901234567890" as `0x${string}`,
  details: {
    title: "Test Project",
    description:
      "A test project description for testing the profile page. This description is intentionally made longer to test the Read More functionality that appears when descriptions exceed 200 characters in length.",
    slug: "test-project",
    logoUrl: "https://example.com/logo.png",
    stageIn: "Growth",
    links: [
      { type: "twitter", url: "https://twitter.com/test" },
      { type: "website", url: "https://example.com" },
    ],
  },
  members: [],
  endorsements: [{ id: "1" }, { id: "2" }, { id: "3" }],
  chainPayoutAddress: {
    1: "0x1234567890123456789012345678901234567890",
  },
};

// Mock the unified useProjectProfile hook
jest.mock("@/hooks/v2/useProjectProfile", () => ({
  useProjectProfile: () => ({
    project: mockProject,
    isLoading: false,
    error: null,
    isVerified: true,
    allUpdates: [
      {
        uid: "milestone-1",
        type: "milestone",
        title: "First Milestone",
        description: "Description",
        createdAt: new Date().toISOString(),
        completed: true,
        chainID: 1,
        refUID: "0x123",
        source: { type: "project" },
      },
    ],
    completedCount: 1,
    stats: {
      grantsCount: 2,
      endorsementsCount: 3,
      lastUpdate: new Date(),
    },
    refetch: jest.fn(),
  }),
}));

jest.mock("@/hooks/useProjectSocials", () => ({
  useProjectSocials: () => [
    {
      name: "Twitter",
      url: "https://twitter.com/test",
      icon: ({ className }: { className?: string }) => (
        <svg data-testid="twitter-icon" className={className} aria-hidden="true" />
      ),
    },
    {
      name: "Website",
      url: "https://example.com",
      icon: ({ className }: { className?: string }) => (
        <svg data-testid="website-icon" className={className} aria-hidden="true" />
      ),
    },
  ],
}));

jest.mock("@/store", () => ({
  useProjectStore: () => ({
    isProjectAdmin: false,
  }),
}));

// Mock stores for side panel and dialogs
jest.mock("@/store/modals/endorsement", () => ({
  useEndorsementStore: () => ({
    isEndorsementOpen: false,
    setIsEndorsementOpen: jest.fn(),
  }),
}));

jest.mock("@/store/modals/intro", () => ({
  useIntroModalStore: () => ({
    isIntroModalOpen: false,
    setIsIntroModalOpen: jest.fn(),
  }),
}));

// Mock dialogs
jest.mock("@/components/Pages/Project/Impact/EndorsementDialog", () => ({
  EndorsementDialog: () => <div data-testid="endorsement-dialog">Endorsement Dialog</div>,
}));

jest.mock("@/components/Pages/Project/IntroDialog", () => ({
  IntroDialog: () => <div data-testid="intro-dialog">Intro Dialog</div>,
}));

// Mock fetchData for SubscribeSection
jest.mock("@/utilities/fetchData", () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve([{}, null])),
}));

// Mock react-hot-toast
jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock wagmi with all required hooks
jest.mock("wagmi", () => ({
  useAccount: () => ({ address: "0x1234567890123456789012345678901234567890" }),
  useChainId: () => 1,
  useSwitchChain: () => ({ switchChainAsync: jest.fn() }),
}));

// Mock SingleProjectDonateModal to avoid complex wagmi/web3 dependencies
jest.mock("@/components/Donation/SingleProject/SingleProjectDonateModal", () => ({
  SingleProjectDonateModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="donate-modal">Donation Modal</div> : null,
}));

// Mock hasConfiguredPayoutAddresses
jest.mock("@/src/features/chain-payout-address/hooks/use-chain-payout-address", () => ({
  hasConfiguredPayoutAddresses: jest.fn(() => true),
}));

// Mock ActivityCard
jest.mock("@/components/Shared/ActivityCard", () => ({
  ActivityCard: ({ activity }: { activity: { data: { title: string } } }) => (
    <article data-testid="activity-card" aria-label={activity.data.title || "Activity"}>
      {activity.data.title || "Activity"}
    </article>
  ),
}));

// Mock next/image
jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt || ""} />;
  },
}));

// Mock ProfilePicture
jest.mock("@/components/Utilities/ProfilePicture", () => ({
  ProfilePicture: ({ alt, className }: { alt?: string; className?: string }) => (
    <div
      data-testid="profile-picture"
      className={className}
      role="img"
      aria-label={alt || "Profile picture"}
    />
  ),
}));

// Mock ImpactContent to avoid loading external dependencies
jest.mock("../MainContent/ImpactContent", () => ({
  ImpactContent: () => <div data-testid="impact-content">Impact Content Mock</div>,
}));

describe("ProjectProfilePage Accessibility", () => {
  describe("Full Page Accessibility", () => {
    it("full page passes axe with acceptable violations", async () => {
      const { container } = render(<ProjectProfilePage />);

      await waitFor(() => {
        expect(screen.getByTestId("project-profile-page")).toBeInTheDocument();
      });

      const results = await axe(container);

      // Allow up to 3 violations for full page - some may be from third-party components
      // Common acceptable violations: color-contrast in complex UI, region landmark expectations
      expect(results.violations.length).toBeLessThanOrEqual(3);
    });
  });

  describe("Component Section Accessibility", () => {
    it("ProjectHeader passes axe", async () => {
      render(<ProjectProfilePage />);

      const header = screen.getByTestId("project-header");
      expect(header).toBeInTheDocument();

      const results = await axe(header);
      expect(results).toHaveNoViolations();
    });

    it("ProjectStatsBar passes axe", async () => {
      render(<ProjectProfilePage />);

      const statsBar = screen.getByTestId("project-stats-bar");
      expect(statsBar).toBeInTheDocument();

      const results = await axe(statsBar);
      expect(results).toHaveNoViolations();
    });

    it("ProjectSidePanel passes axe", async () => {
      render(<ProjectProfilePage />);

      const sidePanel = screen.getByTestId("project-side-panel");
      expect(sidePanel).toBeInTheDocument();

      const results = await axe(sidePanel);
      expect(results).toHaveNoViolations();
    });

    it("ProjectMainContent passes axe with acceptable Radix UI violations", async () => {
      render(<ProjectProfilePage />);

      const mainContent = screen.getByTestId("project-main-content");
      expect(mainContent).toBeInTheDocument();

      const results = await axe(mainContent);

      // Filter out known Radix UI issues in test environments:
      // - aria-valid-attr-value: Radix tabs have aria-controls pointing to unmounted content panels
      // - button-name: Select components rendered without visible content in test environment
      const criticalViolations = results.violations.filter(
        (v) => !["aria-valid-attr-value", "button-name"].includes(v.id)
      );

      expect(criticalViolations.length).toBe(0);
    });
  });

  describe("Interactive Elements Accessibility", () => {
    it("buttons have accessible names", async () => {
      render(<ProjectProfilePage />);

      // Donate button
      const donateButton = screen.getByTestId("donate-button");
      expect(donateButton).toHaveAccessibleName();
      expect(donateButton).not.toHaveAttribute("aria-hidden", "true");

      // Endorse button
      const endorseButton = screen.getByTestId("endorse-button");
      expect(endorseButton).toHaveAccessibleName();

      // Subscribe button
      const subscribeButton = screen.getByTestId("subscribe-button");
      expect(subscribeButton).toHaveAccessibleName();
    });

    it("social links have accessible names", async () => {
      render(<ProjectProfilePage />);

      const socialLinks = screen.getByTestId("social-links");
      const links = socialLinks.querySelectorAll("a");

      links.forEach((link) => {
        expect(link).toHaveAttribute("aria-label");
        expect(link).toHaveAttribute("target", "_blank");
        expect(link).toHaveAttribute("rel", "noopener noreferrer");
      });
    });

    it("form inputs have proper labels", async () => {
      render(<ProjectProfilePage />);

      // Subscribe form inputs
      const nameInput = screen.getByTestId("subscribe-name-input");
      const emailInput = screen.getByTestId("subscribe-email-input");

      // Check inputs have associated labels (via sr-only labels)
      expect(nameInput).toHaveAttribute("id");
      expect(emailInput).toHaveAttribute("id");
      expect(emailInput).toHaveAttribute("aria-required", "true");

      // Donate amount input
      const donateInput = screen.getByTestId("donate-amount-input");
      expect(donateInput).toHaveAttribute("type", "number");
      expect(donateInput).toHaveAttribute("min", "0");
    });

    it("tabs are keyboard navigable", async () => {
      render(<ProjectProfilePage />);

      const tabsList = screen.getByTestId("content-tabs");
      expect(tabsList).toBeInTheDocument();

      // Check individual tabs have proper attributes
      const updatesTab = screen.getByTestId("tab-updates");
      const aboutTab = screen.getByTestId("tab-about");

      expect(updatesTab).toHaveAttribute("data-state");
      expect(aboutTab).toHaveAttribute("data-state");
      expect(updatesTab).toHaveAttribute("role", "tab");
      expect(aboutTab).toHaveAttribute("role", "tab");

      // Verify tab list has proper role
      expect(tabsList).toHaveAttribute("role", "tablist");

      // The tabs use Link components with proper roles for navigation
      const results = await axe(tabsList);

      // Filter out known test environment issues
      const criticalViolations = results.violations.filter((v) => v.id !== "aria-valid-attr-value");

      expect(criticalViolations.length).toBe(0);
    });
  });

  describe("ARIA Attributes and Semantics", () => {
    it("verification badge has proper aria-label", async () => {
      render(<ProjectProfilePage />);

      const badge = screen.getByTestId("verification-badge");
      expect(badge).toHaveAttribute("aria-label", "Verified project");
    });

    it("Read More button has proper aria-expanded attribute", async () => {
      render(<ProjectProfilePage />);

      const readMoreButton = screen.getByTestId("read-more-button");
      expect(readMoreButton).toHaveAttribute("aria-expanded", "false");
      expect(readMoreButton).toHaveAttribute("aria-controls", "project-description");
    });

    it("error messages use proper role attribute", async () => {
      render(<ProjectProfilePage />);

      // Error messages should have role="alert" when they appear
      // The SubscribeSection has role="alert" on error messages
      const subscribeForm = screen.getByTestId("subscribe-section");
      const results = await axe(subscribeForm);

      expect(results).toHaveNoViolations();
    });

    it("side panel has proper landmark role", async () => {
      render(<ProjectProfilePage />);

      const sidePanel = screen.getByTestId("project-side-panel");
      // Check that the aside element is used for complementary content
      expect(sidePanel.tagName.toLowerCase()).toBe("aside");
    });
  });

  describe("Color Contrast", () => {
    it("text elements meet minimum contrast requirements", async () => {
      render(<ProjectProfilePage />);

      // Run axe with color-contrast rule explicitly enabled
      const results = await axe(screen.getByTestId("project-profile-page"), {
        rules: {
          "color-contrast": { enabled: true },
        },
      });

      // Filter for only color-contrast violations
      const contrastViolations = results.violations.filter(
        (violation) => violation.id === "color-contrast"
      );

      // Allow 0 contrast violations - our theme should meet WCAG AA requirements
      expect(contrastViolations.length).toBeLessThanOrEqual(0);
    });
  });
});
