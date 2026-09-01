import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NotebookCustomViewer } from "@/components/Pages/Communities/Notebooks/NotebookCustomViewer";

vi.mock("@/src/components/navigation/Link", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const HTML = "<h1>the author's document</h1>";

/**
 * The fail-closed behaviour, which is the whole safety story when the tier is
 * not configured.
 *
 * An unconfigured environment must not quietly do something reasonable-looking
 * — the reasonable-looking thing here is to fall back to our own origin, which
 * is the exact hazard the separate origin exists to prevent. It has to fail
 * visibly and render nothing of the document.
 */
describe("NotebookCustomViewer without a sandbox origin", () => {
  it("should_say_the_tier_is_unavailable_rather_than_rendering_anything", () => {
    render(<NotebookCustomViewer communityId="filecoin" name="Custom page" />);

    expect(screen.getByText(/not available in this environment/i)).toBeInTheDocument();
  });

  it("should_render_no_iframe_at_all", () => {
    const { container } = render(
      <NotebookCustomViewer communityId="filecoin" name="Custom page" />
    );

    expect(container.querySelector("iframe")).toBeNull();
  });

  // Defence in depth. Even handed the document it must not render it, because
  // there is nowhere safe to put it — and "nowhere safe" must never resolve to
  // "our own origin".
  it("should_refuse_to_render_a_document_even_if_one_is_passed", () => {
    const { container } = render(
      <NotebookCustomViewer communityId="filecoin" name="Custom page" html={HTML} />
    );

    expect(container.querySelector("iframe")).toBeNull();
    expect(container.innerHTML).not.toContain("the author's document");
  });
});

describe("NotebookCustomViewer with a sandbox origin", () => {
  it("should_frame_the_document_on_the_sandbox_origin", () => {
    render(
      <NotebookCustomViewer
        communityId="filecoin"
        name="Custom page"
        html={HTML}
        sandboxOrigin="https://sandbox.example"
      />
    );

    const frame = screen.getByTitle("Custom page");
    expect(frame.getAttribute("src")?.startsWith("https://sandbox.example/")).toBe(true);
    expect(frame).toHaveAttribute("sandbox", "allow-scripts");
  });

  it("should_name_the_frame_after_the_authors_title_when_they_set_one", () => {
    render(
      <NotebookCustomViewer
        communityId="filecoin"
        name="Custom page"
        title="Grants overview"
        html={HTML}
        sandboxOrigin="https://sandbox.example"
      />
    );

    expect(screen.getByTitle("Grants overview")).toBeInTheDocument();
  });

  // The document reaches the frame over a port, never through the markup, so
  // it should not appear in the parent document at all.
  it("should_not_place_the_document_in_the_parent_dom", () => {
    const { container } = render(
      <NotebookCustomViewer
        communityId="filecoin"
        name="Custom page"
        html={HTML}
        sandboxOrigin="https://sandbox.example"
      />
    );

    expect(container.innerHTML).not.toContain("the author's document");
  });
});
