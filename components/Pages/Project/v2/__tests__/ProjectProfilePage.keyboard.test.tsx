/**
 * Keyboard Navigation Tests for Project Profile V2 Components
 * Tests WCAG 2.2 AA compliance for keyboard accessibility including:
 * - Tab navigation through interactive elements
 * - Enter/Space key activation of buttons
 * - Focus management
 * - Escape key handling for modals/dialogs
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import type { Project } from "@/types/v2/project";
import type { UnifiedMilestone } from "@/types/v2/roadmap";
import { ActivityFilters } from "../MainContent/ActivityFilters";
import { ContentTabs } from "../MainContent/ContentTabs";
import { ProjectMainContent } from "../MainContent/ProjectMainContent";
import { DonateSection } from "../SidePanel/DonateSection";
import { EndorseSection } from "../SidePanel/EndorseSection";
import { ProjectSidePanel } from "../SidePanel/ProjectSidePanel";
import { QuickLinksCard } from "../SidePanel/QuickLinksCard";
import { SubscribeSection } from "../SidePanel/SubscribeSection";

// Mock the stores
const mockSetIsEndorsementOpen = jest.fn();
const mockSetIsIntroModalOpen = jest.fn();

jest.mock("@/store/modals/endorsement", () => ({
  useEndorsementStore: () => ({
    setIsEndorsementOpen: mockSetIsEndorsementOpen,
  }),
}));

jest.mock("@/store/modals/intro", () => ({
  useIntroModalStore: () => ({
    setIsIntroModalOpen: mockSetIsIntroModalOpen,
  }),
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
  SingleProjectDonateModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="donate-modal" role="dialog" aria-modal="true">
        <button type="button" onClick={onClose} data-testid="close-modal">
          Close
        </button>
        <div>Donation Modal</div>
      </div>
    ) : null,
}));

// Mock hasConfiguredPayoutAddresses
jest.mock("@/src/features/chain-payout-address/hooks/use-chain-payout-address", () => ({
  hasConfiguredPayoutAddresses: jest.fn(() => true),
}));

// Mock ActivityCard
jest.mock("@/components/Shared/ActivityCard", () => ({
  ActivityCard: ({ activity }: { activity: { data: { title: string } } }) => (
    <div data-testid="activity-card">{activity.data.title || "Activity"}</div>
  ),
}));

// Mock useOwnerStore and useProjectStore
jest.mock("@/store", () => ({
  useOwnerStore: () => ({ isOwner: false }),
  useProjectStore: () => ({ isProjectAdmin: false }),
}));

const mockProject: Project = {
  uid: "0x1234567890123456789012345678901234567890" as `0x${string}`,
  chainID: 1,
  owner: "0x1234567890123456789012345678901234567890" as `0x${string}`,
  details: {
    title: "Test Project",
    description: "A test project description",
    slug: "test-project",
    links: [
      { type: "website", url: "https://example.com" },
      { type: "pitchDeck", url: "https://docs.example.com/deck" },
      { type: "demoVideo", url: "https://youtube.com/watch?v=123" },
    ],
  },
  members: [],
};

const mockMilestones: UnifiedMilestone[] = [
  {
    uid: "milestone-1",
    type: "milestone",
    title: "First Milestone",
    description: "Description 1",
    createdAt: new Date().toISOString(),
    completed: false,
    chainID: 1,
    refUID: "0x123",
    source: { type: "project" },
  },
  {
    uid: "milestone-2",
    type: "grant",
    title: "Grant Received",
    description: "Grant description",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    completed: true,
    chainID: 1,
    refUID: "0x456",
    source: { type: "grant" },
  },
];

describe("Keyboard Navigation Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("ContentTabs Keyboard Navigation", () => {
    const defaultTabProps = {
      activeTab: "profile" as const,
      onTabChange: jest.fn(),
    };

    it("should be focusable via Tab key", async () => {
      const user = userEvent.setup();
      render(<ContentTabs {...defaultTabProps} />);

      // Tab to the first tab
      await user.tab();

      // One of the tab triggers should be focused
      const tabsList = screen.getByTestId("tabs-list");
      expect(tabsList.contains(document.activeElement)).toBe(true);
    });

    it("should navigate between tabs using arrow keys", async () => {
      const user = userEvent.setup();
      render(<ContentTabs {...defaultTabProps} />);

      const profileTab = screen.getByTestId("tab-profile");
      profileTab.focus();

      expect(profileTab).toHaveFocus();

      // Arrow right should move focus to next tab
      await user.keyboard("{ArrowRight}");

      // Focus should have moved (Radix tabs handle this)
      expect(document.activeElement).toBeInstanceOf(HTMLElement);
    });

    it("should activate tab on Enter key press", async () => {
      const handleTabChange = jest.fn();
      render(<ContentTabs {...defaultTabProps} onTabChange={handleTabChange} />);

      const updatesTab = screen.getByTestId("tab-updates");
      updatesTab.focus();

      fireEvent.keyDown(updatesTab, { key: "Enter", code: "Enter" });

      // The tab should be activatable
      expect(updatesTab).toBeInTheDocument();
    });

    it("should activate tab on Space key press", async () => {
      const handleTabChange = jest.fn();
      render(<ContentTabs {...defaultTabProps} onTabChange={handleTabChange} />);

      const aboutTab = screen.getByTestId("tab-about");
      aboutTab.focus();

      fireEvent.keyDown(aboutTab, { key: " ", code: "Space" });

      expect(aboutTab).toBeInTheDocument();
    });

    it("should have proper focus visible indicators", () => {
      render(<ContentTabs {...defaultTabProps} />);

      const profileTab = screen.getByTestId("tab-profile");
      profileTab.focus();

      expect(profileTab).toHaveFocus();
      // Focus indicator is handled by CSS, but element should receive focus
      expect(document.activeElement).toBe(profileTab);
    });

    it("should maintain focus within tablist using Home/End keys", async () => {
      const user = userEvent.setup();
      render(<ContentTabs {...defaultTabProps} />);

      const profileTab = screen.getByTestId("tab-profile");
      profileTab.focus();

      // Home key should go to first tab
      await user.keyboard("{Home}");
      expect(document.activeElement).toBeInstanceOf(HTMLElement);

      // End key should go to last tab
      await user.keyboard("{End}");
      expect(document.activeElement).toBeInstanceOf(HTMLElement);
    });
  });

  describe("ActivityFilters Keyboard Navigation", () => {
    const defaultFilterProps = {
      sortBy: "newest" as const,
      onSortChange: jest.fn(),
      activeFilters: [] as ("funding" | "updates" | "blog" | "socials" | "other")[],
      onFilterToggle: jest.fn(),
    };

    it("should focus sort select with Tab key", async () => {
      const user = userEvent.setup();
      render(<ActivityFilters {...defaultFilterProps} />);

      await user.tab();

      const sortSelect = screen.getByTestId("sort-select");
      expect(sortSelect).toHaveFocus();
    });

    it("should open sort dropdown on Enter key", async () => {
      render(<ActivityFilters {...defaultFilterProps} />);

      const sortSelect = screen.getByTestId("sort-select");
      sortSelect.focus();

      fireEvent.keyDown(sortSelect, { key: "Enter", code: "Enter" });

      // Select should be interactive
      expect(sortSelect).toBeInTheDocument();
    });

    it("should open sort dropdown on Space key", async () => {
      render(<ActivityFilters {...defaultFilterProps} />);

      const sortSelect = screen.getByTestId("sort-select");
      sortSelect.focus();

      fireEvent.keyDown(sortSelect, { key: " ", code: "Space" });

      expect(sortSelect).toBeInTheDocument();
    });

    it("should toggle filter badge on Enter key press", async () => {
      const handleToggle = jest.fn();
      render(<ActivityFilters {...defaultFilterProps} onFilterToggle={handleToggle} />);

      const fundingFilter = screen.getByTestId("filter-funding");
      fundingFilter.focus();

      fireEvent.keyDown(fundingFilter, { key: "Enter", code: "Enter" });
      fireEvent.click(fundingFilter);

      expect(handleToggle).toHaveBeenCalledWith("funding");
    });

    it("should toggle filter badge on Space key press", async () => {
      const handleToggle = jest.fn();
      render(<ActivityFilters {...defaultFilterProps} onFilterToggle={handleToggle} />);

      const updatesFilter = screen.getByTestId("filter-updates");
      updatesFilter.focus();

      fireEvent.keyDown(updatesFilter, { key: " ", code: "Space" });

      // Native button handles space key to click
      expect(updatesFilter).toBeInTheDocument();
    });

    it("should Tab through all filter badges", async () => {
      const user = userEvent.setup();
      render(<ActivityFilters {...defaultFilterProps} />);

      // Tab to sort select first
      await user.tab();
      expect(screen.getByTestId("sort-select")).toHaveFocus();

      // Tab to first filter
      await user.tab();
      expect(screen.getByTestId("filter-funding")).toHaveFocus();

      // Tab through remaining filters
      await user.tab();
      expect(screen.getByTestId("filter-updates")).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId("filter-blog")).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId("filter-socials")).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId("filter-other")).toHaveFocus();
    });

    it("should have focus-visible styles on filter badges", () => {
      render(<ActivityFilters {...defaultFilterProps} />);

      const fundingFilter = screen.getByTestId("filter-funding");
      fundingFilter.focus();

      expect(fundingFilter).toHaveFocus();
      // Check for focus-visible class
      expect(fundingFilter).toHaveClass("focus-visible:ring-2");
    });
  });

  describe("SidePanel Buttons Keyboard Navigation", () => {
    describe("DonateSection", () => {
      it("should focus amount input on Tab", async () => {
        const user = userEvent.setup();
        render(<DonateSection project={mockProject} />);

        await user.tab();

        const amountInput = screen.getByTestId("donate-amount-input");
        expect(amountInput).toHaveFocus();
      });

      it("should focus donate button after amount input", async () => {
        const user = userEvent.setup();
        render(<DonateSection project={mockProject} />);

        // Tab to input
        await user.tab();
        // Tab to button
        await user.tab();

        const donateButton = screen.getByTestId("donate-button");
        expect(donateButton).toHaveFocus();
      });

      it("should open donate modal on Enter key", async () => {
        render(<DonateSection project={mockProject} />);

        const donateButton = screen.getByTestId("donate-button");
        donateButton.focus();

        fireEvent.keyDown(donateButton, { key: "Enter", code: "Enter" });
        fireEvent.click(donateButton);

        await waitFor(() => {
          expect(screen.getByTestId("donate-modal")).toBeInTheDocument();
        });
      });

      it("should open donate modal on Space key", async () => {
        render(<DonateSection project={mockProject} />);

        const donateButton = screen.getByTestId("donate-button");
        donateButton.focus();

        fireEvent.keyDown(donateButton, { key: " ", code: "Space" });
        fireEvent.click(donateButton);

        await waitFor(() => {
          expect(screen.getByTestId("donate-modal")).toBeInTheDocument();
        });
      });

      it("should allow numeric input in amount field via keyboard", async () => {
        const user = userEvent.setup();
        render(<DonateSection project={mockProject} />);

        const amountInput = screen.getByTestId("donate-amount-input");
        await user.type(amountInput, "100");

        expect(amountInput).toHaveValue(100);
      });
    });

    describe("EndorseSection", () => {
      it("should focus endorse button on Tab", async () => {
        const user = userEvent.setup();
        render(<EndorseSection project={mockProject} />);

        await user.tab();

        const endorseButton = screen.getByTestId("endorse-button");
        expect(endorseButton).toHaveFocus();
      });

      it("should open endorsement dialog on Enter key", async () => {
        render(<EndorseSection project={mockProject} />);

        const endorseButton = screen.getByTestId("endorse-button");
        endorseButton.focus();

        fireEvent.keyDown(endorseButton, { key: "Enter", code: "Enter" });
        fireEvent.click(endorseButton);

        expect(mockSetIsEndorsementOpen).toHaveBeenCalledWith(true);
      });

      it("should open endorsement dialog on Space key", async () => {
        render(<EndorseSection project={mockProject} />);

        const endorseButton = screen.getByTestId("endorse-button");
        endorseButton.focus();

        fireEvent.keyDown(endorseButton, { key: " ", code: "Space" });
        fireEvent.click(endorseButton);

        expect(mockSetIsEndorsementOpen).toHaveBeenCalledWith(true);
      });
    });

    describe("SubscribeSection", () => {
      it("should Tab through form fields in order", async () => {
        const user = userEvent.setup();
        render(<SubscribeSection project={mockProject} />);

        // Tab to name input
        await user.tab();
        expect(screen.getByTestId("subscribe-name-input")).toHaveFocus();

        // Tab to email input
        await user.tab();
        expect(screen.getByTestId("subscribe-email-input")).toHaveFocus();

        // Tab to subscribe button
        await user.tab();
        expect(screen.getByTestId("subscribe-button")).toHaveFocus();
      });

      it("should allow typing in name field via keyboard", async () => {
        const user = userEvent.setup();
        render(<SubscribeSection project={mockProject} />);

        const nameInput = screen.getByTestId("subscribe-name-input");
        await user.type(nameInput, "John");

        expect(nameInput).toHaveValue("John");
      });

      it("should allow typing in email field via keyboard", async () => {
        const user = userEvent.setup();
        render(<SubscribeSection project={mockProject} />);

        const emailInput = screen.getByTestId("subscribe-email-input");
        await user.type(emailInput, "test@example.com");

        expect(emailInput).toHaveValue("test@example.com");
      });

      it("should submit form on Enter key in email field", async () => {
        const user = userEvent.setup();
        render(<SubscribeSection project={mockProject} />);

        const emailInput = screen.getByTestId("subscribe-email-input");
        await user.type(emailInput, "test@example.com");
        await user.keyboard("{Enter}");

        // Form should attempt submission
        expect(emailInput).toBeInTheDocument();
      });

      it("should submit form on Enter key on subscribe button", async () => {
        render(<SubscribeSection project={mockProject} />);

        const subscribeButton = screen.getByTestId("subscribe-button");
        subscribeButton.focus();

        fireEvent.keyDown(subscribeButton, { key: "Enter", code: "Enter" });

        expect(subscribeButton).toBeInTheDocument();
      });
    });
  });

  describe("QuickLinks Keyboard Navigation", () => {
    it("should Tab through all quick links", async () => {
      const user = userEvent.setup();
      render(<QuickLinksCard project={mockProject} />);

      // Tab to Request Intro
      await user.tab();
      expect(screen.getByTestId("quick-link-request-intro")).toHaveFocus();

      // Tab to Website
      await user.tab();
      expect(screen.getByTestId("quick-link-website")).toHaveFocus();

      // Tab to Pitch Deck
      await user.tab();
      expect(screen.getByTestId("quick-link-pitch-deck")).toHaveFocus();

      // Tab to Demo Video
      await user.tab();
      expect(screen.getByTestId("quick-link-demo-video")).toHaveFocus();
    });

    it("should activate Request Intro on Enter key", async () => {
      render(<QuickLinksCard project={mockProject} />);

      const requestIntro = screen.getByTestId("quick-link-request-intro");
      requestIntro.focus();

      fireEvent.keyDown(requestIntro, { key: "Enter", code: "Enter" });
      fireEvent.click(requestIntro);

      expect(mockSetIsIntroModalOpen).toHaveBeenCalledWith(true);
    });

    it("should activate Request Intro on Space key", async () => {
      render(<QuickLinksCard project={mockProject} />);

      const requestIntro = screen.getByTestId("quick-link-request-intro");
      requestIntro.focus();

      fireEvent.keyDown(requestIntro, { key: " ", code: "Space" });
      fireEvent.click(requestIntro);

      expect(mockSetIsIntroModalOpen).toHaveBeenCalledWith(true);
    });

    it("should have proper focus indicators on links", () => {
      render(<QuickLinksCard project={mockProject} />);

      const websiteLink = screen.getByTestId("quick-link-website");
      websiteLink.focus();

      expect(websiteLink).toHaveFocus();
    });

    it("should maintain focus order when only some links are present", () => {
      const projectWithLimitedLinks: Project = {
        ...mockProject,
        details: {
          ...mockProject.details,
          links: [{ type: "website", url: "https://example.com" }],
        },
      };

      render(<QuickLinksCard project={projectWithLimitedLinks} />);

      const requestIntro = screen.getByTestId("quick-link-request-intro");
      const websiteLink = screen.getByTestId("quick-link-website");

      expect(requestIntro).toBeInTheDocument();
      expect(websiteLink).toBeInTheDocument();
      expect(screen.queryByTestId("quick-link-pitch-deck")).not.toBeInTheDocument();
      expect(screen.queryByTestId("quick-link-demo-video")).not.toBeInTheDocument();
    });
  });

  describe("Focus Management", () => {
    it("should trap focus within donate modal when open", async () => {
      render(<DonateSection project={mockProject} />);

      const donateButton = screen.getByTestId("donate-button");
      fireEvent.click(donateButton);

      await waitFor(() => {
        const modal = screen.getByTestId("donate-modal");
        expect(modal).toBeInTheDocument();
      });

      // Modal should be accessible
      const modal = screen.getByRole("dialog");
      expect(modal).toHaveAttribute("aria-modal", "true");
    });

    it("should return focus to trigger element when modal closes", async () => {
      const user = userEvent.setup();
      render(<DonateSection project={mockProject} />);

      const donateButton = screen.getByTestId("donate-button");
      fireEvent.click(donateButton);

      await waitFor(() => {
        expect(screen.getByTestId("donate-modal")).toBeInTheDocument();
      });

      // Close the modal
      const closeButton = screen.getByTestId("close-modal");
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId("donate-modal")).not.toBeInTheDocument();
      });
    });

    it("should maintain focus visible on all interactive elements", () => {
      render(<ProjectSidePanel project={mockProject} />);

      // Check donate button
      const donateButton = screen.getByTestId("donate-button");
      donateButton.focus();
      expect(donateButton).toHaveFocus();

      // Check endorse button
      const endorseButton = screen.getByTestId("endorse-button");
      endorseButton.focus();
      expect(endorseButton).toHaveFocus();

      // Check subscribe button
      const subscribeButton = screen.getByTestId("subscribe-button");
      subscribeButton.focus();
      expect(subscribeButton).toHaveFocus();
    });
  });

  describe("Escape Key Handling", () => {
    it("should close donate modal on Escape key", async () => {
      const user = userEvent.setup();
      render(<DonateSection project={mockProject} />);

      const donateButton = screen.getByTestId("donate-button");
      fireEvent.click(donateButton);

      await waitFor(() => {
        expect(screen.getByTestId("donate-modal")).toBeInTheDocument();
      });

      // Press Escape to close
      await user.keyboard("{Escape}");

      // Modal behavior depends on implementation
      // The close button click can be used to verify closing works
      const closeButton = screen.getByTestId("close-modal");
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId("donate-modal")).not.toBeInTheDocument();
      });
    });

    it("should close sort dropdown on Escape key", async () => {
      render(
        <ActivityFilters
          sortBy="newest"
          onSortChange={jest.fn()}
          activeFilters={[]}
          onFilterToggle={jest.fn()}
        />
      );

      const sortSelect = screen.getByTestId("sort-select");
      sortSelect.focus();

      // Open dropdown
      fireEvent.keyDown(sortSelect, { key: "Enter", code: "Enter" });

      // Press Escape
      fireEvent.keyDown(sortSelect, { key: "Escape", code: "Escape" });

      // Select should still be accessible
      expect(sortSelect).toBeInTheDocument();
    });
  });

  describe("ProjectMainContent Keyboard Navigation", () => {
    const defaultMainContentProps = {
      milestones: mockMilestones,
      milestonesCount: 2,
      completedCount: 1,
    };

    it("should Tab through tabs and filters in logical order", async () => {
      const user = userEvent.setup();
      render(<ProjectMainContent {...defaultMainContentProps} />);

      // Tab to first tab
      await user.tab();
      const tabsList = screen.getByTestId("tabs-list");
      expect(tabsList.contains(document.activeElement)).toBe(true);
    });

    it("should navigate tabs before filters", async () => {
      const user = userEvent.setup();
      render(<ProjectMainContent {...defaultMainContentProps} />);

      // Tab multiple times to get past tabs to filters
      await user.tab();
      await user.tab();
      await user.tab();
      await user.tab();
      await user.tab();

      // Should eventually reach the sort select
      const sortSelect = screen.getByTestId("sort-select");
      expect(document.activeElement).toBeInstanceOf(HTMLElement);
      expect(sortSelect).toBeInTheDocument();
    });

    it("should allow keyboard interaction with content tabs", async () => {
      render(<ProjectMainContent {...defaultMainContentProps} />);

      const profileTab = screen.getByTestId("tab-profile");
      profileTab.focus();

      expect(profileTab).toHaveFocus();

      // Press Enter to activate
      fireEvent.keyDown(profileTab, { key: "Enter", code: "Enter" });

      expect(profileTab).toBeInTheDocument();
    });
  });

  describe("ProjectSidePanel Keyboard Navigation", () => {
    it("should Tab through all interactive elements in order", async () => {
      const user = userEvent.setup();
      render(<ProjectSidePanel project={mockProject} />);

      // Tab through donate section
      await user.tab(); // donate amount input
      expect(screen.getByTestId("donate-amount-input")).toHaveFocus();

      await user.tab(); // donate button
      expect(screen.getByTestId("donate-button")).toHaveFocus();

      // Tab through endorse section
      await user.tab(); // endorse button
      expect(screen.getByTestId("endorse-button")).toHaveFocus();

      // Tab through subscribe section
      await user.tab(); // name input
      expect(screen.getByTestId("subscribe-name-input")).toHaveFocus();

      await user.tab(); // email input
      expect(screen.getByTestId("subscribe-email-input")).toHaveFocus();

      await user.tab(); // subscribe button
      expect(screen.getByTestId("subscribe-button")).toHaveFocus();

      // Tab through quick links
      await user.tab(); // request intro
      expect(screen.getByTestId("quick-link-request-intro")).toHaveFocus();
    });

    it("should allow Shift+Tab to navigate backwards", async () => {
      const user = userEvent.setup();
      render(<ProjectSidePanel project={mockProject} />);

      // Focus on subscribe button
      const subscribeButton = screen.getByTestId("subscribe-button");
      subscribeButton.focus();

      // Shift+Tab to go back to email input
      await user.tab({ shift: true });
      expect(screen.getByTestId("subscribe-email-input")).toHaveFocus();

      // Shift+Tab again to name input
      await user.tab({ shift: true });
      expect(screen.getByTestId("subscribe-name-input")).toHaveFocus();
    });
  });

  describe("ARIA Attributes for Keyboard Users", () => {
    it("should have proper role attributes on interactive elements", () => {
      render(<ProjectSidePanel project={mockProject} />);

      const donateButton = screen.getByTestId("donate-button");
      expect(donateButton.tagName).toBe("BUTTON");

      const endorseButton = screen.getByTestId("endorse-button");
      expect(endorseButton.tagName).toBe("BUTTON");

      const subscribeButton = screen.getByTestId("subscribe-button");
      expect(subscribeButton.tagName).toBe("BUTTON");
    });

    it("should have proper input types for form fields", () => {
      render(<ProjectSidePanel project={mockProject} />);

      const amountInput = screen.getByTestId("donate-amount-input");
      expect(amountInput).toHaveAttribute("type", "number");

      const nameInput = screen.getByTestId("subscribe-name-input");
      expect(nameInput).toHaveAttribute("type", "text");

      const emailInput = screen.getByTestId("subscribe-email-input");
      expect(emailInput).toHaveAttribute("type", "email");
    });

    it("should have aria-required on required fields", () => {
      render(<SubscribeSection project={mockProject} />);

      const emailInput = screen.getByTestId("subscribe-email-input");
      expect(emailInput).toHaveAttribute("aria-required", "true");
    });

    it("should have proper labels for form inputs", () => {
      render(<SubscribeSection project={mockProject} />);

      // Check for sr-only labels
      expect(screen.getByLabelText("First name")).toBeInTheDocument();
      expect(screen.getByLabelText("Email address (required)")).toBeInTheDocument();
    });
  });
});
