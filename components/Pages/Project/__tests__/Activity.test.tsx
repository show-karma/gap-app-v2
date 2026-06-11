import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import type { UnifiedMilestone } from "@/types/v2/roadmap";

// ── Mocks ────────────────────────────────────────────────────────────────────
// ProjectActivity wires three data sources (authorization + updates + impacts)
// into <ActivityList>. The authorization MATRIX itself is covered by
// hooks/__tests__/useProjectAuthorization.test.ts; this suite stays thin and
// only asserts the wiring: forwarding `isAuthorized`, tab counts/filtering over
// a mixed fixture, and the empty path.

const mockUseProjectAuthorization = vi.fn<[], boolean>(() => false);
vi.mock("@/hooks/useProjectAuthorization", () => ({
  useProjectAuthorization: () => mockUseProjectAuthorization(),
}));

const mockUseProjectUpdates = vi.fn();
vi.mock("@/hooks/v2/useProjectUpdates", () => ({
  useProjectUpdates: (...args: unknown[]) => mockUseProjectUpdates(...args),
}));

const mockUseProjectImpacts = vi.fn();
vi.mock("@/hooks/v2/useProjectImpacts", () => ({
  useProjectImpacts: (...args: unknown[]) => mockUseProjectImpacts(...args),
}));

// Impacts are passed through unchanged so the component's combination logic is
// what's under test (the impact→milestone shaping is unit-tested elsewhere).
vi.mock("@/services/project-profile.service", () => ({
  transformImpactsToMilestones: (impacts: UnifiedMilestone[]) => impacts,
}));

// Capture the props ActivityList receives on every render so we can assert on
// `isAuthorized` forwarding and the filtered set passed to each tab panel.
const activityListRenders: Array<{
  isAuthorized: boolean;
  milestones: UnifiedMilestone[];
}> = [];
vi.mock("@/components/Shared/ActivityList", () => ({
  ActivityList: ({
    milestones = [],
    isAuthorized = false,
  }: {
    milestones?: UnifiedMilestone[];
    isAuthorized?: boolean;
  }) => {
    activityListRenders.push({ isAuthorized, milestones });
    return (
      <div
        data-testid="activity-list"
        data-authorized={String(isAuthorized)}
        data-count={milestones.length}
      />
    );
  },
}));

import { ProjectActivity } from "../Activity";

// ── Fixtures ─────────────────────────────────────────────────────────────────
const baseItem = (overrides: Partial<UnifiedMilestone>): UnifiedMilestone =>
  ({
    uid: "0xitem",
    type: "activity",
    title: "Item",
    completed: false,
    createdAt: "2024-01-01T00:00:00.000Z",
    chainID: 0,
    refUID: "",
    source: { type: "update" },
    ...overrides,
  }) as UnifiedMilestone;

// Two "Updates" (activity + grant_update), one "Milestone" (milestone).
const mockMilestones: UnifiedMilestone[] = [
  baseItem({ uid: "u1", type: "activity", title: "Activity 1" }),
  baseItem({ uid: "u2", type: "grant_update", title: "Grant Update 1" }),
  baseItem({ uid: "m1", type: "milestone", title: "Milestone 1" }),
];

// One "Update" (impact) supplied via the impacts source.
const mockImpacts: UnifiedMilestone[] = [
  baseItem({ uid: "i1", type: "impact", title: "Impact 1", source: { type: "impact" } }),
];

const setHooks = ({
  authorized = false,
  milestones = [] as UnifiedMilestone[],
  impacts = [] as UnifiedMilestone[],
} = {}) => {
  mockUseProjectAuthorization.mockReturnValue(authorized);
  mockUseProjectUpdates.mockReturnValue({ milestones });
  mockUseProjectImpacts.mockReturnValue({ impacts });
};

beforeEach(() => {
  vi.clearAllMocks();
  activityListRenders.length = 0;
  setHooks();
});

describe("ProjectActivity", () => {
  describe("authorization forwarding", () => {
    it("forwards isAuthorized=true to ActivityList", () => {
      setHooks({ authorized: true, milestones: mockMilestones, impacts: mockImpacts });
      render(<ProjectActivity />);

      expect(activityListRenders.length).toBeGreaterThan(0);
      expect(activityListRenders.every((r) => r.isAuthorized === true)).toBe(true);
    });

    it("forwards isAuthorized=false to ActivityList", () => {
      setHooks({ authorized: false, milestones: mockMilestones, impacts: mockImpacts });
      render(<ProjectActivity />);

      expect(activityListRenders.length).toBeGreaterThan(0);
      expect(activityListRenders.every((r) => r.isAuthorized === false)).toBe(true);
    });
  });

  describe("tab counts", () => {
    it("renders correct counts for a mixed updates + impacts fixture", () => {
      // 3 milestones (2 updates, 1 milestone) + 1 impact (update) =>
      // All: 4, Updates: 3, Milestones: 1
      setHooks({ milestones: mockMilestones, impacts: mockImpacts });
      render(<ProjectActivity />);

      expect(screen.getByRole("tab", { name: "All (4)" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Updates (3)" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Milestones (1)" })).toBeInTheDocument();
    });

    it("hides the count suffix for tabs whose count is zero", () => {
      // Only update-type items => Milestones tab count is 0 and must render
      // without a "(0)" suffix per the empty-count rule.
      setHooks({
        milestones: [baseItem({ uid: "u1", type: "activity", title: "Activity 1" })],
      });
      render(<ProjectActivity />);

      expect(screen.getByRole("tab", { name: "Milestones" })).toBeInTheDocument();
      expect(screen.queryByText(/Milestones \(0\)/)).not.toBeInTheDocument();
    });
  });

  describe("tab filtering", () => {
    it("filters items by type when switching tabs", () => {
      setHooks({ milestones: mockMilestones, impacts: mockImpacts });
      render(<ProjectActivity />);

      // Headless UI renders only the ACTIVE panel's content, so exactly one
      // ActivityList is mounted at a time. The default tab is "All" (4 items).
      const activeCount = () =>
        Number(screen.getByTestId("activity-list").getAttribute("data-count"));
      expect(activeCount()).toBe(4); // All

      // Switch to Updates: activity + grant_update + impact => 3.
      fireEvent.click(screen.getByRole("tab", { name: "Updates (3)" }));
      expect(activeCount()).toBe(3);

      // Switch to Milestones: just the milestone-type item => 1.
      fireEvent.click(screen.getByRole("tab", { name: "Milestones (1)" }));
      expect(activeCount()).toBe(1);

      // The filtered set forwarded to ActivityList contains only milestones.
      const lastRender = activityListRenders.at(-1);
      expect(lastRender?.milestones.every((m) => m.type === "milestone")).toBe(true);
    });
  });

  describe("empty state", () => {
    it("renders without crashing when there is no data", () => {
      setHooks({ milestones: [], impacts: [] });
      render(<ProjectActivity />);

      // All counts are zero, so no count suffix renders on any tab.
      expect(screen.getByRole("tab", { name: "All" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Updates" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Milestones" })).toBeInTheDocument();
      // ActivityList still renders (it owns its own empty copy).
      expect(screen.getAllByTestId("activity-list").length).toBeGreaterThan(0);
      expect(activityListRenders.every((r) => r.milestones.length === 0)).toBe(true);
    });
  });
});
