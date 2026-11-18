/**
 * `refreshProject()` is what ~20 profile flows call after a write (members,
 * contacts, links, endorsements, payout address, and the edit dialog when the
 * title is unchanged). The profile layout reads the project from a query
 * observed as `staleTime: "static"`, which `invalidateQueries` skips — so the
 * refreshed project has to reach that query some other way.
 */
import { QueryObserver } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Project as ProjectResponse } from "@/types/v2/project";
import { PRERENDER_SAFE_STALE_TIME } from "@/utilities/queries/prerenderStaleTime";
import { queryClient } from "@/utilities/query-client";
import { QUERY_KEYS } from "@/utilities/queryKeys";

const mockGetProject = vi.fn();
vi.mock("@/services/project.service", () => ({
  getProject: (...args: unknown[]) => mockGetProject(...args),
}));
vi.mock("@/services/project-grants.service", () => ({ getProjectGrants: vi.fn() }));

import { useProjectStore } from "@/store/project";

const UID = "0x00000000000000000000000000000000000000bb";
const project = (description: string) =>
  ({ uid: UID, details: { slug: "my-project", description } }) as unknown as ProjectResponse;

const unsubscribers: Array<() => void> = [];
function observeStatic(id: string) {
  const observer = new QueryObserver<ProjectResponse>(queryClient, {
    queryKey: QUERY_KEYS.PROJECT.DETAILS(id),
    queryFn: () => mockGetProject(id),
    staleTime: PRERENDER_SAFE_STALE_TIME,
  });
  unsubscribers.push(observer.subscribe(() => {}));
  return observer;
}

beforeEach(() => {
  vi.clearAllMocks();
  queryClient.setQueryData(QUERY_KEYS.PROJECT.DETAILS("my-project"), project("old"));
  queryClient.setQueryData(QUERY_KEYS.PROJECT.DETAILS(UID), project("old"));
  useProjectStore.setState({ project: project("old") });
});

afterEach(() => {
  while (unsubscribers.length) unsubscribers.pop()?.();
  queryClient.clear();
  useProjectStore.setState({ project: undefined });
});

describe("refreshProject — static profile queries", () => {
  it("puts the refreshed project into the slug-keyed and uid-keyed queries", async () => {
    const bySlug = observeStatic("my-project");
    const byUid = observeStatic(UID);
    mockGetProject.mockResolvedValue(project("new"));

    await useProjectStore.getState().refreshProject();

    expect(bySlug.getCurrentResult().data?.details.description).toBe("new");
    expect(byUid.getCurrentResult().data?.details.description).toBe("new");
    expect(useProjectStore.getState().project?.details.description).toBe("new");
  });
});
