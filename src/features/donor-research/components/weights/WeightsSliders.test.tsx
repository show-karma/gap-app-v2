import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CompositeWeights } from "@/types/donor-research";
import { DEFAULT_WEIGHTS_BASIS_POINTS } from "../report-brief/scoring";
import { WEIGHT_DIMENSIONS, WEIGHTS_TOTAL_BASIS_POINTS } from "./use-weights-rebalance";
import { WeightsSliders } from "./WeightsSliders";

function sum(w: CompositeWeights): number {
  return WEIGHT_DIMENSIONS.reduce((acc, d) => acc + w[d], 0);
}

describe("WeightsSliders", () => {
  it("renders five labeled sliders pre-filled with the given weights", () => {
    render(<WeightsSliders value={DEFAULT_WEIGHTS_BASIS_POINTS} onChange={() => {}} />);
    const sliders = screen.getAllByRole("slider");
    expect(sliders).toHaveLength(5);
    expect(screen.getByText("Online presence")).toBeInTheDocument();
    expect(screen.getByText("Social presence")).toBeInTheDocument();
    // Three dimensions default to 25% (online, impact, donor); social is 10%.
    expect(screen.getAllByText("25%")).toHaveLength(3);
    expect(screen.getByText("10%")).toBeInTheDocument();
  });

  it("announces all five values in a polite live region", () => {
    render(<WeightsSliders value={DEFAULT_WEIGHTS_BASIS_POINTS} onChange={() => {}} />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent(
      "Online presence 25, Social presence 10, IRS 990 recency 25, Mission match 25, Compliance 15."
    );
  });

  it("rebalances to a sum of 10000 when a slider is nudged via the keyboard", () => {
    const onChange = vi.fn();
    render(<WeightsSliders value={DEFAULT_WEIGHTS_BASIS_POINTS} onChange={onChange} />);
    const firstThumb = screen.getAllByRole("slider")[0];
    firstThumb.focus();
    fireEvent.keyDown(firstThumb, { key: "ArrowRight" });

    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as CompositeWeights;
    // Slider step is 100 bp (1%) for keyboard usability — one ArrowRight = +1%.
    expect(next.onlinePresence).toBe(DEFAULT_WEIGHTS_BASIS_POINTS.onlinePresence + 100);
    expect(sum(next)).toBe(WEIGHTS_TOTAL_BASIS_POINTS);
  });

  it("does not fire onChange when disabled", () => {
    const onChange = vi.fn();
    render(<WeightsSliders value={DEFAULT_WEIGHTS_BASIS_POINTS} onChange={onChange} disabled />);
    const firstThumb = screen.getAllByRole("slider")[0];
    firstThumb.focus();
    fireEvent.keyDown(firstThumb, { key: "ArrowRight" });
    expect(onChange).not.toHaveBeenCalled();
  });
});
