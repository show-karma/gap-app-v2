import { fireEvent, render, screen } from "@testing-library/react";
import { FundingMapCard } from "@/src/features/funding-map/components/funding-map-card";
import { getProgramDetailHref } from "@/src/features/funding-map/components/funding-map-list";
import type { FundingProgramResponse } from "@/src/features/funding-map/types/funding-program";
import { track } from "@/utilities/analytics/client";

vi.mock("@/utilities/analytics/client", () => ({ track: vi.fn() }));

function createMockProgram(
  overrides: Partial<FundingProgramResponse> = {}
): FundingProgramResponse {
  return {
    _id: "656e57d7ec296b896ceacf28",
    programId: "961",
    isOnKarma: true,
    metadata: { title: "Optimism ASP" },
    communities: [{ uid: "0xabc", name: "Optimism", slug: "optimism" }],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as FundingProgramResponse;
}

describe("getProgramDetailHref", () => {
  it("builds the community program detail URL for on-Karma programs", () => {
    expect(getProgramDetailHref(createMockProgram())).toBe("/community/optimism/programs/961");
  });

  it("returns undefined for registry-only programs (not on Karma)", () => {
    expect(getProgramDetailHref(createMockProgram({ isOnKarma: false }))).toBeUndefined();
  });

  it("returns undefined without a community slug or programId", () => {
    expect(getProgramDetailHref(createMockProgram({ communities: [] }))).toBeUndefined();
    expect(getProgramDetailHref(createMockProgram({ programId: undefined }))).toBeUndefined();
  });
});

describe("FundingMapCard with href + onClick (funding-map list)", () => {
  it("renders a real anchor with the detail-page href in the HTML", () => {
    render(
      <FundingMapCard
        program={createMockProgram()}
        href="/community/optimism/programs/961"
        onClick={vi.fn()}
      />
    );

    const anchor = screen.getByRole("link", { name: /view funding program: optimism asp/i });
    expect(anchor).toHaveAttribute("href", "/community/optimism/programs/961");
  });

  it("intercepts the JS click to open the dialog instead of navigating", () => {
    const onClick = vi.fn();
    render(
      <FundingMapCard
        program={createMockProgram()}
        href="/community/optimism/programs/961"
        onClick={onClick}
      />
    );

    const anchor = screen.getByRole("link", { name: /view funding program: optimism asp/i });
    const clickEvent = new MouseEvent("click", { bubbles: true, cancelable: true });
    fireEvent(anchor, clickEvent);

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(clickEvent.defaultPrevented).toBe(true);
  });

  it("keeps plain navigation when no onClick is provided (community grid usage)", () => {
    render(
      <FundingMapCard program={createMockProgram()} href="/community/optimism/programs/961" />
    );

    const anchor = document.querySelector('a[href="/community/optimism/programs/961"]');
    expect(anchor).not.toBeNull();
    const clickEvent = new MouseEvent("click", { bubbles: true, cancelable: true });
    if (anchor) fireEvent(anchor, clickEvent);
    expect(clickEvent.defaultPrevented).toBe(false);
  });
});

describe("FundingMapCard analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reports the click with the program and its position in the list", () => {
    render(
      <FundingMapCard
        program={createMockProgram()}
        href="/community/optimism/programs/961"
        onClick={vi.fn()}
        cardPosition={3}
      />
    );

    fireEvent.click(screen.getByRole("link", { name: /view funding program: optimism asp/i }));

    expect(track).toHaveBeenCalledWith("funding_map_card_clicked", {
      program_id: "961",
      position: 3,
    });
  });

  it("reports an unknown position when the card is not rendered in a ranked list", () => {
    render(
      <FundingMapCard
        program={createMockProgram()}
        href="/community/optimism/programs/961"
        onClick={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("link", { name: /view funding program: optimism asp/i }));

    expect(track).toHaveBeenCalledWith("funding_map_card_clicked", {
      program_id: "961",
      position: null,
    });
  });
});
