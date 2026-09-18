import { render, screen } from "@testing-library/react";
import { ExternalReportFrame } from "@/components/Pages/Community/PortfolioReports/ExternalReportFrame";

const DOC =
  "<!DOCTYPE html><html><head><style>body{color:red}</style></head><body><h1>Hi</h1></body></html>";

describe("ExternalReportFrame", () => {
  it("renders the document verbatim in a sandboxed iframe", () => {
    render(<ExternalReportFrame html={DOC} title="Portfolio report — March 2026" />);

    const frame = screen.getByTitle("Portfolio report — March 2026");
    expect(frame.tagName).toBe("IFRAME");
    // Verbatim: no Karma CSS injected, no rewriting of the agent's markup.
    expect(frame).toHaveAttribute("srcdoc", DOC);
    // Fully locked sandbox: no scripts, no same-origin access.
    expect(frame).toHaveAttribute("sandbox", "");
    expect(frame.getAttribute("sandbox")).not.toMatch(/allow-/);
  });

  it("renders an empty state instead of a blank frame when there is no content", () => {
    render(<ExternalReportFrame html="   " title="Empty report" />);

    expect(screen.getByText(/no content yet/i)).toBeInTheDocument();
    expect(screen.queryByTitle("Empty report")).not.toBeInTheDocument();
  });
});
