import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import "@testing-library/jest-dom";
import { StatsTable, StatsTableSkeleton } from "@/components/Pages/Admin/StatsTable";

describe("StatsTableSkeleton column parity (#1298)", () => {
  it("renders the same number of cells per skeleton row as the loaded table header columns", () => {
    const { container } = render(<StatsTableSkeleton />);

    const headerColumns = container.querySelectorAll("thead th").length;
    expect(headerColumns).toBeGreaterThan(0);

    const skeletonRows = container.querySelectorAll("tbody tr");
    expect(skeletonRows.length).toBeGreaterThan(0);

    // Every skeleton row must have exactly one cell per header column so the
    // loading state cannot shift layout relative to the loaded table.
    for (const row of Array.from(skeletonRows)) {
      expect(row.querySelectorAll("td").length).toBe(headerColumns);
    }
  });

  it("matches the live StatsTable loading state column count", () => {
    const noop = () => {};
    const { container: liveContainer } = render(
      <StatsTable
        reports={undefined}
        isLoading
        communityId="community"
        sortBy=""
        sortOrder=""
        onSort={noop}
        page={1}
        onPageChange={noop}
        totalItems={0}
        itemsPerPage={10}
        isFullyCompleted={() => false}
      />
    );
    const { container: skeletonContainer } = render(<StatsTableSkeleton />);

    const liveHeaderColumns = liveContainer.querySelectorAll("thead th").length;
    const skeletonHeaderColumns = skeletonContainer.querySelectorAll("thead th").length;
    expect(skeletonHeaderColumns).toBe(liveHeaderColumns);

    const liveRowCells = liveContainer.querySelector("tbody tr")?.querySelectorAll("td").length;
    const skeletonRowCells = skeletonContainer
      .querySelector("tbody tr")
      ?.querySelectorAll("td").length;
    expect(skeletonRowCells).toBe(liveRowCells);
    expect(skeletonRowCells).toBe(skeletonHeaderColumns);
  });
});
