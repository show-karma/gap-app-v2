/**
 * Tests for PendingVerificationTable empty state logic and row rendering.
 */

import { render, screen } from "@testing-library/react";
import {
  getEmptyStateMessage,
  PendingVerificationTable,
} from "@/components/Pages/Admin/PendingVerificationTable";
import type { PendingVerificationMilestone } from "@/hooks/usePendingVerificationMilestones";

vi.mock("@/components/Utilities/TablePagination", () => ({
  __esModule: true,
  default: (props: { totalPosts: number }) => (
    <div data-testid="table-pagination" data-total={props.totalPosts} />
  ),
}));

vi.mock("@/src/components/navigation/Link", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="#">{children}</a>,
}));

vi.mock("@/components/Utilities/ExternalLink", () => ({
  ExternalLink: ({ children }: { children: React.ReactNode }) => <a href="#">{children}</a>,
}));

function makeMilestone(
  overrides: Partial<PendingVerificationMilestone> = {}
): PendingVerificationMilestone {
  return {
    milestoneUid: "0xmilestone",
    milestoneTitle: "Milestone Title",
    completedAt: "2026-06-01T00:00:00.000Z",
    grantUid: "0xgrant",
    grantTitle: "Grant Title",
    programId: "992",
    projectUid: "0xproject",
    projectTitle: "Project Title",
    projectSlug: "project-slug",
    status: "pending_verification",
    ...overrides,
  };
}

describe("PendingVerificationTable empty state", () => {
  const userAddress = "0x1234567890abcdef1234567890abcdef12345678";
  const otherAddress = "0xabcdef1234567890abcdef1234567890abcdef12";

  describe("getEmptyStateMessage", () => {
    it("returns personal message when viewing own milestones", () => {
      expect(getEmptyStateMessage(userAddress, userAddress)).toBe(
        "All your assigned milestones are verified"
      );
    });

    it("is case-insensitive for address comparison", () => {
      expect(getEmptyStateMessage(userAddress.toUpperCase(), userAddress.toLowerCase())).toBe(
        "All your assigned milestones are verified"
      );
    });

    it("returns reviewer-specific message when viewing another reviewer", () => {
      expect(getEmptyStateMessage(otherAddress, userAddress)).toBe(
        "All milestones assigned to this reviewer are verified"
      );
    });

    it("returns reviewer-specific message when no current user address", () => {
      expect(getEmptyStateMessage(otherAddress, undefined)).toBe(
        "All milestones assigned to this reviewer are verified"
      );
    });

    it("returns generic message when no filter (all reviewers)", () => {
      expect(getEmptyStateMessage(undefined, userAddress)).toBe("All milestones are verified");
    });

    it("returns generic message when both are undefined", () => {
      expect(getEmptyStateMessage(undefined, undefined)).toBe("All milestones are verified");
    });
  });

  // DEV-365: the rendered rows must match exactly the milestones provided —
  // never more (a stale/foreign row) and never fewer than the data set.
  describe("row rendering", () => {
    const baseProps = {
      isLoading: false,
      error: null,
      communityId: "filecoin",
      page: 1,
      onPageChange: vi.fn(),
      itemsPerPage: 50,
    };

    it("renders exactly one data row per milestone", () => {
      const milestones = [
        makeMilestone({ milestoneUid: "0xa", grantUid: "0xg1", milestoneTitle: "Alpha" }),
        makeMilestone({ milestoneUid: "0xb", grantUid: "0xg2", milestoneTitle: "Beta" }),
        makeMilestone({ milestoneUid: "0xc", grantUid: "0xg3", milestoneTitle: "Gamma" }),
      ];

      const { container } = render(
        <PendingVerificationTable {...baseProps} milestones={milestones} totalItems={3} />
      );

      expect(container.querySelectorAll("tbody tr")).toHaveLength(milestones.length);
    });

    it("does not render rows that are absent from the milestones prop", () => {
      const milestones = [
        makeMilestone({ milestoneUid: "0xa", grantUid: "0xg1", milestoneTitle: "Kept" }),
      ];

      render(<PendingVerificationTable {...baseProps} milestones={milestones} totalItems={1} />);

      expect(screen.getByText("Kept")).toBeInTheDocument();
      expect(screen.queryByText("Double Cursor Ingest")).not.toBeInTheDocument();
    });

    it("passes the API total (not the visible row count) to pagination", () => {
      const milestones = [
        makeMilestone({ milestoneUid: "0xa", grantUid: "0xg1" }),
        makeMilestone({ milestoneUid: "0xb", grantUid: "0xg2" }),
      ];

      render(<PendingVerificationTable {...baseProps} milestones={milestones} totalItems={2} />);

      expect(screen.getByTestId("table-pagination")).toHaveAttribute("data-total", "2");
    });
  });
});
