/**
 * U7 — focused UI tests: AI provenance badges on the structured chips, the
 * picker's "Manage" new-tab link, and the header's empty-label fallback.
 */

import { render, screen } from "@testing-library/react";
import { DonorHandlePicker } from "@/src/features/donor-research/components/criteria-input/DonorHandlePicker";
import { DonorDetailHeader } from "@/src/features/donor-research/components/donor-detail/DonorDetailHeader";
import { PersonaStructuredChips } from "@/src/features/donor-research/components/donor-detail/PersonaStructuredChips";
import type { DonorHandle } from "@/types/donor-research";
import { makeDonorHandle, makeDonorPersona } from "../../msw/handlers/donor-research.handlers";
import { renderWithProviders } from "../../utils/render";

// The header uses the app's navigation Link; render it as a plain anchor so
// the test needs no router context.
vi.mock("@/src/components/navigation/Link", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("PersonaStructuredChips — AI provenance", () => {
  it("renders a labelled select per field and an AI badge only on extracted chips", () => {
    // Default persona: orgMaturity + geoRadius are extracted; giftSizeBand is
    // manual; faithStance + advocacyStance are null.
    render(
      <PersonaStructuredChips structured={makeDonorPersona().structured} onChange={vi.fn()} />
    );

    expect(screen.getByText("Org maturity")).toBeInTheDocument();
    expect(screen.getByText("Gift size band")).toBeInTheDocument();
    expect(screen.getByText("Advocacy stance")).toBeInTheDocument();

    expect(screen.getAllByText("AI")).toHaveLength(2);
  });

  it("renders no AI badge when every chip is manual or null", () => {
    const structured = makeDonorPersona({
      structured: {
        orgMaturity: { value: "mixed", source: "manual" },
        geoRadius: { value: null, source: null },
        faithStance: { value: null, source: null },
        giftSizeBand: { value: "mid", source: "manual" },
        advocacyStance: { value: null, source: null },
      },
    }).structured;
    render(<PersonaStructuredChips structured={structured} onChange={vi.fn()} />);
    expect(screen.queryByText("AI")).not.toBeInTheDocument();
  });
});

describe("DonorHandlePicker — Manage link", () => {
  const handles: DonorHandle[] = [makeDonorHandle({ id: "h1", opaqueLabel: "Acme Donor" })];

  it("links to the detail page in a new tab with an accessible, labelled target", () => {
    renderWithProviders(
      <DonorHandlePicker handles={handles} loading={false} value="h1" onChange={vi.fn()} />
    );

    const link = screen.getByRole("link", { name: "Manage donor handle Acme Donor" });
    expect(link).toHaveAttribute("href", "/nonprofit-research/donors/h1");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener");
  });

  it("hides the Manage link when no handle is selected", () => {
    renderWithProviders(
      <DonorHandlePicker handles={handles} loading={false} value="" onChange={vi.fn()} />
    );
    expect(screen.queryByRole("link", { name: /manage donor handle/i })).not.toBeInTheDocument();
  });
});

describe("DonorDetailHeader — label fallback", () => {
  it("falls back to 'Untitled donor handle' when the label is empty", () => {
    render(<DonorDetailHeader handle={makeDonorHandle({ opaqueLabel: "" })} />);
    expect(screen.getByRole("heading", { name: "Untitled donor handle" })).toBeInTheDocument();
  });

  it("renders the opaque label when present", () => {
    render(<DonorDetailHeader handle={makeDonorHandle({ opaqueLabel: "Riverside Fund" })} />);
    expect(screen.getByRole("heading", { name: "Riverside Fund" })).toBeInTheDocument();
  });
});
