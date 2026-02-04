import { render, screen } from "@testing-library/react";
import { FinancialsEmptyState } from "@/components/Pages/Communities/Financials/FinancialsEmptyState";

// Mock next/image
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} data-testid="image" />
  ),
}));

describe("FinancialsEmptyState", () => {
  it("should show no programs message when hasPrograms is false", () => {
    render(<FinancialsEmptyState hasPrograms={false} />);

    expect(screen.getByText("No programs available")).toBeInTheDocument();
    expect(
      screen.getByText(
        "This community doesn't have any funding programs yet. Check back later for updates."
      )
    ).toBeInTheDocument();
    expect(screen.getByTestId("financials-no-programs")).toBeInTheDocument();
  });

  it("should show select program message when hasPrograms is true", () => {
    render(<FinancialsEmptyState hasPrograms={true} />);

    expect(screen.getByText("Select a program")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Choose a funding program above to view its financial overview and project-level disbursement status."
      )
    ).toBeInTheDocument();
    expect(screen.getByTestId("financials-select-program")).toBeInTheDocument();
  });

  it("should render illustration image", () => {
    render(<FinancialsEmptyState hasPrograms={false} />);

    const image = screen.getByTestId("image");
    expect(image).toHaveAttribute("src", "/images/comments.png");
  });
});
