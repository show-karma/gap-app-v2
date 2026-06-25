import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

describe("CriteriaForm weights", () => {
  it("renders five scoring-weight sliders pre-filled with the defaults", () => {
    render(withQueryClient(<Harness onSubmit={() => {}} />));
    expect(screen.getByText("Scoring weights")).toBeInTheDocument();
    expect(screen.getAllByRole("slider")).toHaveLength(5);
  });

  it("submits the default weights when the sliders are untouched", async () => {
    const onSubmit = vi.fn();
    render(withQueryClient(<Harness onSubmit={onSubmit} />));
    fireEvent.click(screen.getByRole("button", { name: /start report/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].weights).toEqual(DEFAULT_WEIGHTS_BASIS_POINTS);
  });

  it("submits adjusted weights that still sum to 10000 after a slider nudge", async () => {
    const onSubmit = vi.fn();
    render(withQueryClient(<Harness onSubmit={onSubmit} />));
    const firstThumb = screen.getAllByRole("slider")[0];
    firstThumb.focus();
    fireEvent.keyDown(firstThumb, { key: "ArrowRight" });
    fireEvent.click(screen.getByRole("button", { name: /start report/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const weights = onSubmit.mock.calls[0][0].weights;
    const sum = Object.values(weights).reduce((a: number, b) => a + (b as number), 0);
    expect(sum).toBe(10000);
    expect(weights.onlinePresence).toBe(DEFAULT_WEIGHTS_BASIS_POINTS.onlinePresence + 100);
  });
});
