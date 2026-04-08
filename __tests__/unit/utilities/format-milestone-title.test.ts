import { formatMilestoneTitle } from "@/utilities/formatMilestoneTitle";

describe("formatMilestoneTitle", () => {
  it("prepends 'Milestone N:' to the title using 1-based index", () => {
    expect(formatMilestoneTitle(0, "Setup infrastructure")).toBe(
      "Milestone 1: Setup infrastructure"
    );
    expect(formatMilestoneTitle(1, "Build prototype")).toBe("Milestone 2: Build prototype");
    expect(formatMilestoneTitle(9, "Final delivery")).toBe("Milestone 10: Final delivery");
  });

  it("trims whitespace from the title", () => {
    expect(formatMilestoneTitle(0, "  Spaced title  ")).toBe("Milestone 1: Spaced title");
  });

  it("returns 'Milestone N' when title is empty", () => {
    expect(formatMilestoneTitle(0, "")).toBe("Milestone 1");
    expect(formatMilestoneTitle(2, "   ")).toBe("Milestone 3");
  });

  it("does not double-prefix if title already starts with 'Milestone N'", () => {
    expect(formatMilestoneTitle(0, "Milestone 1: Setup")).toBe("Milestone 1: Setup");
    expect(formatMilestoneTitle(2, "Milestone 3")).toBe("Milestone 3");
  });
});
