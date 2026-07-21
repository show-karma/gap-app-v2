import { zodResolver } from "@hookform/resolvers/zod";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
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

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: () => {},
  });
});

function Harness({
  onSubmit,
  personaExists,
  onRequestEdit,
}: {
  onSubmit: (values: CriteriaFormValues) => void;
  personaExists?: boolean;
  onRequestEdit?: (handleId: string) => void;
}) {
  const form = useForm<CriteriaFormValues>({
    defaultValues: {
      donorHandleId: HANDLE.id,
      criteriaText: "climate orgs in the PNW",
      cause: "",
      geography: "",
      weights: DEFAULT_WEIGHTS_BASIS_POINTS,
      topCount: 3,
    },
  });
  return (
    <CriteriaForm
      form={form}
      onSubmit={onSubmit}
      handles={[HANDLE]}
      handlesLoading={false}
      onRequestEdit={onRequestEdit}
      personaExists={personaExists}
      submitting={false}
    />
  );
}

// Minimal resolver-backed harness: an empty `criteriaText` fails validation so
// `handleSubmit` runs its `onInvalid` branch (the toast under test). Mirrors the
// real panel's required-criteria rule without importing the full schema.
const ValidatedSchema = z.object({
  donorHandleId: z.string().min(1, "Pick or create a donor"),
  criteriaText: z.string().min(1, "Describe what you're researching"),
  cause: z.string().optional(),
  geography: z.string().optional(),
  weights: z.any(),
  topCount: z.number(),
});

function ValidatedHarness({ criteriaText }: { criteriaText: string }) {
  const form = useForm<CriteriaFormValues>({
    resolver: zodResolver(ValidatedSchema) as never,
    defaultValues: {
      donorHandleId: HANDLE.id,
      criteriaText,
      cause: "",
      geography: "",
      weights: DEFAULT_WEIGHTS_BASIS_POINTS,
      topCount: 3,
    },
  });
  return (
    <CriteriaForm
      form={form}
      onSubmit={() => {}}
      handles={[HANDLE]}
      handlesLoading={false}
      submitting={false}
    />
  );
}

describe("CriteriaForm submit feedback", () => {
  beforeEach(() => {
    vi.mocked(toast.error).mockClear();
  });

  it("toasts the first validation error when a blocked submit would otherwise be silent", async () => {
    render(withQueryClient(<ValidatedHarness criteriaText="" />));
    fireEvent.click(screen.getByRole("button", { name: /create report/i }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Describe what you're researching")
    );
  });

  it("does not toast when the form is valid", async () => {
    render(withQueryClient(<ValidatedHarness criteriaText="climate orgs in the PNW" />));
    fireEvent.click(screen.getByRole("button", { name: /create report/i }));
    await waitFor(() => expect(toast.error).not.toHaveBeenCalled());
  });
});

// The weights fieldset lives inside the collapsed-by-default "Advanced"
// disclosure — open it first, then scope to the fieldset (the form has
// other number inputs: amounts, topCount).
function weightsFieldset(): HTMLElement {
  const trigger = screen.getByRole("button", { name: /advanced/i });
  if (trigger.getAttribute("aria-expanded") !== "true") {
    fireEvent.click(trigger);
  }
  return screen.getByText("Scoring weights").closest("fieldset") as HTMLElement;
}

describe("CriteriaForm weights", () => {
  it("uses the shadcn persona picker and keeps adjacent actions on the same control height", () => {
    render(withQueryClient(<Harness onSubmit={() => {}} />));

    const picker = screen.getByRole("combobox", { name: "Donor" });
    expect(picker).toHaveClass("h-[42px]");
    expect(picker.tagName).toBe("BUTTON");
    expect(screen.getByRole("button", { name: /new donor/i })).toHaveClass("h-[42px]");
    expect(screen.getByRole("button", { name: /add profile/i })).toHaveClass("h-[42px]");
  });

  it("keeps the persona options inside the themed picker row", async () => {
    render(withQueryClient(<Harness onSubmit={() => {}} />));

    const picker = screen.getByRole("combobox", { name: "Donor" });
    fireEvent.keyDown(picker, { key: "ArrowDown" });

    expect(picker.parentElement).toContainElement(await screen.findByRole("listbox"));
  });

  it("renders an icon-only accessible action when changing an existing persona", () => {
    const onRequestEdit = vi.fn();
    render(
      withQueryClient(<Harness onSubmit={() => {}} onRequestEdit={onRequestEdit} personaExists />)
    );

    const action = screen.getByRole("button", { name: "Change profile for Smith Family" });
    const newPersona = screen.getByRole("button", { name: /new donor/i });
    expect(action).toHaveClass("h-[42px]", "w-[42px]", "px-0");
    expect(action).toHaveTextContent("");
    expect(action.querySelector("svg")).toBeInTheDocument();
    expect(action.nextElementSibling).toBe(newPersona);
    fireEvent.click(action);
    expect(onRequestEdit).toHaveBeenCalledWith(HANDLE.id);
  });

  it("animates the advanced disclosure while removing closed controls from focus navigation", () => {
    render(withQueryClient(<Harness onSubmit={() => {}} />));

    const trigger = screen.getByRole("button", { name: /advanced/i });
    const panel = document.getElementById("criteria-advanced-panel");
    const animatedGrid = panel?.parentElement?.parentElement;
    expect(animatedGrid).toHaveClass("grid-rows-[0fr]", "motion-reduce:transition-none");
    expect(animatedGrid).toHaveAttribute("inert");
    expect(panel).toHaveAttribute("aria-hidden", "true");

    fireEvent.click(trigger);

    expect(animatedGrid).toHaveClass("grid-rows-[1fr]");
    expect(animatedGrid).not.toHaveAttribute("inert");
    expect(panel).toHaveAttribute("aria-hidden", "false");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("renders a slider and a percentage input per factor", () => {
    render(withQueryClient(<Harness onSubmit={() => {}} />));
    const fieldset = weightsFieldset();
    expect(within(fieldset).getAllByRole("slider")).toHaveLength(5);
    expect(within(fieldset).getAllByRole("spinbutton")).toHaveLength(5);
  });

  it("submits the default weights when untouched", async () => {
    const onSubmit = vi.fn();
    render(withQueryClient(<Harness onSubmit={onSubmit} />));
    fireEvent.click(screen.getByRole("button", { name: /create report/i }));
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
    fireEvent.click(screen.getByRole("button", { name: /create report/i }));
    expect(onSubmit).not.toHaveBeenCalled();

    // Drop Mission match 25→10 to bring the total back to 100%, then submit.
    fireEvent.change(inputs[3], { target: { value: "10" } });
    fireEvent.blur(inputs[3]);
    fireEvent.click(screen.getByRole("button", { name: /create report/i }));
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
