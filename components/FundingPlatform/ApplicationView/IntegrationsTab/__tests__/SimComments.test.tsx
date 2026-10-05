import { fireEvent, render, screen } from "@testing-library/react";
import { SimComments } from "../SimComments";

const mockUseSimocracyComments = vi.fn();
const mockUseSimocracyMilestoneVerdicts = vi.fn(() => ({ data: undefined }));
const mockUseSimocracyFeedback = vi.fn(() => ({ data: [] }));
vi.mock("@/hooks/useSimocracyMilestoneVerdicts", () => ({
  useSimocracyMilestoneVerdicts: (referenceNumber: string, options?: { enabled?: boolean }) =>
    mockUseSimocracyMilestoneVerdicts(referenceNumber, options),
  useApproveSimocracyVerdict: () => ({ mutate: vi.fn(), isPending: false }),
  useDismissSimocracyVerdict: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("@/hooks/useApplicationIntegrations", () => ({
  useSimocracyComments: (referenceNumber: string) => mockUseSimocracyComments(referenceNumber),
  useSimocracyCouncil: () => ({ data: undefined }),
  useSimocracyProgramSummary: () => ({ data: undefined }),
  useSimocracyFeedback: () => mockUseSimocracyFeedback(),
  useSubmitSimocracyFeedback: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode;
    value: string;
    onValueChange: (next: string) => void;
  }) => (
    <div data-testid="revision-select" data-value={value}>
      <div style={{ display: "none" }}>{children}</div>
      <select
        aria-label="Verdict version"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
      >
        <option value="1">1</option>
        <option value="2">2</option>
        <option value="3">3</option>
      </select>
    </div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <span data-testid={`revision-option-${value}`}>{children}</span>
  ),
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
  const text =
    (overrides.text as string | undefined) ?? "Demonstrated. The repo shows the release.";
  const revision = (overrides.revision as number | undefined) ?? 1;
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
    dismissedAt: null,
    dismissedBy: null,
    updatedAt: "2026-09-30T00:00:00.000Z",
    mayAct: true,
    canPublish: true,
    publishBlocker: null,
    feedback: [],
    revisions: [
      {
        revision,
        text,
        submittedAt: "2026-09-30T00:00:00.000Z",
        outcome: "current",
        publishedAt: null,
        dismissedAt: null,
        dismissedBy: null,
        feedback: [],
      },
    ],
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
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSimocracyFeedback.mockReturnValue({ data: [] });
  });

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

      expect(screen.getByRole("button", { name: "Pending review (1)" })).toHaveAttribute(
        "aria-pressed",
        "true"
      );
      expect(screen.getByRole("heading", { name: "Milestone 1" })).toBeInTheDocument();
      expect(screen.getByText("Demonstrated. The repo shows the release.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^publish$/i })).toBeEnabled();
      // The public comment is not a verdict card, so it stays in the thread below.
      expect(screen.getByRole("heading", { name: "Public thread" })).toBeInTheDocument();
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
      // Starts on the pending filter; the published card is one chip away.
      expect(screen.queryByText("Already public.")).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Published (1)" }));
      expect(screen.getByText("Already public.")).toBeInTheDocument();
      expect(
        screen.queryByText("Demonstrated. The repo shows the release.")
      ).not.toBeInTheDocument();
    });

    it("disables publishing with the reason when the viewer does not own the Sim", () => {
      mockUseSimocracyComments.mockReturnValue({
        data: { programId: "1", comments: [], forbidden: false },
        isLoading: false,
      });
      mockUseSimocracyMilestoneVerdicts.mockReturnValue({
        data: {
          verdicts: [
            pendingVerdict({ mayAct: false, canPublish: false, publishBlocker: "not_sim_owner" }),
          ],
          forbidden: false,
        },
      });

      render(<SimComments referenceNumber="APP-1" review />);

      expect(screen.getByRole("button", { name: /^publish$/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /^dismiss$/i })).toBeDisabled();
      expect(screen.getByText(/only this sim's owner/i)).toBeInTheDocument();
    });

    it("lets the reviewer read an earlier version with its own feedback and publish it", () => {
      mockUseSimocracyComments.mockReturnValue({
        data: { programId: "1", comments: [], forbidden: false },
        isLoading: false,
      });
      mockUseSimocracyMilestoneVerdicts.mockReturnValue({
        data: {
          verdicts: [
            pendingVerdict({
              revision: 2,
              text: "Second look: demonstrated.",
              revisions: [
                {
                  revision: 2,
                  text: "Second look: demonstrated.",
                  submittedAt: "2026-10-01T00:00:00.000Z",
                  outcome: "current",
                  publishedAt: null,
                  dismissedAt: null,
                  dismissedBy: null,
                  feedback: [],
                },
                {
                  revision: 1,
                  text: "First look: not demonstrated.",
                  submittedAt: "2026-09-30T00:00:00.000Z",
                  outcome: "dismissed",
                  publishedAt: null,
                  dismissedAt: "2026-09-30T12:00:00.000Z",
                  dismissedBy: "0xabcdef0000000000000000000000000000000002",
                  feedback: [
                    {
                      authorAddress: "0xabcdef0000000000000000000000000000000003",
                      authorName: "QA Advisor",
                      verdict: "down",
                      comment: "Too harsh",
                      revision: 1,
                      createdAt: "2026-09-30T10:00:00.000Z",
                    },
                  ],
                },
              ],
            }),
          ],
          forbidden: false,
        },
      });

      mockUseSimocracyFeedback.mockReturnValue({
        data: [
          {
            simUri: "at://did:plc:host/org.simocracy.sim/s1",
            commentUri: "at://did:plc:host/org.impactindexer.review.comment/ms-1-s1",
            authorAddress: "0xabcdef0000000000000000000000000000000003",
            authorName: "QA Advisor",
            verdict: "down",
            comment: "Too harsh",
            revision: 1,
          },
        ],
      });

      render(
        <SimComments
          referenceNumber="APP-1"
          review
          feedback={{
            referenceNumber: "APP-1",
            viewerAddresses: new Set(["0xviewer"]),
            canGiveFeedback: () => true,
          }}
        />
      );

      expect(screen.getByText("Second look: demonstrated.")).toBeInTheDocument();
      // On the latest version the old note is listed with the version it was about.
      expect(screen.getByText("on v1")).toBeInTheDocument();
      expect(screen.getByTestId("revision-option-1")).toHaveTextContent(/v1 · dismissed/);

      fireEvent.change(screen.getByRole("combobox", { name: "Verdict version" }), {
        target: { value: "1" },
      });

      expect(screen.getByText("First look: not demonstrated.")).toBeInTheDocument();
      expect(
        screen.getByText(/viewing v1, dismissed by 0xabcd...000002\. the sim's latest is v2/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/QA Advisor/)).toBeInTheDocument();
      expect(screen.getByText(/Too harsh/)).toBeInTheDocument();
      expect(screen.queryByText("on v1")).not.toBeInTheDocument();
      // The earlier version can go live too; Dismiss only applies to the latest.
      expect(screen.getByRole("button", { name: "Publish v1" })).toBeEnabled();
      expect(screen.queryByRole("button", { name: /^dismiss$/i })).not.toBeInTheDocument();
    });

    it("counts a pair under Published and Pending at once and opens on the live version", () => {
      mockUseSimocracyComments.mockReturnValue({
        data: { programId: "1", comments: [], forbidden: false },
        isLoading: false,
      });
      mockUseSimocracyMilestoneVerdicts.mockReturnValue({
        data: {
          verdicts: [
            pendingVerdict({
              revision: 3,
              publishedRevision: 1,
              text: "Third take.",
              revisions: [
                {
                  revision: 3,
                  text: "Third take.",
                  submittedAt: "2026-10-01T00:00:00.000Z",
                  outcome: "current",
                  publishedAt: null,
                  dismissedAt: null,
                  dismissedBy: null,
                  feedback: [],
                },
                {
                  revision: 1,
                  text: "First take.",
                  submittedAt: "2026-09-30T00:00:00.000Z",
                  outcome: "published",
                  publishedAt: "2026-09-30T12:00:00.000Z",
                  dismissedAt: null,
                  dismissedBy: null,
                  feedback: [],
                },
              ],
            }),
          ],
          forbidden: false,
        },
      });

      render(<SimComments referenceNumber="APP-1" review />);

      expect(screen.getByRole("button", { name: "Pending review (1)" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Published (1)" })).toBeInTheDocument();
      expect(screen.getByText("Third take.")).toBeInTheDocument();
      expect(screen.getByText("New version · v1 live")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Published (1)" }));

      expect(screen.getByText("First take.")).toBeInTheDocument();
      expect(screen.getByText("Live on Simocracy · v3 pending")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Publish v1" })).toBeDisabled();
    });

    it("keeps a dismissed verdict visible to reviewers, still publishable", () => {
      mockUseSimocracyComments.mockReturnValue({
        data: { programId: "1", comments: [], forbidden: false },
        isLoading: false,
      });
      mockUseSimocracyMilestoneVerdicts.mockReturnValue({
        data: {
          verdicts: [
            pendingVerdict({
              status: "dismissed",
              canPublish: false,
              publishBlocker: "dismissed",
              dismissedBy: "0xabcdef0000000000000000000000000000000002",
              dismissedAt: "2026-09-30T00:00:00.000Z",
            }),
          ],
          forbidden: false,
        },
      });

      render(<SimComments referenceNumber="APP-1" review />);

      // Nothing pending, so the desk opens on "All" and the dismissed card is visible.
      expect(screen.getByRole("button", { name: "All (1)" })).toHaveAttribute(
        "aria-pressed",
        "true"
      );
      expect(screen.getByText("Dismissed", { selector: "span" })).toBeInTheDocument();
      expect(screen.getByText(/set aside by 0xabcd...000002/i)).toBeInTheDocument();
      // A dismissed version can still be published later; nothing is left to dismiss.
      expect(screen.getByRole("button", { name: /^publish$/i })).toBeEnabled();
      expect(screen.queryByRole("button", { name: /^dismiss$/i })).not.toBeInTheDocument();
    });
  });
});
