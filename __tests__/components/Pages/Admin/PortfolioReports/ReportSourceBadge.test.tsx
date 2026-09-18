import { render, screen } from "@testing-library/react";
import { ReportSourceBadge } from "@/components/Pages/Admin/PortfolioReports/ReportSourceBadge";

describe("ReportSourceBadge", () => {
  it("renders an External pill for external reports", () => {
    render(<ReportSourceBadge source="external" />);
    expect(screen.getByText("External")).toBeInTheDocument();
  });

  it("renders nothing for karma reports", () => {
    const { container } = render(<ReportSourceBadge source="karma" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when source is missing (older payloads default to karma)", () => {
    const { container } = render(<ReportSourceBadge source={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });
});
