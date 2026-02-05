import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { FinancialsSummary } from "@/components/Pages/Communities/Financials/FinancialsSummary";
import type { CurrencyBreakdown, ProgramFinancialSummary } from "@/types/financials";

// Mock Skeleton
jest.mock("@/components/Utilities/Skeleton", () => ({
  Skeleton: ({ className }: { className: string }) => (
    <div data-testid="skeleton" className={className}>
      Loading...
    </div>
  ),
}));

// Mock InfoTooltip
jest.mock("@/components/Utilities/InfoTooltip", () => ({
  InfoTooltip: ({ content }: { content: ReactNode }) => (
    <div data-testid="info-tooltip">{content}</div>
  ),
}));

describe("FinancialsSummary", () => {
  const mockSummary: ProgramFinancialSummary = {
    programId: "program-123",
    programName: "Test Program",
    primaryCurrency: "USD",
    primaryTokenAddress: null,
    primaryChainID: 1,
    totalAllocated: "100000",
    totalDisbursed: "50000",
    totalRemaining: "50000",
    projectCount: 5,
  };

  it("should render all three stat cards", () => {
    render(<FinancialsSummary summary={mockSummary} isLoading={false} />);

    expect(screen.getByText("Total Allocated")).toBeInTheDocument();
    expect(screen.getByText("Total Disbursed")).toBeInTheDocument();
    expect(screen.getByText("Remaining")).toBeInTheDocument();
  });

  it("should display formatted values with currency", () => {
    render(<FinancialsSummary summary={mockSummary} isLoading={false} />);

    expect(screen.getByText("100K USD")).toBeInTheDocument();
    // "50K USD" appears twice (Total Disbursed and Remaining)
    expect(screen.getAllByText("50K USD")).toHaveLength(2);
  });

  it("should show skeletons when loading", () => {
    render(<FinancialsSummary summary={undefined} isLoading={true} />);

    expect(screen.getAllByTestId("skeleton")).toHaveLength(3);
  });

  it("should show dash when summary is undefined", () => {
    render(<FinancialsSummary summary={undefined} isLoading={false} />);

    const dashes = screen.getAllByText("-");
    expect(dashes).toHaveLength(3);
  });

  it("should display tooltip when multiple currencies exist", () => {
    const summaryWithMultipleCurrencies: ProgramFinancialSummary = {
      ...mockSummary,
      currencyBreakdown: [
        {
          currency: "USD",
          tokenAddress: null,
          chainID: 1,
          allocated: "50000",
          disbursed: "25000",
          remaining: "25000",
          grantCount: 3,
        },
        {
          currency: "ETH",
          tokenAddress: "0x123",
          chainID: 1,
          allocated: "50000",
          disbursed: "25000",
          remaining: "25000",
          grantCount: 2,
        },
      ],
    };

    render(<FinancialsSummary summary={summaryWithMultipleCurrencies} isLoading={false} />);

    expect(screen.getByTestId("info-tooltip")).toBeInTheDocument();
    expect(screen.getByText("Currency Breakdown")).toBeInTheDocument();
  });

  it("should not display tooltip when single currency", () => {
    const summaryWithSingleCurrency: ProgramFinancialSummary = {
      ...mockSummary,
      currencyBreakdown: [
        {
          currency: "USD",
          tokenAddress: null,
          chainID: 1,
          allocated: "100000",
          disbursed: "50000",
          remaining: "50000",
          grantCount: 5,
        },
      ],
    };

    render(<FinancialsSummary summary={summaryWithSingleCurrency} isLoading={false} />);

    expect(screen.queryByText("Currency Breakdown")).not.toBeInTheDocument();
  });

  it("should have correct test id", () => {
    render(<FinancialsSummary summary={mockSummary} isLoading={false} />);

    expect(screen.getByTestId("financials-summary")).toBeInTheDocument();
  });

  it("should apply correct colors to stat cards", () => {
    const { container } = render(<FinancialsSummary summary={mockSummary} isLoading={false} />);

    const colorIndicators = container.querySelectorAll('[style*="background"]');
    expect(colorIndicators.length).toBe(3);
  });
});
