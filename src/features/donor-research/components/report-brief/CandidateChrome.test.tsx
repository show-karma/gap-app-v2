import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OurTake } from "./CandidateChrome";

describe("OurTake", () => {
  it("uses a restrained editorial divider instead of a tinted side-stripe callout", () => {
    render(<OurTake text="A strong fit with measurable local outcomes." />);

    const section = screen.getByText("Our take").closest("section");
    expect(section).toHaveClass(
      "border-y",
      "border-sf-line",
      "sm:grid-cols-[6.5rem_minmax(0,1fr)]"
    );
    expect(section).not.toHaveClass("border-l-[3px]", "bg-brand-50");
    expect(screen.getByText("A strong fit with measurable local outcomes.")).toBeVisible();
  });
});
