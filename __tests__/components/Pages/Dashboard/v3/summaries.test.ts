import {
  buildApplicationsSummary,
  buildCommunitiesSummary,
  buildProjectsSummary,
  buildReviewsSummary,
} from "@/components/Pages/Dashboard/v3/summaries";
import type { DashboardAdminCommunity } from "@/hooks/useDashboardAdmin";
import type { FundingProgram } from "@/services/fundingPlatformService";
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

// The tile counts applications that still need a review decision, so seed the
// program with `pendingApplications` (the field buildReviewsSummary reads).
const program = (communitySlug: string, communityName: string, pendingApplications: number) =>
  ({
    programId: `${communitySlug}-${pendingApplications}`,
    communitySlug,
    communityName,
    metrics: { totalApplications: pendingApplications + 5, pendingApplications },
  }) as unknown as FundingProgram;

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
    expect(summary.rows[0].badge).toEqual({ tone: "amber", label: "2 milestones pending" });
  });

  it("marks a project with only in-progress grants as 'to complete'", () => {
    const summary = buildProjectsSummary([
      project("In Progress", [{ completed: false, milestones: [{ completed: true }] }]),
    ]);
    expect(summary.rows[0].badge).toEqual({ tone: "amber", label: "1 grant to complete" });
  });

  it("marks a fully-complete project as Clear", () => {
    const summary = buildProjectsSummary([project("Done", [{ completed: true, milestones: [] }])]);
    expect(summary.rows[0].badge).toEqual({ tone: "green", label: "Clear" });
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
    expect(summary.rows[1].badge).toEqual({ tone: "gray", label: "Clear" });
  });

  it("pluralizes the app count", () => {
    const summary = buildCommunitiesSummary([community("Solo", 1, 1)]);
    expect(summary.rows[0].badge).toEqual({ tone: "amber", label: "1 application" });
  });
});

describe("buildReviewsSummary", () => {
  it("groups programs by community and sums applications to review", () => {
    const summary = buildReviewsSummary([
      program("filecoin", "Filecoin", 10),
      program("filecoin", "Filecoin", 32),
      program("optimism", "Optimism", 18),
    ]);
    // big = number of distinct communities, labeled to avoid reading as open reviews
    expect(summary.big).toBe("2 communities");
    // Filecoin (42) sorted ahead of Optimism (18)
    expect(summary.rows[0]).toMatchObject({
      label: "Filecoin",
      badge: { tone: "amber", label: "42 to review" },
    });
    expect(summary.rows[1].label).toBe("Optimism");
  });

  it("omits communities with no applications to review", () => {
    const summary = buildReviewsSummary([program("empty", "Empty", 0)]);
    expect(summary.rows).toHaveLength(0);
  });

  it("includes admin communities with pending applications alongside reviewer programs", () => {
    const summary = buildReviewsSummary(
      [program("filecoin", "Filecoin", 10)],
      [community("Optimism Admin", 1, 5)]
    );
    expect(summary.big).toBe("2 communities");
    expect(summary.rows.map((r) => r.label)).toEqual(
      expect.arrayContaining(["Filecoin", "Optimism Admin"])
    );
  });

  it("does not double-count a community already covered by a reviewer program", () => {
    const summary = buildReviewsSummary(
      [program("filecoin", "Filecoin", 10)],
      [community("filecoin", 1, 5)]
    );
    expect(summary.big).toBe("1 community");
    expect(summary.rows[0]).toMatchObject({ badge: { label: "10 to review" } });
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
