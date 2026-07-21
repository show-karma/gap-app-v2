import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CandidateFinancialYear } from "@/types/donor-research";
import { FinancialsTable } from "./FinancialsTable";

function makeYear(overrides: Partial<CandidateFinancialYear> = {}): CandidateFinancialYear {
  return {
    year: 2024,
    income: 1_200_000,
    expenses: 845_000,
    assets: 3_400_000_000,
    ...overrides,
  };
}

describe("FinancialsTable", () => {
  it("renders nothing when there are no financials", () => {
    const { container } = render(<FinancialsTable financials={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders the column headers", () => {
    render(<FinancialsTable financials={[makeYear()]} />);

    expect(screen.getByRole("columnheader", { name: "Year" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Income" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Expenses" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Assets" })).toBeInTheDocument();
  });

  it("renders one row per financial year", () => {
    render(
      <FinancialsTable
        financials={[makeYear({ year: 2024 }), makeYear({ year: 2023 }), makeYear({ year: 2022 })]}
      />
    );

    expect(screen.getByRole("rowheader", { name: "2024" })).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: "2023" })).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: "2022" })).toBeInTheDocument();
  });

  it("formats money figures as compact USD", () => {
    render(
      <FinancialsTable
        financials={[makeYear({ income: 1_200_000, expenses: 845_000, assets: 3_400_000_000 })]}
      />
    );

    expect(screen.getByText("$1.2M")).toBeInTheDocument();
    expect(screen.getByText("$845K")).toBeInTheDocument();
    expect(screen.getByText("$3.4B")).toBeInTheDocument();
  });

  it("renders an em dash for null figures", () => {
    render(
      <FinancialsTable financials={[makeYear({ income: null, expenses: null, assets: null })]} />
    );

    expect(screen.getAllByText("—")).toHaveLength(3);
  });
});
