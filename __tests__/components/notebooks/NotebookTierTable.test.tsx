import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NotebookTierTable } from "@/components/Pages/Communities/Notebooks/NotebookTierTable";
import type {
  NotebookKernelTierRollup,
  NotebookKernelTierRollupRow,
} from "@/services/notebooks/notebook-kernel.types";

/**
 * The tier rollup renderer.
 *
 * Every test below asserts on what the DECLARED CONTRACT produced, not on
 * copy this component invented: labels come from the column's own map, the
 * accent from `accentBy`, the ratio parts from the payload. That is the whole
 * design — a test that hard-coded "Irreplaceable" here would pass even if the
 * component ignored the labels map and printed the enum id in title case.
 */

const TIER_LABELS = {
  irreplaceable: "Irreplaceable",
  essential: "Essential",
  important: "Important",
  "nice-to-have": "Nice to have",
} as const;

function row(overrides: Partial<NotebookKernelTierRollupRow> = {}): NotebookKernelTierRollupRow {
  return {
    tier: "irreplaceable",
    description: "Loss would halt the network.",
    functionsCount: 7,
    coverage90d: { value: 96.0, numerator: 679, denominator: 707 },
    reporting: { value: 5, numerator: 5, denominator: 7 },
    fundingPosture: "irreplaceable",
    ...overrides,
  };
}

function rollup(overrides: Partial<NotebookKernelTierRollup> = {}): NotebookKernelTierRollup {
  return {
    windowDays: 90,
    columns: [
      { id: "tier", label: "Tier", format: "enum", labels: TIER_LABELS, subline: "description" },
      { id: "functionsCount", label: "Functions", format: "count" },
      { id: "coverage90d", label: "Coverage (90d)", format: "ratio", valueKind: "percent" },
      { id: "reporting", label: "Reporting", format: "ratio", valueKind: "count" },
      {
        id: "fundingPosture",
        label: "Funding posture",
        format: "enum",
        labels: {
          irreplaceable: "Fund unconditionally",
          essential: "Fund",
          important: "Fund where possible",
          "nice-to-have": "Opportunistic",
        },
      },
    ],
    rows: [row()],
    accentBy: {
      column: "tier",
      tokens: {
        irreplaceable: "critical",
        essential: "high",
        important: "medium",
        "nice-to-have": "low",
      },
    },
    source: {
      endpoint: "/v2/kernel/overview?windowDays=90",
      methodology: "One row per OSO tier.",
      canonicalNotes: [],
    },
    ...overrides,
  };
}

describe("NotebookTierTable", () => {
  it("should_render_a_real_table_with_the_declared_columns_in_order", () => {
    render(<NotebookTierTable rollup={rollup()} />);

    const headers = screen
      .getAllByRole("columnheader")
      .map((header) => header.textContent?.trim())
      // The first header is the accent stripe's screen-reader-only cell.
      .slice(1);

    expect(headers).toEqual([
      "Tier",
      "Functions",
      "Coverage (90d)",
      "Reporting",
      "Funding posture",
    ]);
  });

  describe("enum cells", () => {
    // The point of shipping a labels map: display copy is decided once, by the
    // layer that owns the vocabulary.
    it("should_display_the_label_the_column_declared_not_the_enum_id", () => {
      const spec = rollup();
      spec.columns[0] = { ...spec.columns[0], labels: { ...TIER_LABELS, irreplaceable: "Tier 0" } };

      render(<NotebookTierTable rollup={spec} />);

      expect(screen.getByText("Tier 0")).toBeInTheDocument();
      expect(screen.queryByText("irreplaceable")).not.toBeInTheDocument();
    });

    it("should_render_the_description_as_a_sub_line_under_the_tier", () => {
      render(<NotebookTierTable rollup={rollup()} />);

      expect(screen.getByText("Loss would halt the network.")).toBeInTheDocument();
    });

    // `subline` is declared per column, so the funding-posture cell must not
    // repeat the description just because the row carries one.
    it("should_omit_the_description_on_a_column_that_did_not_ask_for_it", () => {
      render(<NotebookTierTable rollup={rollup()} />);

      expect(screen.getAllByText("Loss would halt the network.")).toHaveLength(1);
    });

    it("should_render_an_em_dash_for_an_id_the_labels_map_does_not_cover", () => {
      const spec = rollup();
      spec.columns[0] = {
        ...spec.columns[0],
        labels: { ...TIER_LABELS, irreplaceable: undefined as unknown as string },
      };

      render(<NotebookTierTable rollup={spec} />);

      // The stripe cell is aria-hidden, so cell 0 is the tier column.
      const cells = screen.getAllByRole("cell");
      expect(within(cells[0]).getByText("—")).toBeInTheDocument();
    });
  });

  describe("ratio cells", () => {
    it("should_show_a_percentage_beside_its_own_numerator_and_denominator", () => {
      render(<NotebookTierTable rollup={rollup()} />);

      expect(screen.getByText("96.0%")).toBeInTheDocument();
      expect(screen.getByText("679/707")).toBeInTheDocument();
    });

    it("should_show_a_count_ratio_without_a_percent_sign", () => {
      render(<NotebookTierTable rollup={rollup()} />);

      expect(screen.getByText("5/7")).toBeInTheDocument();
      expect(screen.queryByText("5.0%")).not.toBeInTheDocument();
    });

    // THE ABSENT-VALUE RULE. Nothing expected is not zero received; printing
    // "0%" would report a failure the data does not show.
    it("should_render_an_em_dash_and_never_a_zero_when_the_value_is_null", () => {
      const spec = rollup({
        rows: [row({ coverage90d: { value: null, numerator: null, denominator: null } })],
      });

      render(<NotebookTierTable rollup={spec} />);

      const cells = screen.getAllByRole("cell");
      expect(within(cells[2]).getByText("—")).toBeInTheDocument();
      expect(within(cells[2]).queryByText("0.0%")).not.toBeInTheDocument();
      expect(within(cells[2]).queryByText("0")).not.toBeInTheDocument();
    });
  });

  describe("accent stripe", () => {
    // Mutation-checked in both directions: a component that hard-coded the
    // critical class would pass the first case and fail the second.
    it.each([
      ["critical", "bg-destructive"],
      ["high", "bg-warning"],
      ["medium", "bg-primary"],
      ["low", "bg-muted-foreground/40"],
    ])("should_paint_the_%s_token_with_its_theme_class", (token, expected) => {
      const spec = rollup();
      spec.accentBy = {
        column: "tier",
        tokens: { ...spec.accentBy.tokens, irreplaceable: token as "critical" },
      };

      const { container } = render(<NotebookTierTable rollup={spec} />);

      expect(container.querySelector(`.${CSS.escape(expected)}`)).not.toBeNull();
    });

    // It repeats the tier name in colour and nothing else, so it is hidden
    // rather than announced twice.
    it("should_keep_the_stripe_out_of_the_accessibility_tree", () => {
      render(<NotebookTierTable rollup={rollup()} />);

      // 5 declared columns, not 6 — the stripe cell is aria-hidden.
      expect(screen.getAllByRole("cell")).toHaveLength(5);
    });
  });

  it("should_state_the_methodology_and_the_window_on_the_page", () => {
    render(<NotebookTierTable rollup={rollup()} />);

    expect(screen.getByText(/One row per OSO tier\./)).toBeInTheDocument();
    expect(screen.getByText(/90 days/)).toBeInTheDocument();
  });

  it("should_render_nothing_when_the_rollup_has_no_rows", () => {
    const { container } = render(<NotebookTierTable rollup={rollup({ rows: [] })} />);

    expect(container).toBeEmptyDOMElement();
  });
});
