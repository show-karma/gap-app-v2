/**
 * @file Tests for CommentRow — display name + relative time, advisor
 * badge, body sanitization fidelity (entity decode, no script eval),
 * newline-to-<br>, recursive replies with the depth-4 collapse, and
 * the Reply button wiring.
 */

import { fireEvent, render, screen, within } from "@testing-library/react";

import { CommentRow } from "@/src/features/donor-research/components/shared-view/CommentRow";
import type { SharedReportCommentNode } from "@/types/donor-research-comments";

function makeNode(overrides: Partial<SharedReportCommentNode> = {}): SharedReportCommentNode {
  return {
    id: "n1",
    parentCommentId: null,
    isAdvisor: false,
    displayName: "Donor Dana",
    anchor: { kind: "section", sectionKey: "methodology" },
    body: "Looks good",
    createdAt: new Date(Date.now() - 30_000).toISOString(),
    children: [],
    ...overrides,
  };
}

describe("CommentRow", () => {
  it("renders displayName, relative time, and body", () => {
    render(<CommentRow node={makeNode({ body: "Hello there" })} onReply={() => {}} />);
    expect(screen.getByText("Donor Dana")).toBeInTheDocument();
    expect(screen.getByText("just now")).toBeInTheDocument();
    expect(screen.getByText("Hello there")).toBeInTheDocument();
  });

  it("renders the Advisor badge when isAdvisor=true", () => {
    render(<CommentRow node={makeNode({ isAdvisor: true })} onReply={() => {}} />);
    expect(screen.getByText(/advisor/i)).toBeInTheDocument();
  });

  it("does NOT render the Advisor badge when isAdvisor=false", () => {
    render(<CommentRow node={makeNode({ isAdvisor: false })} onReply={() => {}} />);
    expect(screen.queryByText(/^advisor$/i)).not.toBeInTheDocument();
  });

  it("escapes HTML in the body — a <script> stays inert text", () => {
    const malicious = "&lt;script&gt;alert(1)&lt;/script&gt;";
    const { container } = render(
      <CommentRow node={makeNode({ body: malicious })} onReply={() => {}} />
    );
    // The decoded payload is rendered as text (React auto-escapes children).
    expect(container.querySelector("script")).toBeNull();
    expect(container.textContent).toContain("<script>alert(1)</script>");
  });

  it("renders newlines as visual line breaks", () => {
    const { container } = render(
      <CommentRow node={makeNode({ body: "line1\nline2\nline3" })} onReply={() => {}} />
    );
    const brs = container.querySelectorAll("br");
    expect(brs.length).toBe(2);
  });

  it("decodes the four backend-sanitized entities", () => {
    const { container } = render(
      <CommentRow
        node={makeNode({ body: "5 &gt; 2 &amp;&amp; 3 &lt; 4 &quot;ok&quot; &#39;y&#39;" })}
        onReply={() => {}}
      />
    );
    expect(container.textContent).toContain(`5 > 2 && 3 < 4 "ok" 'y'`);
  });

  it("invokes onReply(node.id) when the Reply button is clicked", () => {
    const onReply = vi.fn();
    render(<CommentRow node={makeNode({ id: "abc" })} onReply={onReply} />);
    fireEvent.click(screen.getByRole("button", { name: /reply/i }));
    expect(onReply).toHaveBeenCalledWith("abc");
  });

  it("recursively renders child replies up to depth 4", () => {
    const tree = makeNode({
      id: "root",
      children: [
        makeNode({
          id: "c1",
          displayName: "L1",
          children: [
            makeNode({
              id: "c2",
              displayName: "L2",
              children: [makeNode({ id: "c3", displayName: "L3" })],
            }),
          ],
        }),
      ],
    });
    render(<CommentRow node={tree} onReply={() => {}} />);
    expect(screen.getByText("L1")).toBeInTheDocument();
    expect(screen.getByText("L2")).toBeInTheDocument();
    expect(screen.getByText("L3")).toBeInTheDocument();
  });

  it("collapses replies at depth >= 4 behind a 'Show N more replies' disclosure", () => {
    const depth5 = makeNode({
      id: "depth5",
      displayName: "Deep",
      children: [makeNode({ id: "depth6", displayName: "Even Deeper" })],
    });
    // Render the depth-5 row directly to exercise the per-row collapse.
    render(<CommentRow node={depth5} depth={5} onReply={() => {}} />);
    expect(screen.queryByText("Even Deeper")).not.toBeInTheDocument();
    const disclosure = screen.getByRole("button", { name: /show 1 more reply/i });
    fireEvent.click(disclosure);
    expect(screen.getByText("Even Deeper")).toBeInTheDocument();
  });

  it("renders the 'Sending…' indicator on optimistic rows", () => {
    render(<CommentRow node={makeNode({ _optimistic: true })} onReply={() => {}} />);
    expect(screen.getByText(/sending/i)).toBeInTheDocument();
  });
});
