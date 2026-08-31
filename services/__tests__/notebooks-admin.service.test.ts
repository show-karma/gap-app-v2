vi.mock("@/utilities/api/client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NOTEBOOK_SEED_SPEC } from "@/services/notebooks/notebook-seed-spec";
import { NotebookSpecSchema } from "@/services/notebooks/notebook-spec";
import {
  createNotebook,
  deleteNotebook,
  getAdminNotebook,
  getAdminNotebooks,
  sanitizeSlugInput,
  setNotebookStatus,
  slugifyNotebookName,
  updateNotebook,
} from "@/services/notebooks-admin.service";
import { api } from "@/utilities/api/client";

const mockedApi = vi.mocked(api);

function makeConfig(overrides: Record<string, unknown> = {}) {
  return {
    id: "cfg-1",
    communityId: "0xfilecoin",
    slug: "grants-overview",
    name: "Grants overview",
    description: null,
    spec: NOTEBOOK_SEED_SPEC,
    status: "draft",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-02T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("admin reads", () => {
  // The builder must NOT reuse the public endpoints: those are published-only
  // by construction, so a draft 404s there exactly as an unknown slug does.
  // Hitting them would make the builder blind to the drafts it exists to edit.
  it("lists through the authenticated admin path, not the public one", async () => {
    mockedApi.get.mockResolvedValue([makeConfig()]);

    await getAdminNotebooks("filecoin");

    const [path] = mockedApi.get.mock.calls[0];
    expect(path).toBe("/v2/communities/filecoin/notebook-configs/admin/all");
  });

  it("reads one page through the authenticated admin path", async () => {
    mockedApi.get.mockResolvedValue(makeConfig());

    await getAdminNotebook("filecoin", "grants-overview");

    const [path] = mockedApi.get.mock.calls[0];
    expect(path).toBe("/v2/communities/filecoin/notebook-configs/admin/grants-overview");
  });

  // Authenticated by default. Passing isAuthorized:false here would turn a
  // 401 into an empty builder that looks like "you have no pages".
  it("does not opt out of authorization on either read", async () => {
    mockedApi.get.mockResolvedValue([]);

    await getAdminNotebooks("filecoin");

    const [, opts] = mockedApi.get.mock.calls[0];
    expect(opts).not.toHaveProperty("isAuthorized", false);
  });

  it("returns an empty list when the API answers with nothing", async () => {
    mockedApi.get.mockResolvedValue(null);

    await expect(getAdminNotebooks("filecoin")).resolves.toEqual([]);
  });

  // A failure is an error to surface, never an empty state to render.
  it("propagates a read failure rather than swallowing it", async () => {
    mockedApi.get.mockRejectedValue(new Error("403 Forbidden"));

    await expect(getAdminNotebooks("filecoin")).rejects.toThrow("403 Forbidden");
  });
});

describe("admin writes", () => {
  it("creates through POST on the community collection", async () => {
    mockedApi.post.mockResolvedValue(makeConfig());

    await createNotebook("filecoin", {
      slug: "grants-overview",
      name: "Grants overview",
      spec: NOTEBOOK_SEED_SPEC,
    });

    const [path, body] = mockedApi.post.mock.calls[0];
    expect(path).toBe("/v2/communities/filecoin/notebook-configs");
    expect(body).toMatchObject({ slug: "grants-overview", spec: NOTEBOOK_SEED_SPEC });
  });

  // Publishing must be a deliberate act, so create does not send a status and
  // the server's `draft` default stands.
  it("does not smuggle a status onto a plain create", async () => {
    mockedApi.post.mockResolvedValue(makeConfig());

    await createNotebook("filecoin", {
      slug: "grants-overview",
      name: "Grants overview",
      spec: NOTEBOOK_SEED_SPEC,
    });

    const [, body] = mockedApi.post.mock.calls[0];
    expect(body).not.toHaveProperty("status");
  });

  it("updates through PUT on the page", async () => {
    mockedApi.put.mockResolvedValue(makeConfig());

    await updateNotebook("filecoin", "grants-overview", { name: "Renamed" });

    const [path, body] = mockedApi.put.mock.calls[0];
    expect(path).toBe("/v2/communities/filecoin/notebook-configs/grants-overview");
    expect(body).toEqual({ name: "Renamed" });
  });

  // Publish/unpublish sends status ALONE. Sending the whole config would let a
  // stale form field ride along with what an author thinks is a status change.
  it.each(["published", "draft"] as const)("sends %s as a status-only update", async (status) => {
    mockedApi.put.mockResolvedValue(makeConfig({ status }));

    await setNotebookStatus("filecoin", "grants-overview", status);

    const [, body] = mockedApi.put.mock.calls[0];
    expect(body).toEqual({ status });
  });

  it("deletes through DELETE on the page", async () => {
    mockedApi.delete.mockResolvedValue(undefined);

    await deleteNotebook("filecoin", "grants-overview");

    const [path] = mockedApi.delete.mock.calls[0];
    expect(path).toBe("/v2/communities/filecoin/notebook-configs/grants-overview");
  });

  // The endpoint answers 204 with no body. Demanding one would turn a
  // successful delete into a parse error the UI would report as a failure.
  it("tolerates an empty 204 body on delete", async () => {
    mockedApi.delete.mockResolvedValue(undefined);

    await expect(deleteNotebook("filecoin", "grants-overview")).resolves.toBeUndefined();
  });
});

describe("slugifyNotebookName", () => {
  it.each([
    ["Grants & milestones overview", "grants-milestones-overview"],
    ["  Trailing and leading  ", "trailing-and-leading"],
    ["Already-a-slug", "already-a-slug"],
    ["UPPER CASE", "upper-case"],
    ["multiple   spaces", "multiple-spaces"],
    ["punctuation!!! everywhere???", "punctuation-everywhere"],
    ["2026 report", "2026-report"],
  ])("turns %s into %s", (name, expected) => {
    expect(slugifyNotebookName(name)).toBe(expected);
  });

  // Combining marks are stripped rather than dropping the letter with them.
  it("folds accents to their base letters", () => {
    expect(slugifyNotebookName("Café résumé")).toBe("cafe-resume");
  });

  // The result feeds the same schema the server enforces, so it must never
  // start or end with a hyphen — including after the length clamp.
  it("never starts or ends with a hyphen", () => {
    expect(slugifyNotebookName("---leading and trailing---")).toBe("leading-and-trailing");
  });

  it("clamps to the schema's length limit without a trailing hyphen", () => {
    const slug = slugifyNotebookName(`${"a".repeat(199)} tail`);

    expect(slug.length).toBeLessThanOrEqual(200);
    expect(slug.endsWith("-")).toBe(false);
  });

  // A name that survives nothing returns "", which the caller treats as "ask
  // the author" — an empty slug fails the same schema on the way out.
  it("returns an empty string when nothing survives", () => {
    expect(slugifyNotebookName("日本語")).toBe("");
    expect(slugifyNotebookName("!!!")).toBe("");
  });
});

describe("per-source date ranges", () => {
  // An indicator series has dated points, so "all time" is a real answer.
  it("accepts an all-time window for an indicator series", () => {
    expect(
      NotebookSpecSchema.safeParse({
        version: 1,
        sections: [
          {
            type: "timeseries",
            source: "indicators",
            indicatorId: "5fadb30d-558d-45fc-b873-a8fe678cedd4",
            chartStyle: "line",
            range: "all",
            title: "Pool TVL",
          },
        ],
      }).success
    ).toBe(true);
  });

  it.each(["30d", "90d", "12m"] as const)("accepts the %s window", (range) => {
    expect(
      NotebookSpecSchema.safeParse({
        version: 1,
        sections: [
          {
            type: "timeseries",
            source: "indicators",
            indicatorId: "5fadb30d-558d-45fc-b873-a8fe678cedd4",
            chartStyle: "line",
            range,
            title: "Pool TVL",
          },
        ],
      }).success
    ).toBe(true);
  });
});

describe("sanitizeSlugInput", () => {
  // The bug this exists for: slugifying every keystroke deletes a hyphen the
  // instant it is typed, so "grants-overview" cannot be entered by hand at all.
  it("keeps a trailing hyphen so one can actually be typed", () => {
    expect(sanitizeSlugInput("grants-")).toBe("grants-");
  });

  it("still refuses everything else the schema refuses, as it is typed", () => {
    expect(sanitizeSlugInput("Grants Overview")).toBe("grants-overview");
    expect(sanitizeSlugInput("-leading")).toBe("leading");
    expect(sanitizeSlugInput("double--hyphen")).toBe("double-hyphen");
    expect(sanitizeSlugInput("sym!!bols")).toBe("sym-bols");
  });

  it("clamps to the schema's length limit", () => {
    expect(sanitizeSlugInput("a".repeat(400))).toHaveLength(200);
  });

  // Typing the slug one character at a time must land on the same value as
  // pasting it whole — otherwise the field fights the author mid-word.
  it("survives character-by-character entry", () => {
    const target = "grants-milestones-overview";
    let typed = "";
    for (const char of target) typed = sanitizeSlugInput(typed + char);

    expect(typed).toBe(target);
  });
});
