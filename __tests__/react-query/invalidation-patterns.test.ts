/**
 * Task 38: React Query invalidation pattern tests.
 *
 * These tests verify that cache invalidation works correctly for
 * project-related queries using the predicate-based invalidation pattern.
 * Incorrect invalidation is a common source of stale data bugs.
 */
import { type Query, QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createProjectQueryPredicate } from "@/utilities/queryKeys";

describe("createProjectQueryPredicate — invalidation scoping", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("matches project query with UID at index 1", () => {
    const predicate = createProjectQueryPredicate("project-uid-123");
    const query = { queryKey: ["project", "project-uid-123"] } as Query;
    expect(predicate(query)).toBe(true);
  });

  it("matches project-updates queries", () => {
    const predicate = createProjectQueryPredicate("project-uid-123");
    const query = { queryKey: ["project-updates", "project-uid-123"] } as Query;
    expect(predicate(query)).toBe(true);
  });

  it("matches project-milestones queries", () => {
    const predicate = createProjectQueryPredicate("project-uid-123");
    const query = { queryKey: ["project-milestones", "project-uid-123"] } as Query;
    expect(predicate(query)).toBe(true);
  });

  it("matches project-grants queries", () => {
    const predicate = createProjectQueryPredicate("project-uid-123");
    const query = { queryKey: ["project-grants", "project-uid-123"] } as Query;
    expect(predicate(query)).toBe(true);
  });

  it("matches project-impacts queries", () => {
    const predicate = createProjectQueryPredicate("project-uid-123");
    const query = { queryKey: ["project-impacts", "project-uid-123"] } as Query;
    expect(predicate(query)).toBe(true);
  });

  it("matches legacy projectMilestones key format", () => {
    const predicate = createProjectQueryPredicate("project-uid-123");
    const query = { queryKey: ["projectMilestones", "project-uid-123"] } as Query;
    expect(predicate(query)).toBe(true);
  });

  it("does NOT match unrelated query prefixes", () => {
    const predicate = createProjectQueryPredicate("project-uid-123");
    const query = { queryKey: ["application", "project-uid-123"] } as Query;
    expect(predicate(query)).toBe(false);
  });

  it("does NOT match a different project UID", () => {
    const predicate = createProjectQueryPredicate("project-uid-123");
    const query = { queryKey: ["project", "project-uid-999"] } as Query;
    expect(predicate(query)).toBe(false);
  });

  it("matches case-insensitively on the project ID", () => {
    const predicate = createProjectQueryPredicate("Project-UID-123");
    const query = { queryKey: ["project", "project-uid-123"] } as Query;
    expect(predicate(query)).toBe(true);
  });

  it("handles empty query keys gracefully", () => {
    const predicate = createProjectQueryPredicate("project-uid-123");
    const query = { queryKey: [] } as unknown as Query;
    expect(predicate(query)).toBe(false);
  });

  it("invalidates all project queries in a QueryClient", async () => {
    const uid = "project-uid-abc";

    queryClient.setQueryData(["project", uid], { title: "My Project" });
    queryClient.setQueryData(["project-updates", uid], [{ update: "v1" }]);
    queryClient.setQueryData(["project-milestones", uid], [{ milestone: "m1" }]);
    // Unrelated query
    queryClient.setQueryData(["application", "app-001"], { status: "pending" });

    expect(queryClient.getQueryCache().getAll()).toHaveLength(4);

    await queryClient.invalidateQueries({
      predicate: createProjectQueryPredicate(uid),
    });

    // The three project queries should be invalidated (stale)
    const projectQuery = queryClient.getQueryCache().find({ queryKey: ["project", uid] });
    expect(projectQuery?.isStale()).toBe(true);

    // The application query should NOT be affected
    const appQuery = queryClient.getQueryCache().find({ queryKey: ["application", "app-001"] });
    expect(appQuery?.isStale()).toBe(false);
  });

  it("does not accidentally invalidate another project's data", async () => {
    queryClient.setQueryData(["project", "uid-A"], { title: "Project A" });
    queryClient.setQueryData(["project", "uid-B"], { title: "Project B" });

    await queryClient.invalidateQueries({
      predicate: createProjectQueryPredicate("uid-A"),
    });

    const queryA = queryClient.getQueryCache().find({ queryKey: ["project", "uid-A"] });
    const queryB = queryClient.getQueryCache().find({ queryKey: ["project", "uid-B"] });

    expect(queryA?.isStale()).toBe(true);
    expect(queryB?.isStale()).toBe(false);
  });
});
