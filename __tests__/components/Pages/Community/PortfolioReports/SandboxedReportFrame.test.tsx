import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HtmlReportFrame } from "@/components/Pages/Community/PortfolioReports/HtmlReportFrame";
import { SandboxedReportFrame } from "@/components/Pages/Community/PortfolioReports/SandboxedReportFrame";

describe("SandboxedReportFrame", () => {
  it("uses an iframe for imported content through the shared report renderer", () => {
    render(<HtmlReportFrame html="<h1>Imported</h1>" title="Imported" isolated />);
    expect(screen.getByTitle("Imported").tagName).toBe("IFRAME");
  });

  it("preserves the generated report renderer for existing content", () => {
    render(<HtmlReportFrame html="<h1>Generated</h1>" title="Generated" />);
    expect(screen.getByLabelText("Generated").shadowRoot?.textContent).toContain("Generated");
    expect(screen.queryByTitle("Generated")).not.toBeInTheDocument();
  });
  it("isolates imported HTML with no script or same-origin permissions", () => {
    render(
      <SandboxedReportFrame
        html="<h1>Report</h1><script>alert(1)</script>"
        title="Customer report"
      />
    );
    const frame = screen.getByTitle("Customer report");
    expect(frame).toHaveAttribute("sandbox", "");
    expect(frame).toHaveAttribute("referrerpolicy", "no-referrer");
    expect(frame.getAttribute("srcdoc")).toContain("script-src 'none'");
    expect(frame.getAttribute("srcdoc")).toContain("connect-src 'none'");
    expect(frame.getAttribute("srcdoc")).toContain("<h1>Report</h1>");
    expect(frame.getAttribute("srcdoc")).not.toContain("<script>");
  });

  it("places trusted policy before customer styles", () => {
    render(
      <SandboxedReportFrame
        html={
          '<html><head><meta http-equiv="Content-Security-Policy" content="script-src *"><style>body{display:grid}</style></head><body><h1>Report</h1></body></html>'
        }
        title="Customer report"
      />
    );
    const srcdoc = screen.getByTitle("Customer report").getAttribute("srcdoc") ?? "";
    expect(srcdoc.indexOf("script-src 'none'")).toBeLessThan(srcdoc.indexOf("<style>"));
    expect(srcdoc).not.toContain("script-src *");
    expect(srcdoc).toContain("body{display:grid}");
  });

  it("preserves document classes, direction, and inline body styling", () => {
    render(
      <SandboxedReportFrame
        html='<html lang="en" class="report"><head><style>.report .page{padding:24px}</style></head><body class="page" dir="ltr" style="margin:0"><h1>Report</h1></body></html>'
        title="Styled report"
      />
    );
    const doc = new DOMParser().parseFromString(
      screen.getByTitle("Styled report").getAttribute("srcdoc") ?? "",
      "text/html"
    );
    expect(doc.documentElement.getAttribute("class")).toBe("report");
    expect(doc.documentElement.getAttribute("lang")).toBe("en");
    expect(doc.body.getAttribute("class")).toBe("page");
    expect(doc.body.getAttribute("dir")).toBe("ltr");
    expect(doc.body.getAttribute("style")).toBe("margin:0");
  });
});
