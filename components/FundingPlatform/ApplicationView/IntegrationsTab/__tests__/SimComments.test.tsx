import { fireEvent, render, screen } from "@testing-library/react";
import { SimComments } from "../SimComments";

const mockUseSimocracyComments = vi.fn();
const mockUseSimocracyMilestoneVerdicts = vi.fn(() => ({ data: undefined }));
vi.mock("@/hooks/useSimocracyMilestoneVerdicts", () => ({
  useSimocracyMilestoneVerdicts: (referenceNumber: string, options?: { enabled?: boolean }) =>
    mockUseSimocracyMilestoneVerdicts(referenceNumber, options),
  useApproveSimocracyVerdict: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("@/hooks/useApplicationIntegrations", () => ({
  useSimocracyComments: (referenceNumber: string) => mockUseSimocracyComments(referenceNumber),
  useSimocracyCouncil: () => ({ data: undefined }),
  useSimocracyProgramSummary: () => ({ data: undefined }),
  useSimocracyFeedback: () => ({ data: [] }),
  useSubmitSimocracyFeedback: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

function pendingVerdict(overrides: Record<string, unknown> = {}) {
  return {
    verdictId: "v1",
    milestoneUid: "0xm1",
    milestoneTitle: "Milestone 1",
    simUri: "at://did:plc:host/org.simocracy.sim/s1",
    simName: "S1",
    commentUri: "at://did:plc:host/org.impactindexer.review.comment/ms-1-s1",
    text: "Demonstrated. The repo shows the release.",
    status: "pending_review",
    revision: 1,
    publishedRevision: null,
    publishedAt: null,
    publishedBy: null,
    updatedAt: "2026-09-30T00:00:00.000Z",
    canPublish: true,
    publishBlocker: null,
    feedback: [],
    ...overrides,
  };
}

// The markdown renderer lazy-loads streamdown; render its source verbatim so
// the tests exercise SimComments (threading, author, toggle), not the renderer.
vi.mock("@/components/Utilities/MarkdownPreview", () => ({
  MarkdownPreview: ({ source }: { source?: string }) => <div>{source}</div>,
}));

function comment(overrides: Record<string, unknown> = {}) {
  return {
    commentUri: "at://did:plc:owner1/org.impactindexer.review.comment/c1",
    authorDid: "did:plc:owner1",
    authorName: "Marta (FilPGF)",
    text: "VERDICT: FUND REDUCED",
    referenceNumber: "APP-1",
    proposalUri: "at://x/org.hypercerts.claim.activity/p1",
    parentCommentUri: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("SimComments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders nothing when the viewer is forbidden", () => {
    mockUseSimocracyComments.mockReturnValue({
      data: { comments: [], forbidden: true },
    });
    const { container } = render(<SimComments referenceNumber="APP-1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("says so when there are no comments yet", () => {
    mockUseSimocracyComments.mockReturnValue({
      data: { comments: [], forbidden: false },
    });
    render(<SimComments referenceNumber="APP-1" />);
    expect(
      screen.getByText(/No published Sim evaluations on this application yet/)
    ).toBeInTheDocument();
  });

  it("renders the author name and text for an authorized viewer", () => {
    mockUseSimocracyComments.mockReturnValue({
      data: { comments: [comment()], forbidden: false },
    });
    render(<SimComments referenceNumber="APP-1" />);
    expect(screen.getByText("Marta (FilPGF)")).toBeInTheDocument();
    expect(screen.getByText("VERDICT: FUND REDUCED")).toBeInTheDocument();
  });

  it("nests a reply under its parent comment", () => {
    const parent = comment();
    const reply = comment({
      commentUri: "at://did:plc:owner2/org.impactindexer.review.comment/c2",
      authorName: "Josh (FilPGF)",
      text: "I disagree on the allocation",
      parentCommentUri: parent.commentUri,
    });
    mockUseSimocracyComments.mockReturnValue({
      data: { comments: [parent, reply], forbidden: false },
    });
    render(<SimComments referenceNumber="APP-1" />);
    expect(screen.getByText("I disagree on the allocation")).toBeInTheDocument();
    expect(screen.getByText("Josh (FilPGF)")).toBeInTheDocument();
  });

  it("shows a Show more toggle for a long comment and expands on click", () => {
    mockUseSimocracyComments.mockReturnValue({
      data: {
        comments: [comment({ text: "x".repeat(400) })],
        forbidden: false,
      },
    });
    render(<SimComments referenceNumber="APP-1" />);

    const toggle = screen.getByRole("button", { name: "Show more" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Show less" })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
  });

  it("does not show a toggle for a short comment", () => {
    mockUseSimocracyComments.mockReturnValue({
      data: { comments: [comment({ text: "short one" })], forbidden: false },
    });
    render(<SimComments referenceNumber="APP-1" />);
    expect(screen.queryByRole("button", { name: /show more/i })).toBeNull();
  });

  it("falls back to a shortened DID when there is no author name", () => {
    mockUseSimocracyComments.mockReturnValue({
      data: {
        comments: [comment({ authorName: null, authorDid: "did:plc:abcdefghijklmnop" })],
        forbidden: false,
      },
    });
    render(<SimComments referenceNumber="APP-1" />);
    expect(screen.getByText(/did:plc:abcd/)).toBeInTheDocument();
  });

  describe("review surfaces", () => {
    it("never asks for drafts on a public page", () => {
      mockUseSimocracyComments.mockReturnValue({
        data: { programId: "1", comments: [comment()], forbidden: false },
        isLoading: false,
      });

      render(<SimComments referenceNumber="APP-1" />);

      expect(mockUseSimocracyMilestoneVerdicts).toHaveBeenCalledWith("APP-1", { enabled: false });
      expect(screen.queryByText(/awaiting review/i)).not.toBeInTheDocument();
    });

    it("shows drafts awaiting review above the published comments for a reviewer", () => {
      mockUseSimocracyComments.mockReturnValue({
        data: { programId: "1", comments: [comment()], forbidden: false },
        isLoading: false,
      });
      mockUseSimocracyMilestoneVerdicts.mockReturnValue({
        data: { verdicts: [pendingVerdict()], forbidden: false },
      });

      render(<SimComments referenceNumber="APP-1" review />);

      expect(screen.getByText("Awaiting your review")).toBeInTheDocument();
      expect(screen.getByText("Demonstrated. The repo shows the release.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^publish$/i })).toBeEnabled();
      expect(screen.getByText("VERDICT: FUND REDUCED")).toBeInTheDocument();
    });

    it("keeps only the selected milestone's drafts and hides published ones", () => {
      mockUseSimocracyComments.mockReturnValue({
        data: { programId: "1", comments: [], forbidden: false },
        isLoading: false,
      });
      mockUseSimocracyMilestoneVerdicts.mockReturnValue({
        data: {
          verdicts: [
            pendingVerdict(),
            pendingVerdict({ verdictId: "v2", milestoneUid: "0xother", text: "Other milestone." }),
            pendingVerdict({
              verdictId: "v3",
              status: "published",
              publishedRevision: 1,
              text: "Already public.",
            }),
          ],
          forbidden: false,
        },
      });

      render(
        <SimComments
          referenceNumber="APP-1"
          review
          milestone={{ uid: "0xM1", title: "Milestone 1" }}
        />
      );

      expect(screen.getByText("Demonstrated. The repo shows the release.")).toBeInTheDocument();
      expect(screen.queryByText("Other milestone.")).not.toBeInTheDocument();
      expect(screen.queryByText("Already public.")).not.toBeInTheDocument();
    });

    it("disables publishing with the reason when the viewer does not own the Sim", () => {
      mockUseSimocracyComments.mockReturnValue({
        data: { programId: "1", comments: [], forbidden: false },
        isLoading: false,
      });
      mockUseSimocracyMilestoneVerdicts.mockReturnValue({
        data: {
          verdicts: [pendingVerdict({ canPublish: false, publishBlocker: "not_sim_owner" })],
          forbidden: false,
        },
      });

      render(<SimComments referenceNumber="APP-1" review />);

      expect(screen.getByRole("button", { name: /^publish$/i })).toBeDisabled();
      expect(screen.getByText(/only this sim's owner/i)).toBeInTheDocument();
    });
  });
});
