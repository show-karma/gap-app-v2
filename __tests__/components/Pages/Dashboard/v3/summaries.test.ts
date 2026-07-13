import {
  buildApplicationsSummary,
  buildCommunitiesSummary,
  buildProjectsSummary,
} from "@/components/Pages/Dashboard/v3/summaries";
import type { DashboardAdminCommunity } from "@/hooks/useDashboardAdmin";
import type { ProjectWithGrantsResponse } from "@/types/v2/project";
import type { Application } from "@/types/whitelabel-entities";

const project = (
  title: string,
  grants: Array<{ completed: boolean; milestones: Array<{ completed: boolean }> }>
) =>
  ({
    uid: title,
    details: { title, slug: title },
    grants,
  }) as unknown as ProjectWithGrantsResponse;

const community = (name: string, activeProgramsCount: number, pendingApplicationsCount: number) =>
  ({
    id: name,
    name,
    slug: name,
    activeProgramsCount,
    pendingApplicationsCount,
    manageUrl: `/admin/${name}`,
  }) as DashboardAdminCommunity;

const application = (programTitle: string, status: Application["status"]) =>
  ({ id: programTitle, programTitle, status }) as Application;

describe("buildProjectsSummary", () => {
  it("counts projects and surfaces pending milestones first", () => {
    const summary = buildProjectsSummary([
      project("Clear One", [{ completed: true, milestones: [] }]),
      project("Busy One", [
        { completed: false, milestones: [{ completed: false }, { completed: false }] },
      ]),
    ]);

    expect(summary.big).toBe(2);
    // Busy One (2 pending milestones) should be sorted ahead of Clear One.
    expect(summary.rows[0].label).toBe("Busy One");
    expect(summary.rows[0].badge).toEqual({ tone: "orange", label: "2 milestones pending" });
  });

  it("marks a project with only in-progress grants as 'in progress'", () => {
    const summary = buildProjectsSummary([
      project("In Progress", [{ completed: false, milestones: [{ completed: true }] }]),
    ]);
    expect(summary.rows[0].badge).toEqual({ tone: "blue", label: "1 grant in progress" });
  });

  it("marks a fully-complete project as All caught up", () => {
    const summary = buildProjectsSummary([project("Done", [{ completed: true, milestones: [] }])]);
    expect(summary.rows[0].badge).toEqual({ tone: "green", label: "All caught up" });
  });

  it("caps preview rows at three", () => {
    const summary = buildProjectsSummary(
      Array.from({ length: 5 }, (_, i) => project(`P${i}`, [{ completed: true, milestones: [] }]))
    );
    expect(summary.big).toBe(5);
    expect(summary.rows).toHaveLength(3);
  });
});

describe("buildCommunitiesSummary", () => {
  it("counts communities and sorts by pending applications", () => {
    const summary = buildCommunitiesSummary([community("Quiet", 1, 0), community("Busy", 2, 12)]);
    expect(summary.big).toBe(2);
    expect(summary.rows[0].label).toBe("Busy");
    expect(summary.rows[0].badge).toEqual({ tone: "amber", label: "12 applications" });
    // No pending applications → no badge (the row just shows the community name).
    expect(summary.rows[1].badge).toBeUndefined();
  });

  it("pluralizes the app count", () => {
    const summary = buildCommunitiesSummary([community("Solo", 1, 1)]);
    expect(summary.rows[0].badge).toEqual({ tone: "amber", label: "1 application" });
  });

  it("links each community row to its manage page (not action-items)", () => {
    const summary = buildCommunitiesSummary([community("Busy", 2, 12)]);
    expect(summary.rows[0].href).toBe("/admin/Busy");
  });
});

describe("buildApplicationsSummary", () => {
  it("totals status counts and maps status to badges", () => {
    const summary = buildApplicationsSummary(
      [application("Grant A", "approved"), application("Grant B", "pending")],
      { approved: 3, pending: 2, rejected: 1 }
    );
    expect(summary.big).toBe(6);
    expect(summary.rows[0].badge).toEqual({ tone: "green", label: "Approved" });
    expect(summary.rows[1].badge).toEqual({ tone: "blue", label: "Pending" });
  });

  it("maps draft to a gray Draft badge", () => {
    const summary = buildApplicationsSummary([application("Draft One", "draft")], { draft: 1 });
    expect(summary.rows[0].badge).toEqual({ tone: "gray", label: "Draft" });
  });

  it("falls back to the raw status label for unmapped statuses", () => {
    const summary = buildApplicationsSummary(
      // biome-ignore lint/suspicious/noExplicitAny: exercising the unknown-status fallback
      [application("Odd One", "archived" as any)],
      { archived: 1 }
    );
    expect(summary.rows[0].badge).toEqual({ tone: "gray", label: "archived" });
  });
});
