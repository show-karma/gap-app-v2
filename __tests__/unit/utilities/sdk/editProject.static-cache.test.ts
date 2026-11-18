/**
 * "Changed the project description; the change only showed after F5."
 *
 * The profile layout observes the project with `staleTime: "static"` and keys
 * it by the URL slug. After a successful edit the page must show the edited
 * project without a reload — whether it is keyed by slug or by uid.
 */
import { QueryObserver } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Project as ProjectResponse } from "@/types/v2/project";
import { PRERENDER_SAFE_STALE_TIME } from "@/utilities/queries/prerenderStaleTime";
import { queryClient } from "@/utilities/query-client";
import { QUERY_KEYS } from "@/utilities/queryKeys";

const mockGetProject = vi.fn();
const mockCheckSlugExists = vi.fn();
vi.mock("@/services/project.service", () => ({
  getProject: (...args: unknown[]) => mockGetProject(...args),
  checkSlugExists: (...args: unknown[]) => mockCheckSlugExists(...args),
}));
vi.mock("@/utilities/api/client", () => ({ api: { post: vi.fn().mockResolvedValue({}) } }));
vi.mock("@/components/Utilities/errorManager", () => ({ errorManager: vi.fn() }));

import { updateProject } from "@/utilities/sdk/projects/editProject";

const UID = "0x00000000000000000000000000000000000000aa";

const projectResponse = (description: string, slug: string, lastDetailsUpdate: string) =>
  ({
    uid: UID,
    updatedAt: "t0",
    details: { title: "Title", slug, description, lastDetailsUpdate },
  }) as unknown as ProjectResponse;

/** A minimal SDK Project whose attestation resolves immediately. */
function sdkProject(slug: string) {
  const details = {
    slug,
    title: "Title",
    data: { title: "Title", description: "old" },
    setValues: vi.fn((values: { slug?: string }) => {
      if (values.slug) details.slug = values.slug;
    }),
    attest: vi.fn().mockResolvedValue({ tx: [] }),
  };
  return { uid: UID, chainID: 10, details } as never;
}

const newProjectInfo = (title: string) => ({
  title,
  description: "new description",
  tags: [],
});

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

async function runUpdate(title: string, nextSlug: string) {
  const gap = { generateSlug: vi.fn().mockResolvedValue(nextSlug) };
  await updateProject(
    sdkProject("my-project"),
    newProjectInfo(title),
    {},
    {} as never,
    gap as never,
    vi.fn(),
    vi.fn(),
    vi.fn(),
    vi.fn(),
    vi.fn()
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckSlugExists.mockResolvedValue(true);
  queryClient.setQueryData(
    QUERY_KEYS.PROJECT.DETAILS("my-project"),
    projectResponse("old", "my-project", "t0")
  );
  queryClient.setQueryData(
    QUERY_KEYS.PROJECT.DETAILS(UID),
    projectResponse("old", "my-project", "t0")
  );
});

afterEach(() => {
  while (unsubscribers.length) unsubscribers.pop()?.();
  queryClient.clear();
});

describe("updateProject — the profile shows the edit without a reload", () => {
  it("description change: slug-keyed and uid-keyed static queries show the new data", async () => {
    const bySlug = observeStatic("my-project");
    const byUid = observeStatic(UID);
    // 1st call: the "before" snapshot. Every later call: the indexed result.
    mockGetProject
      .mockResolvedValueOnce(projectResponse("old", "my-project", "t0"))
      .mockResolvedValue(projectResponse("new description", "my-project", "t1"));

    await runUpdate("Title", "my-project");

    expect(bySlug.getCurrentResult().data?.details.description).toBe("new description");
    expect(byUid.getCurrentResult().data?.details.description).toBe("new description");
  });

  it("title change: the old slug's page and the new slug's entry both carry the edit", async () => {
    const bySlug = observeStatic("my-project");
    mockGetProject
      .mockResolvedValueOnce(projectResponse("old", "my-project", "t0"))
      .mockResolvedValue(projectResponse("new description", "new-title", "t1"));

    await runUpdate("New Title", "new-title");

    expect(bySlug.getCurrentResult().data?.details.description).toBe("new description");
    const renamed = queryClient.getQueryState<ProjectResponse>(
      QUERY_KEYS.PROJECT.DETAILS("new-title")
    );
    expect(renamed?.data?.details.description).toBe("new description");
    // router.refresh() then hydrates a seed stamped 1 (SEED_TIMESTAMP);
    // hydrate() keeps this entry only because it is newer than that.
    expect(renamed?.dataUpdatedAt).toBeGreaterThan(1);
  });
});
