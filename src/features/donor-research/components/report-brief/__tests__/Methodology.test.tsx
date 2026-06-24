import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CompositeWeights } from "@/types/donor-research";
import { Methodology } from "../Methodology";
import { DEFAULT_WEIGHTS_BASIS_POINTS } from "../scoring";

function renderMethodology(weights: CompositeWeights | null) {
  return render(
    <Methodology
      candidatesCount={12}
      surfacedCount={3}
      geographyDiagnostic={null}
      weights={weights}
    />
  );
}

describe("Methodology weights colophon", () => {
  it("renders the legacy four rows when weights are null", () => {
    renderMethodology(null);
    const scoring = screen.getByText(/order of priority/i).closest("div") as HTMLElement;
    const list = within(scoring).getByRole("list");
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(4);
    expect(within(list).queryByText("Social presence")).not.toBeInTheDocument();
    expect(within(list).getByText("Online presence")).toBeInTheDocument();
    // Legacy online presence weight = 35%.
    expect(within(items[0]).getByText("35%")).toBeInTheDocument();
  });

  it("renders five rows from the persisted weights when present", () => {
    renderMethodology(DEFAULT_WEIGHTS_BASIS_POINTS);
    const scoring = screen
      .getByText(/at the weights set for this report/i)
      .closest("div") as HTMLElement;
    const list = within(scoring).getByRole("list");
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(5);
    expect(within(list).getByText("Social presence")).toBeInTheDocument();
    // Default online presence = 2500 bp => 25%, social = 1000 bp => 10%.
    expect(within(items[0]).getByText("25%")).toBeInTheDocument();
    expect(within(items[1]).getByText("10%")).toBeInTheDocument();
  });

  it("reflects custom weights as exact percentages", () => {
    const custom: CompositeWeights = {
      onlinePresence: 1000,
      socialPresence: 500,
      impactRecency: 2000,
      donorMatch: 3500,
      compliance: 3000,
    };
    renderMethodology(custom);
    const list = screen.getByRole("list");
    const items = within(list).getAllByRole("listitem");
    expect(within(items[3]).getByText("35%")).toBeInTheDocument(); // mission match
    expect(within(items[4]).getByText("30%")).toBeInTheDocument(); // compliance
  });
});
