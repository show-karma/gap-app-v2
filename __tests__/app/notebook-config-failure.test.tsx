import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import NotebookError from "@/app/community/[communityId]/(cover)/notebooks/[slug]/error";
import NotebookListError from "@/app/community/[communityId]/(cover)/notebooks/error";

vi.mock("@/src/components/navigation/Link", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

/**
 * CB1. A failed CONFIG fetch used to surface as "not found", which reads as
 * "this community/page does not exist" when the community plainly does — it
 * sent people to look at community data instead of at the configuration
 * service. These assertions keep the two causes named separately.
 */
describe("notebook configuration failure copy", () => {
  it.each([
    ["the viewer", NotebookError],
    ["the list", NotebookListError],
  ])("%s names the configuration as what failed", (_label, Component) => {
    render(<Component error={new Error("boom")} reset={() => {}} />);

    expect(screen.getByRole("heading", { name: /configuration/i })).toBeInTheDocument();
  });

  it.each([
    ["the viewer", NotebookError],
    ["the list", NotebookListError],
  ])("%s does not blame the community for a config failure", (_label, Component) => {
    render(<Component error={new Error("boom")} reset={() => {}} />);

    expect(screen.queryByText(/community not found/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/page not found/i)).not.toBeInTheDocument();
  });

  it.each([
    ["the viewer", NotebookError],
    ["the list", NotebookListError],
  ])("%s says explicitly that the community itself is fine", (_label, Component) => {
    render(<Component error={new Error("boom")} reset={() => {}} />);

    expect(screen.getByText(/community.*(is fine|are fine)/i)).toBeInTheDocument();
  });

  it("still offers a retry", () => {
    render(<NotebookError error={new Error("boom")} reset={() => {}} />);

    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("surfaces the digest so a report can be traced to a log line", () => {
    const error = Object.assign(new Error("boom"), { digest: "abc123" });
    render(<NotebookError error={error} reset={() => {}} />);

    expect(screen.getByText(/abc123/)).toBeInTheDocument();
  });
});
