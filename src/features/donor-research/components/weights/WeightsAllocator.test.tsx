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
  it("renders a lock, slider, and percentage input per factor", () => {
    render(<WeightsAllocator value={BALANCED} onChange={() => {}} resetValue={BALANCED} />);
    expect(screen.getAllByRole("slider")).toHaveLength(5);
    expect(screen.getAllByRole("spinbutton")).toHaveLength(5);
    // All unlocked initially → five "Lock …" toggles.
    expect(screen.getAllByRole("button", { name: /^lock /i })).toHaveLength(5);
  });

  it("redistributes across the other factors when a percentage is typed", () => {
    const onChange = vi.fn();
    render(<WeightsAllocator value={BALANCED} onChange={onChange} resetValue={BALANCED} />);
    const onlineInput = screen.getAllByRole("spinbutton")[0];
    fireEvent.change(onlineInput, { target: { value: "40" } });
    fireEvent.blur(onlineInput);

    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as CompositeWeights;
    expect(next.onlinePresence).toBe(4000);
    expect(next.socialPresence).toBeLessThan(BALANCED.socialPresence);
    expect(total(next)).toBe(10000);
  });

  it("freezes a locked factor when another one changes", () => {
    const onChange = vi.fn();
    render(<WeightsAllocator value={BALANCED} onChange={onChange} resetValue={BALANCED} />);
    fireEvent.click(screen.getByRole("button", { name: "Lock Compliance" }));
    const onlineInput = screen.getAllByRole("spinbutton")[0];
    fireEvent.change(onlineInput, { target: { value: "40" } });
    fireEvent.blur(onlineInput);

    const next = onChange.mock.calls[0][0] as CompositeWeights;
    expect(next.compliance).toBe(1500); // frozen
    expect(next.onlinePresence).toBe(4000);
    expect(total(next)).toBe(10000);
  });

  it("disables the slider and input of a locked factor", () => {
    render(<WeightsAllocator value={BALANCED} onChange={() => {}} resetValue={BALANCED} />);
    fireEvent.click(screen.getByRole("button", { name: "Lock Social presence" }));
    // Social is the second factor.
    expect(screen.getAllByRole("spinbutton")[1]).toBeDisabled();
    expect(screen.getByRole("button", { name: "Unlock Social presence" })).toBeInTheDocument();
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
    screen.getAllByRole("button", { name: /lock|reset/i }).forEach((b) => expect(b).toBeDisabled());
  });
});
