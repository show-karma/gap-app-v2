import { render, screen } from "@testing-library/react";
import { InboxApplicationDetail } from "@/components/Inbox/InboxApplicationDetail";
import type { InboxItem } from "@/components/Inbox/types";

const detail = vi.fn();
vi.mock("@/components/FundingPlatform/ApplicationView/ApplicationDetailView", () => ({
  default: (props: Record<string, unknown>) => {
    detail(props);
    return <div data-testid="application-detail" />;
  },
}));

const actionItems = vi.fn();
vi.mock("@/components/Inbox/ActionItems", () => ({
  ActionItems: (props: Record<string, unknown>) => {
    actionItems(props);
    return <div data-testid="action-items" />;
  },
}));

const item: InboxItem = {
  id: "APP-1",
  kind: "application",
  bucket: "waiting",
  status: "approved",
  title: "Alpha Labs",
  programId: "992",
  chainID: 42161,
  activitySort: 0,
  referenceNumber: "APP-1",
  attentionReason: "kyb_pending",
  stageAgeDays: 6,
  nextFollowUpAt: "2099-01-01T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("InboxApplicationDetail", () => {
  it("should_open_the_same_detail_as_the_applications_page", () => {
    render(<InboxApplicationDetail item={item} communityId="filecoin" showAdminTools={false} />);

    expect(screen.getByTestId("application-detail")).toBeInTheDocument();
    expect(detail).toHaveBeenCalledWith(
      expect.objectContaining({
        applicationId: "APP-1",
        programId: "992",
        combinedProgramId: "992_42161",
        communityId: "filecoin",
        variant: "panel",
      })
    );
    expect(screen.queryByTestId("action-items")).not.toBeInTheDocument();
  });

  it("should_show_the_stage_and_the_follow_up_log_to_admins", () => {
    render(<InboxApplicationDetail item={item} communityId="filecoin" showAdminTools />);

    expect(screen.getByText("KYB pending")).toBeInTheDocument();
    expect(screen.getByText("6 days since approval")).toBeInTheDocument();
    expect(screen.getByText(/Next follow-up/)).toBeInTheDocument();
    expect(actionItems).toHaveBeenCalledWith(
      expect.objectContaining({
        communityId: "filecoin",
        target: { kind: "application", id: "APP-1" },
      })
    );
  });

  it("should_show_both_open_gates_in_the_header", () => {
    render(
      <InboxApplicationDetail
        item={{ ...item, pendingGates: ["kyb_pending", "agreement_pending"] }}
        communityId="filecoin"
        showAdminTools
      />
    );

    expect(screen.getByText("KYB pending")).toBeInTheDocument();
    expect(screen.getByText("Agreement pending")).toBeInTheDocument();
  });

  it("should_skip_the_stage_header_when_the_feed_carries_no_stage", () => {
    render(
      <InboxApplicationDetail
        item={{ ...item, attentionReason: undefined, stageAgeDays: undefined }}
        communityId="filecoin"
        showAdminTools
      />
    );

    expect(screen.queryByText("KYB pending")).not.toBeInTheDocument();
    expect(screen.getByTestId("action-items")).toBeInTheDocument();
  });
});
