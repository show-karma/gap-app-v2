import { fireEvent, render, screen } from "@testing-library/react";
import { SimComments } from "../SimComments";

const mockUseSimocracyComments = vi.fn();
vi.mock("@/hooks/useApplicationIntegrations", () => ({
  useSimocracyComments: (referenceNumber: string) => mockUseSimocracyComments(referenceNumber),
}));

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

  it("renders nothing when there are no comments", () => {
    mockUseSimocracyComments.mockReturnValue({
      data: { comments: [], forbidden: false },
    });
    const { container } = render(<SimComments referenceNumber="APP-1" />);
    expect(container).toBeEmptyDOMElement();
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
});
