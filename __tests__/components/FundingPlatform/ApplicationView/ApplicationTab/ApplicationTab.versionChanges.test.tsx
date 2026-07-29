/**
 * Changes view of the Application tab: the way back to the Comments tab, the
 * deterministic scroll hand-off, and the initial version's empty state.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApplicationTab } from "@/components/FundingPlatform/ApplicationView/ApplicationTab";
import {
  ACTIVITY_TIMELINE_ANCHOR_ID,
  APPLICATION_DETAILS_ANCHOR_ID,
} from "@/components/FundingPlatform/ApplicationView/usePendingScroll";
import type { IApplicationVersion, IFundingApplication } from "@/types/funding-platform";

const editedVersion: IApplicationVersion = {
  id: "v2",
  versionNumber: 1,
  submittedBy: "0xowner",
  currentStatus: "under_review",
  createdAt: "2026-01-02T10:00:00.000Z",
  hasChanges: true,
  changeCount: 1,
  diffFromPrevious: {
    changedFields: [{ fieldLabel: "Project title", oldValue: "Old", newValue: "New" }],
  },
};

const initialVersion: IApplicationVersion = {
  id: "v1",
  versionNumber: 0,
  submittedBy: "0xowner",
  currentStatus: "under_review",
  createdAt: "2026-01-01T10:00:00.000Z",
  hasChanges: false,
  changeCount: 0,
};

let selectedVersion: IApplicationVersion | null = editedVersion;

vi.mock("@/hooks/useFundingPlatform", () => ({
  useApplicationVersions: () => ({ versions: [editedVersion, initialVersion] }),
}));

vi.mock("@/store/applicationVersions", () => ({
  useApplicationVersionsStore: () => ({ selectedVersion, selectVersion: vi.fn() }),
}));

vi.mock("@/components/FundingPlatform/ApplicationView/ApplicationVersionSelector", () => ({
  __esModule: true,
  default: () => <div data-testid="version-selector" />,
}));

vi.mock("@/components/FundingPlatform/ApplicationView/ApplicationTab/ApplicationDataView", () => ({
  ApplicationDataView: () => <div data-testid="application-data-view" />,
}));

vi.mock("@/components/FundingPlatform/ApplicationView/ApplicationTab/PostApprovalDataView", () => ({
  PostApprovalDataView: () => <div data-testid="post-approval-data-view" />,
}));

vi.mock("@/components/Utilities/MarkdownPreview", () => ({
  MarkdownPreview: ({ source }: { source: string }) => <div>{source}</div>,
}));

const application = {
  id: "app-1",
  referenceNumber: "APP-001",
  status: "under_review",
  statusHistory: [],
} as unknown as IFundingApplication;

const renderTab = (props: Partial<React.ComponentProps<typeof ApplicationTab>> = {}) =>
  render(
    <ApplicationTab
      application={application}
      viewMode="changes"
      onViewModeChange={vi.fn()}
      {...props}
    />
  );

beforeEach(() => {
  vi.clearAllMocks();
  selectedVersion = editedVersion;
});

describe("ApplicationTab changes view", () => {
  describe("Back to Comments affordance", () => {
    it("renders the back button when the diff was opened from the comments tab", () => {
      renderTab({ versionViewSourceTab: "comments", onBackToVersionSource: vi.fn() });

      expect(screen.getByRole("button", { name: /Back to Comments/i })).toBeInTheDocument();
    });

    it("does not render the back button without a source tab", () => {
      renderTab({ versionViewSourceTab: null, onBackToVersionSource: vi.fn() });

      expect(screen.queryByRole("button", { name: /Back to Comments/i })).not.toBeInTheDocument();
    });

    it("does not render the back button in details view", () => {
      renderTab({
        viewMode: "details",
        versionViewSourceTab: "comments",
        onBackToVersionSource: vi.fn(),
      });

      expect(screen.queryByRole("button", { name: /Back to Comments/i })).not.toBeInTheDocument();
    });

    it("invokes the back handler when clicked", async () => {
      const onBackToVersionSource = vi.fn();
      const user = userEvent.setup();
      renderTab({ versionViewSourceTab: "comments", onBackToVersionSource });

      await user.click(screen.getByRole("button", { name: /Back to Comments/i }));

      expect(onBackToVersionSource).toHaveBeenCalledTimes(1);
    });
  });

  describe("Pending scroll", () => {
    it("scrolls to the details anchor and reports it handled once mounted", () => {
      const scrollIntoView = vi.fn();
      Element.prototype.scrollIntoView = scrollIntoView;
      const onPendingScrollHandled = vi.fn();

      renderTab({
        pendingScrollAnchorId: APPLICATION_DETAILS_ANCHOR_ID,
        onPendingScrollHandled,
      });

      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
      expect(onPendingScrollHandled).toHaveBeenCalledTimes(1);
    });

    it("ignores a pending scroll aimed at another component's anchor", () => {
      const scrollIntoView = vi.fn();
      Element.prototype.scrollIntoView = scrollIntoView;
      const onPendingScrollHandled = vi.fn();

      renderTab({
        pendingScrollAnchorId: ACTIVITY_TIMELINE_ANCHOR_ID,
        onPendingScrollHandled,
      });

      expect(scrollIntoView).not.toHaveBeenCalled();
      expect(onPendingScrollHandled).not.toHaveBeenCalled();
    });
  });

  describe("Initial version empty state", () => {
    it("explains there is nothing to diff and offers the details view", async () => {
      selectedVersion = initialVersion;
      const onViewModeChange = vi.fn();
      const user = userEvent.setup();
      renderTab({ onViewModeChange });

      expect(screen.getByText("Original submission")).toBeInTheDocument();
      expect(screen.getByText(/no previous version to compare it against/i)).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /View application details/i }));

      expect(onViewModeChange).toHaveBeenCalledWith("details");
    });

    it("renders the diffed fields for a version that has changes", () => {
      renderTab();

      expect(screen.getByText("Project title")).toBeInTheDocument();
      expect(screen.queryByText("Original submission")).not.toBeInTheDocument();
    });
  });
});
