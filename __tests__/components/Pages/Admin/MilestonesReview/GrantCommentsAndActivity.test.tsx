import { render, screen } from "@testing-library/react";
import { GrantCommentsAndActivity } from "@/components/Pages/Admin/MilestonesReview/GrantCommentsAndActivity";

vi.mock("@/src/features/grant-comments/hooks/use-grant-comments", () => ({
  useGrantComments: vi.fn(() => ({
    comments: [],
    isLoading: false,
    error: null,
    createCommentAsync: vi.fn(),
    editCommentAsync: vi.fn(),
    deleteCommentAsync: vi.fn(),
    refetch: vi.fn(),
  })),
}));

vi.mock("@/hooks/communities/useIsCommunityAdmin", () => ({
  useIsCommunityAdmin: vi.fn(() => ({ isCommunityAdmin: false })),
}));

vi.mock("@/store", () => ({
  useOwnerStore: vi.fn((selector: (s: { isOwner: boolean }) => boolean) =>
    selector({ isOwner: false })
  ),
}));

// Capture props passed to CommentsTimeline so we can assert on them.
const mockCommentsTimeline = vi.fn();
vi.mock("@/components/FundingPlatform/ApplicationView/CommentsTimeline", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    mockCommentsTimeline(props);
    return (
      <div data-testid="comments-timeline">
        <span data-testid="enable-mentions">{String(props.enableMentions)}</span>
        <span data-testid="program-id">{String(props.programId ?? "")}</span>
        <span data-testid="reference-number">{String(props.referenceNumber ?? "")}</span>
      </div>
    );
  },
}));

const DEFAULT_PROPS = {
  projectUID: "project-123",
  programId: "program-456",
  communityId: "community-789",
  currentUserAddress: "0xabc",
};

describe("GrantCommentsAndActivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("enableMentions flag", () => {
    it("enables mentions when programId is provided", () => {
      render(<GrantCommentsAndActivity {...DEFAULT_PROPS} />);

      expect(screen.getByTestId("enable-mentions").textContent).toBe("true");
    });

    it("passes programId to CommentsTimeline", () => {
      render(<GrantCommentsAndActivity {...DEFAULT_PROPS} />);

      expect(screen.getByTestId("program-id").textContent).toBe("program-456");
    });
  });

  describe("referenceNumber prop", () => {
    it("forwards referenceNumber to CommentsTimeline when provided", () => {
      render(<GrantCommentsAndActivity {...DEFAULT_PROPS} referenceNumber="APP-001" />);

      expect(screen.getByTestId("reference-number").textContent).toBe("APP-001");
    });

    it("passes undefined referenceNumber when not provided", () => {
      render(<GrantCommentsAndActivity {...DEFAULT_PROPS} />);

      expect(screen.getByTestId("reference-number").textContent).toBe("");
    });

    it("passes both programId and referenceNumber so grantee contacts can be fetched", () => {
      render(<GrantCommentsAndActivity {...DEFAULT_PROPS} referenceNumber="APP-099" />);

      expect(mockCommentsTimeline).toHaveBeenCalledWith(
        expect.objectContaining({
          programId: "program-456",
          referenceNumber: "APP-099",
          enableMentions: true,
        })
      );
    });
  });

  describe("missing-email grantees (safe behaviour matches application timeline)", () => {
    it("renders without error when referenceNumber is undefined (grantee fetch disabled)", () => {
      // useGranteeContacts is gated on !!referenceNumber; with undefined it stays idle.
      // The component must not crash or hide the timeline.
      expect(() => render(<GrantCommentsAndActivity {...DEFAULT_PROPS} />)).not.toThrow();

      expect(screen.getByTestId("comments-timeline")).toBeInTheDocument();
    });
  });
});
