import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MessageResponse } from "@/src/components/ai-elements/message-response";

// End-to-end render tests (Streamdown NOT mocked). These guard the actual
// markdown output, which the prop-forwarding unit tests can't see. The
// find-funders narrative bug had two layers: remark-gfm being dropped (tables
// rendered as raw `| pipes |`) and `@streamdown/cjk` re-enabling single-tilde
// strikethrough (a lone `~` for "approximately" struck through everything to the
// next `~`). Render in "static" mode so output is synchronous.
describe("MessageResponse markdown rendering", () => {
  it("renders GFM tables as a <table>, not raw pipes", () => {
    const md = "| Funder | Grants |\n|---|---|\n| Patagonia.org | 2 |";
    const { container } = render(<MessageResponse mode="static">{md}</MessageResponse>);

    expect(container.querySelector("table")).not.toBeNull();
    expect(container.textContent).not.toContain("|---|");
  });

  it("does NOT strike through a single `~` used as 'approximately'", () => {
    const md = "made 9 grants totaling ~$182K (~$20K average) — a good fit";
    const { container } = render(<MessageResponse mode="static">{md}</MessageResponse>);

    expect(container.querySelector("del, s, strike")).toBeNull();
    expect(container.textContent).toContain("~$182K");
  });

  it("still strikes through genuine `~~double~~` tildes", () => {
    const { container } = render(
      <MessageResponse mode="static">{"price ~~$182K~~"}</MessageResponse>
    );

    expect(container.querySelector("del, s, strike")).not.toBeNull();
  });
});
