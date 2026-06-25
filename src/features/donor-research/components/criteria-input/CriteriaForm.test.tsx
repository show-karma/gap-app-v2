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

  it("redistributes on edit and submits weights that still total 100%", async () => {
    const onSubmit = vi.fn();
    render(withQueryClient(<Harness onSubmit={onSubmit} />));
    const onlineInput = within(weightsFieldset()).getAllByRole("spinbutton")[0];
    fireEvent.change(onlineInput, { target: { value: "40" } });
    fireEvent.blur(onlineInput);

    fireEvent.click(screen.getByRole("button", { name: /start report/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const weights = onSubmit.mock.calls[0][0].weights;
    expect(weights.onlinePresence).toBe(4000);
    expect(Object.values(weights).reduce((a: number, b) => a + (b as number), 0)).toBe(10000);
  });
});
