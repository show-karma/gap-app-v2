/**
 * @file Content gateway behavior tests.
 *
 * Assert BEHAVIOR (what callers get back), never GROQ query strings or raw
 * mock call counts — the gateway is the one module allowed to know Sanity
 * internals, and these tests should keep passing through a query rewrite.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMockBlogPost,
  createMockBlogPostSlugEntry,
  createMockBlogPostSummary,
} from "../../factories/blogPost.factory";

const { fetchMock, withConfigMock, getServerEnvMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  withConfigMock: vi.fn(),
  getServerEnvMock: vi.fn(),
}));

vi.mock("@/sanity/lib/client", () => ({
  client: {
    fetch: fetchMock,
    withConfig: withConfigMock,
  },
}));

vi.mock("@/sanity/env", () => ({
  projectId: "test-project-id",
  dataset: "production",
  apiVersion: "2024-01-01",
}));

vi.mock("@/utilities/env", () => ({
  getServerEnv: getServerEnvMock,
}));

import { getPostBySlug, getPublishedPosts, getPublishedSlugs } from "@/sanity/lib/gateway";

beforeEach(() => {
  vi.clearAllMocks();
  getServerEnvMock.mockReturnValue({
    SANITY_VIEWER_TOKEN: "viewer-token",
    SANITY_WEBHOOK_SECRET: "",
    SANITY_REVALIDATE_SECRET: "",
    SANITY_PREVIEW_SECRET: "",
  });
});

describe("getPublishedPosts", () => {
  it("returns the published post summaries newest-first as given by the client", async () => {
    const posts = [createMockBlogPostSummary(), createMockBlogPostSummary()];
    fetchMock.mockResolvedValueOnce(posts);

    const result = await getPublishedPosts();

    expect(result).toEqual(posts);
  });

  it("returns an empty array when the CMS call fails", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network error"));

    const result = await getPublishedPosts();

    expect(result).toEqual([]);
  });

  it("returns an empty array when the CMS has no posts", async () => {
    fetchMock.mockResolvedValueOnce(null);

    const result = await getPublishedPosts();

    expect(result).toEqual([]);
  });
});

describe("getPostBySlug", () => {
  it("returns the post for a known slug", async () => {
    const post = createMockBlogPost({ slug: "hello-world" });
    fetchMock.mockResolvedValueOnce(post);

    const result = await getPostBySlug("hello-world");

    expect(result).toEqual(post);
  });

  it("returns null for an unknown slug", async () => {
    fetchMock.mockResolvedValueOnce(null);

    const result = await getPostBySlug("does-not-exist");

    expect(result).toBeNull();
  });

  it("returns null when the CMS call fails", async () => {
    fetchMock.mockRejectedValueOnce(new Error("boom"));

    const result = await getPostBySlug("hello-world");

    expect(result).toBeNull();
  });

  it("reads from the draft client (never the published client) when draft: true", async () => {
    const draftFetchMock = vi.fn().mockResolvedValueOnce(createMockBlogPost());
    withConfigMock.mockReturnValueOnce({ fetch: draftFetchMock });

    const result = await getPostBySlug("hello-world", { draft: true });

    expect(result).not.toBeNull();
    expect(draftFetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("switches the draft client to the drafts perspective", async () => {
    withConfigMock.mockReturnValueOnce({ fetch: vi.fn().mockResolvedValueOnce(null) });

    await getPostBySlug("hello-world", { draft: true });

    expect(withConfigMock).toHaveBeenCalledWith(expect.objectContaining({ perspective: "drafts" }));
  });

  it("reads from the published client (never the draft client) by default", async () => {
    fetchMock.mockResolvedValueOnce(createMockBlogPost());

    await getPostBySlug("hello-world");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(withConfigMock).not.toHaveBeenCalled();
  });
});

describe("getPublishedSlugs", () => {
  it("returns slug + publishedAt pairs for the sitemap", async () => {
    const slugs = [createMockBlogPostSlugEntry(), createMockBlogPostSlugEntry()];
    fetchMock.mockResolvedValueOnce(slugs);

    const result = await getPublishedSlugs();

    expect(result).toEqual(slugs);
  });

  it("returns an empty array when the CMS call fails", async () => {
    fetchMock.mockRejectedValueOnce(new Error("boom"));

    const result = await getPublishedSlugs();

    expect(result).toEqual([]);
  });
});

describe("when Sanity is not configured (empty projectId)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock("@/sanity/env", () => ({
      projectId: "",
      dataset: "production",
      apiVersion: "2024-01-01",
    }));
  });

  it("short-circuits every gateway function to an empty result without calling the client", async () => {
    const gateway = await import("@/sanity/lib/gateway");

    await expect(gateway.getPublishedPosts()).resolves.toEqual([]);
    await expect(gateway.getPostBySlug("anything")).resolves.toBeNull();
    await expect(gateway.getPublishedSlugs()).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(withConfigMock).not.toHaveBeenCalled();
  });
});
