import { applicationKeys, wlQueryKeys } from "@/src/lib/query-keys";

describe("applicationKeys", () => {
  it("all returns ['application']", () => {
    expect(applicationKeys.all).toEqual(["application"]);
  });

  it("detail includes communityId, id, and auth flag", () => {
    const key = applicationKeys.detail("optimism", "app-123", true);
    expect(key).toEqual(["application", "optimism", "app-123", true]);
  });

  it("detail differentiates by auth flag", () => {
    const authed = applicationKeys.detail("optimism", "app-123", true);
    const unauthed = applicationKeys.detail("optimism", "app-123", false);
    expect(authed).not.toEqual(unauthed);
  });

  it("keys are stable — same input produces same output", () => {
    expect(applicationKeys.detail("c1", "id1", true)).toEqual(
      applicationKeys.detail("c1", "id1", true)
    );
  });
});

describe("wlQueryKeys.comments", () => {
  it("public includes referenceNumber and communityId", () => {
    const key = wlQueryKeys.comments.public("ref-42", "optimism");
    expect(key).toEqual(["wl-public-comments", "ref-42", "optimism"]);
  });

  it("public keys differ by communityId to prevent cross-tenant collisions", () => {
    const key1 = wlQueryKeys.comments.public("ref-1", "optimism");
    const key2 = wlQueryKeys.comments.public("ref-1", "arbitrum");
    expect(key1).not.toEqual(key2);
  });

  it("application includes applicationId and communityId", () => {
    const key = wlQueryKeys.comments.application("app-99", "optimism");
    expect(key).toEqual(["wl-application-comments", "app-99", "optimism"]);
  });

  it("application keys differ by communityId", () => {
    const key1 = wlQueryKeys.comments.application("app-1", "optimism");
    const key2 = wlQueryKeys.comments.application("app-1", "arbitrum");
    expect(key1).not.toEqual(key2);
  });

  it("public and application keys have different prefixes", () => {
    expect(wlQueryKeys.comments.public("x", "optimism")[0]).toBe("wl-public-comments");
    expect(wlQueryKeys.comments.application("x", "optimism")[0]).toBe("wl-application-comments");
  });
});

describe("wlQueryKeys.programs", () => {
  it("list uses null for undefined address", () => {
    const key = wlQueryKeys.programs.list("optimism", undefined);
    expect(key).toEqual(["wl-programs-list", "optimism", null]);
  });

  it("list uses null when address not provided", () => {
    const key = wlQueryKeys.programs.list("optimism");
    expect(key).toEqual(["wl-programs-list", "optimism", null]);
  });

  it("list includes address when provided", () => {
    const key = wlQueryKeys.programs.list("optimism", "0xabc123");
    expect(key).toEqual(["wl-programs-list", "optimism", "0xabc123"]);
  });

  it("list keys differ between authed and unauthed (null vs address)", () => {
    const unauthed = wlQueryKeys.programs.list("optimism", null);
    const authed = wlQueryKeys.programs.list("optimism", "0xabc123");
    expect(unauthed).not.toEqual(authed);
  });

  it("keys are stable — same input produces same output", () => {
    expect(wlQueryKeys.programs.list("arbitrum", "0xdef")).toEqual(
      wlQueryKeys.programs.list("arbitrum", "0xdef")
    );
  });
});
