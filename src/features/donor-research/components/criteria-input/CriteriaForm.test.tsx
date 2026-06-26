import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import type { DonorHandle } from "@/types/donor-research";
import { DEFAULT_WEIGHTS_BASIS_POINTS } from "../report-brief/scoring";
import { CriteriaForm } from "./CriteriaForm";
import type { CriteriaFormValues } from "./CriteriaInputPanel";

function withQueryClient(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{ui}</QueryClientProvider>;
}

const HANDLE: DonorHandle = {
  id: "handle-1",
  advisorId: "advisor-1",
  opaqueLabel: "Smith Family",
  notes: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function Harness({ onSubmit }: { onSubmit: (values: CriteriaFormValues) => void }) {
  const form = useForm<CriteriaFormValues>({
    defaultValues: {
      donorHandleId: HANDLE.id,
      criteriaText: "climate orgs in the PNW",
      cause: "",
      geography: "",
      weights: DEFAULT_WEIGHTS_BASIS_POINTS,
    },
  });
  return (
    <CriteriaForm
      form={form}
      onSubmit={onSubmit}
      handles={[HANDLE]}
      handlesLoading={false}
      submitting={false}
    />
  );
}

// Scope to the weights fieldset — the form has other number inputs (amounts, topCount).
function weightsFieldset(): HTMLElement {
  return screen.getByText("Scoring weights").closest("fieldset") as HTMLElement;
}

describe("CriteriaForm weights", () => {
  it("renders a slider and a percentage input per factor", () => {
    render(withQueryClient(<Harness onSubmit={() => {}} />));
    const fieldset = weightsFieldset();
    expect(within(fieldset).getAllByRole("slider")).toHaveLength(5);
    expect(within(fieldset).getAllByRole("spinbutton")).toHaveLength(5);
  });

  it("submits the default weights when untouched", async () => {
    const onSubmit = vi.fn();
    render(withQueryClient(<Harness onSubmit={onSubmit} />));
    fireEvent.click(screen.getByRole("button", { name: /start report/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].weights).toEqual(DEFAULT_WEIGHTS_BASIS_POINTS);
  });

  it("sets only the edited factor and gates submit on a 100% total", async () => {
    const onSubmit = vi.fn();
    render(withQueryClient(<Harness onSubmit={onSubmit} />));
    const inputs = within(weightsFieldset()).getAllByRole("spinbutton");

    // Raise Online presence 25→40: nothing is redistributed, so the five now
    // total 115% and the form can't be submitted.
    fireEvent.change(inputs[0], { target: { value: "40" } });
    fireEvent.blur(inputs[0]);
    fireEvent.click(screen.getByRole("button", { name: /start report/i }));
    expect(onSubmit).not.toHaveBeenCalled();

    // Drop Mission match 25→10 to bring the total back to 100%, then submit.
    fireEvent.change(inputs[3], { target: { value: "10" } });
    fireEvent.blur(inputs[3]);
    fireEvent.click(screen.getByRole("button", { name: /start report/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    // Only the two edited factors changed; the untouched three are intact and
    // the five total 100% (4000+1000+2500+1000+1500 = 10000).
    expect(onSubmit.mock.calls[0][0].weights).toEqual({
      onlinePresence: 4000,
      socialPresence: 1000,
      impactRecency: 2500,
      donorMatch: 1000,
      compliance: 1500,
    });
  });
});
