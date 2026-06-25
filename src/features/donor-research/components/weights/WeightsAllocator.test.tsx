import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CompositeWeights } from "@/types/donor-research";
import { DEFAULT_WEIGHTS_BASIS_POINTS } from "../report-brief/scoring";
import { WeightsAllocator } from "./WeightsAllocator";

const BALANCED: CompositeWeights = DEFAULT_WEIGHTS_BASIS_POINTS; // 25/10/25/25/15

function total(w: CompositeWeights): number {
  return Object.values(w).reduce((acc, v) => acc + v, 0);
}

describe("WeightsAllocator", () => {
  it("renders a slider and percentage input per factor", () => {
    render(<WeightsAllocator value={BALANCED} onChange={() => {}} resetValue={BALANCED} />);
    expect(screen.getAllByRole("slider")).toHaveLength(5);
    expect(screen.getAllByRole("spinbutton")).toHaveLength(5);
    // No lock toggles any more — only the Reset control.
    expect(screen.queryByRole("button", { name: /lock/i })).not.toBeInTheDocument();
  });

  it("sets only the typed factor, leaving the others untouched", () => {
    const onChange = vi.fn();
    render(<WeightsAllocator value={BALANCED} onChange={onChange} resetValue={BALANCED} />);
    const onlineInput = screen.getAllByRole("spinbutton")[0];
    fireEvent.change(onlineInput, { target: { value: "40" } });
    fireEvent.blur(onlineInput);

    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as CompositeWeights;
    expect(next.onlinePresence).toBe(4000);
    // Nothing is redistributed — the other four are unchanged and the total
    // moves (the advisor reconciles it back to 100% by hand).
    expect(next.socialPresence).toBe(BALANCED.socialPresence);
    expect(next.impactRecency).toBe(BALANCED.impactRecency);
    expect(next.donorMatch).toBe(BALANCED.donorMatch);
    expect(next.compliance).toBe(BALANCED.compliance);
    expect(total(next)).toBe(10000 - BALANCED.onlinePresence + 4000);
  });

  it("shows the running total in the pill and tracks it live", () => {
    const offBalance: CompositeWeights = { ...BALANCED, onlinePresence: 4000 };
    const { rerender } = render(
      <WeightsAllocator value={BALANCED} onChange={() => {}} resetValue={BALANCED} />
    );
    expect(screen.getByText(/Total\s+100%/)).toBeInTheDocument();

    rerender(<WeightsAllocator value={offBalance} onChange={() => {}} resetValue={BALANCED} />);
    expect(
      screen.getByText(new RegExp(`Total\\s+${total(offBalance) / 100}%`))
    ).toBeInTheDocument();
  });

  it("does not round a near-100% total up to a balanced-looking 100%", () => {
    // 9,999 bp — the save gate rejects it, so the pill must not read "100%".
    const almost: CompositeWeights = { ...BALANCED, onlinePresence: BALANCED.onlinePresence - 1 };
    render(<WeightsAllocator value={almost} onChange={() => {}} resetValue={BALANCED} />);
    expect(screen.getByText(/Total\s+99\.99%/)).toBeInTheDocument();
    expect(screen.queryByText(/Total\s+100%/)).not.toBeInTheDocument();
  });

  it("keeps the current value when the field is cleared (does not commit 0%)", () => {
    const onChange = vi.fn();
    render(<WeightsAllocator value={BALANCED} onChange={onChange} resetValue={BALANCED} />);
    const onlineInput = screen.getAllByRole("spinbutton")[0];
    fireEvent.change(onlineInput, { target: { value: "" } });
    fireEvent.blur(onlineInput);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("resets to the reset value", () => {
    const onChange = vi.fn();
    const current: CompositeWeights = {
      onlinePresence: 4000,
      socialPresence: 800,
      impactRecency: 2000,
      donorMatch: 2000,
      compliance: 1200,
    };
    render(<WeightsAllocator value={current} onChange={onChange} resetValue={BALANCED} />);
    fireEvent.click(screen.getByRole("button", { name: /^reset$/i }));
    expect(onChange).toHaveBeenCalledWith(BALANCED);
  });

  it("disables every input when disabled", () => {
    render(
      <WeightsAllocator value={BALANCED} onChange={() => {}} resetValue={BALANCED} disabled />
    );
    screen.getAllByRole("spinbutton").forEach((input) => expect(input).toBeDisabled());
    expect(screen.getByRole("button", { name: /reset/i })).toBeDisabled();
  });
});
