import type { UnifiedMilestone } from "@/types/v2/roadmap";
import {
  assignGrantMilestoneOrder,
  buildGrantMilestoneOrderMap,
} from "@/utilities/milestones/assignGrantMilestoneOrder";

function createGrantMilestone(
  uid: string,
  grantUID: string,
  options: { endsAt?: number; createdAt?: string } = {}
): UnifiedMilestone {
  return {
    uid,
    title: `Milestone ${uid}`,
    description: "",
    completed: false,
    type: "grant",
    createdAt: options.createdAt || "2024-01-01T00:00:00Z",
    chainID: 1,
    refUID: grantUID,
    endsAt: options.endsAt,
    source: {
      grantMilestone: {
        milestone: {
          uid: `gm-${uid}`,
          chainID: 1,
          title: `Milestone ${uid}`,
          verified: [],
        },
        grant: {
          uid: grantUID,
          chainID: 1,
          details: { title: `Grant ${grantUID}` },
        },
      },
    },
  };
}

function createProjectMilestone(uid: string): UnifiedMilestone {
  return {
    uid,
    title: `Project Milestone ${uid}`,
    description: "",
    completed: false,
    type: "milestone",
    createdAt: "2024-01-01T00:00:00Z",
    chainID: 0,
    refUID: "",
    source: {
      projectMilestone: { uid: `pm-${uid}`, attester: "0x0" },
    },
  };
}

describe("assignGrantMilestoneOrder", () => {
  it("returns empty array for empty input", () => {
    expect(assignGrantMilestoneOrder([])).toEqual([]);
  });

  it("assigns 1..N per grant sorted ascending by endsAt", () => {
    const a = createGrantMilestone("a", "grant-1", { endsAt: 3000 });
    const b = createGrantMilestone("b", "grant-1", { endsAt: 1000 });
    const c = createGrantMilestone("c", "grant-1", { endsAt: 2000 });

    const result = assignGrantMilestoneOrder([a, b, c]);

    const byUid = Object.fromEntries(result.map((m) => [m.uid, m.grantMilestoneOrder]));
    expect(byUid.b).toEqual({ index: 1, total: 3 });
    expect(byUid.c).toEqual({ index: 2, total: 3 });
    expect(byUid.a).toEqual({ index: 3, total: 3 });
  });

  it("scopes numbering per grant", () => {
    const g1a = createGrantMilestone("g1a", "grant-1", { endsAt: 1000 });
    const g1b = createGrantMilestone("g1b", "grant-1", { endsAt: 2000 });
    const g2a = createGrantMilestone("g2a", "grant-2", { endsAt: 5000 });

    const result = assignGrantMilestoneOrder([g1a, g1b, g2a]);
    const byUid = Object.fromEntries(result.map((m) => [m.uid, m.grantMilestoneOrder]));

    expect(byUid.g1a).toEqual({ index: 1, total: 2 });
    expect(byUid.g1b).toEqual({ index: 2, total: 2 });
    expect(byUid.g2a).toEqual({ index: 1, total: 1 });
  });

  it("falls back to createdAt when endsAt is missing", () => {
    const a = createGrantMilestone("a", "grant-1", { createdAt: "2024-03-01T00:00:00Z" });
    const b = createGrantMilestone("b", "grant-1", { createdAt: "2024-01-01T00:00:00Z" });
    const c = createGrantMilestone("c", "grant-1", { createdAt: "2024-02-01T00:00:00Z" });

    const result = assignGrantMilestoneOrder([a, b, c]);
    const byUid = Object.fromEntries(result.map((m) => [m.uid, m.grantMilestoneOrder]));

    expect(byUid.b).toEqual({ index: 1, total: 3 });
    expect(byUid.c).toEqual({ index: 2, total: 3 });
    expect(byUid.a).toEqual({ index: 3, total: 3 });
  });

  it("does not stamp non-grant items", () => {
    const grant = createGrantMilestone("g", "grant-1", { endsAt: 1000 });
    const project = createProjectMilestone("p");

    const result = assignGrantMilestoneOrder([grant, project]);
    const byUid = Object.fromEntries(result.map((m) => [m.uid, m.grantMilestoneOrder]));

    expect(byUid.g).toEqual({ index: 1, total: 1 });
    expect(byUid.p).toBeUndefined();
  });

  it("does not mutate the input array or its items", () => {
    const a = createGrantMilestone("a", "grant-1", { endsAt: 2000 });
    const b = createGrantMilestone("b", "grant-1", { endsAt: 1000 });
    const input = [a, b];

    const result = assignGrantMilestoneOrder(input);

    expect(a.grantMilestoneOrder).toBeUndefined();
    expect(b.grantMilestoneOrder).toBeUndefined();
    expect(result).not.toBe(input);
  });

  it("breaks ties deterministically by uid", () => {
    const a = createGrantMilestone("zzz", "grant-1", { endsAt: 1000 });
    const b = createGrantMilestone("aaa", "grant-1", { endsAt: 1000 });

    const result = assignGrantMilestoneOrder([a, b]);
    const byUid = Object.fromEntries(result.map((m) => [m.uid, m.grantMilestoneOrder]));

    expect(byUid.aaa).toEqual({ index: 1, total: 2 });
    expect(byUid.zzz).toEqual({ index: 2, total: 2 });
  });
});

describe("buildGrantMilestoneOrderMap", () => {
  it("orders by endsAt ascending regardless of input order", () => {
    const map = buildGrantMilestoneOrderMap([
      { uid: "m3", endsAt: 3000 },
      { uid: "m1", endsAt: 1000 },
      { uid: "m2", endsAt: 2000 },
    ]);

    expect(map.get("m1")).toEqual({ index: 1, total: 3 });
    expect(map.get("m2")).toEqual({ index: 2, total: 3 });
    expect(map.get("m3")).toEqual({ index: 3, total: 3 });
  });

  it("falls back to createdAt when endsAt is missing", () => {
    const map = buildGrantMilestoneOrderMap([
      { uid: "a", createdAt: "2024-03-01T00:00:00Z" },
      { uid: "b", createdAt: "2024-01-01T00:00:00Z" },
    ]);

    expect(map.get("b")).toEqual({ index: 1, total: 2 });
    expect(map.get("a")).toEqual({ index: 2, total: 2 });
  });

  it("returns empty map for empty input", () => {
    expect(buildGrantMilestoneOrderMap([]).size).toBe(0);
  });
});
