import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProjectsGridSkeleton } from "@/components/CommunityGrants/ProjectsGridSkeleton";

describe("ProjectsGridSkeleton", () => {
  it("renders the default number of block placeholders", () => {
    render(<ProjectsGridSkeleton />);

    expect(screen.getAllByTestId("project-block-skeleton")).toHaveLength(8);
  });

  it("renders the requested number of block placeholders", () => {
    render(<ProjectsGridSkeleton count={4} />);

    expect(screen.getAllByTestId("project-block-skeleton")).toHaveLength(4);
  });
});
