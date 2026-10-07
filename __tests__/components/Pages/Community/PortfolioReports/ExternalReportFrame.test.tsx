import { render, screen } from "@testing-library/react";
import { ExternalReportFrame } from "@/components/Pages/Community/PortfolioReports/ExternalReportFrame";

const DOC =
  "<!DOCTYPE html><html><head><style>body{color:red}</style></head><body><h1>Hi</h1></body></html>";

describe("ExternalReportFrame", () => {
  it("renders the document in a fully locked sandboxed iframe", async () => {
    render(<ExternalReportFrame html={DOC} title="Portfolio report — March 2026" />);

    const frame = await screen.findByTitle("Portfolio report — March 2026");
    expect(frame.tagName).toBe("IFRAME");
    expect(frame).toHaveAttribute("sandbox", "");
    expect(frame.getAttribute("sandbox")).not.toMatch(/allow-/);
    expect(frame).toHaveAttribute("referrerpolicy", "no-referrer");
    expect(frame.getAttribute("srcdoc")).toContain("<h1>Hi</h1>");
    expect(frame.getAttribute("srcdoc")).toContain("body{color:red}");
  });

  it("strips scripts and places the CSP before customer styles", async () => {
    render(
      <ExternalReportFrame
        html='<html><head><meta http-equiv="Content-Security-Policy" content="script-src *"><style>body{display:grid}</style></head><body><h1>Report</h1><script>alert(1)</script></body></html>'
        title="Customer report"
      />
    );

    const srcdoc = (await screen.findByTitle("Customer report")).getAttribute("srcdoc") ?? "";
    expect(srcdoc).toContain("script-src 'none'");
    expect(srcdoc).toContain("connect-src 'none'");
    expect(srcdoc).not.toContain("script-src *");
    expect(srcdoc).not.toContain("<script>");
    expect(srcdoc.indexOf("script-src 'none'")).toBeLessThan(srcdoc.indexOf("<style>"));
    expect(srcdoc).toContain("body{display:grid}");
  });

  it("preserves document classes, direction, and inline body styling", async () => {
    render(
      <ExternalReportFrame
        html='<html lang="en" class="report"><head><style>.report .page{padding:24px}</style></head><body class="page" dir="ltr" style="margin:0"><h1>Report</h1></body></html>'
        title="Styled report"
      />
    );

    const doc = new DOMParser().parseFromString(
      (await screen.findByTitle("Styled report")).getAttribute("srcdoc") ?? "",
      "text/html"
    );
    expect(doc.documentElement.getAttribute("class")).toBe("report");
    expect(doc.documentElement.getAttribute("lang")).toBe("en");
    expect(doc.body.getAttribute("class")).toBe("page");
    expect(doc.body.getAttribute("dir")).toBe("ltr");
    expect(doc.body.getAttribute("style")).toBe("margin:0");
  });

  it("renders an empty state instead of a blank frame when there is no content", () => {
    render(<ExternalReportFrame html="   " title="Empty report" />);

    expect(screen.getByText(/no content yet/i)).toBeInTheDocument();
    expect(screen.queryByTitle("Empty report")).not.toBeInTheDocument();
  });
});
