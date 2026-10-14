import { formatMilestoneTitle } from "@/utilities/formatMilestoneTitle";

describe("formatMilestoneTitle", () => {
  it("prefixes a plain title with its 1-based position", () => {
    expect(formatMilestoneTitle(0, "Productize Dealbot")).toBe("Milestone 1: Productize Dealbot");
  });

  it("returns only the prefix for an empty title", () => {
    expect(formatMilestoneTitle(2, "   ")).toBe("Milestone 3");
  });

  it("keeps a title that already carries the matching 'Milestone N:' prefix", () => {
    expect(formatMilestoneTitle(0, "Milestone 1: Productize Dealbot")).toBe(
      "Milestone 1: Productize Dealbot"
    );
  });

  it("keeps a title that is exactly 'Milestone N'", () => {
    expect(formatMilestoneTitle(1, "Milestone 2")).toBe("Milestone 2");
  });

  it.each([
    ["hyphen", "Milestone 1 - FOC M2 Milestone"],
    ["double space and hyphen", "Milestone 1  - FOC M2 Milestone"],
    ["en dash", "Milestone 1 \u2013 FOC M2 Milestone"],
    ["em dash", "Milestone 1 \u2014 FOC M2 Milestone"],
  ])("keeps a title that already carries 'Milestone N' followed by a %s", (_label, title) => {
    expect(formatMilestoneTitle(0, title)).toBe(title);
  });

  it("still prefixes when the embedded number does not match the position", () => {
    expect(formatMilestoneTitle(1, "Milestone 1 - FOC M2 Milestone")).toBe(
      "Milestone 2: Milestone 1 - FOC M2 Milestone"
    );
  });

  it("does not treat 'Milestone 10' as a 'Milestone 1' prefix", () => {
    expect(formatMilestoneTitle(0, "Milestone 10 - Final")).toBe(
      "Milestone 1: Milestone 10 - Final"
    );
  });
});
