import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  isValidProjectRevalidationSignature,
  MAX_PROJECTS_PER_NOTICE,
  projectRevalidationNoticeSchema,
  SIGNATURE_TOLERANCE_SECONDS,
} from "@/src/domain/cache/project-revalidation";

const SECRET = "s".repeat(64);
const NOW = 1_800_000_000;
const UID = `0x${"a".repeat(64)}`;
const BODY = JSON.stringify({ projects: [{ uid: UID }] });

function sign(body: string, timestamp = NOW, secret = SECRET): string {
  const digest = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return `t=${timestamp},v1=${digest}`;
}

function check(header: string | null, rawBody = BODY, nowSeconds = NOW, secret = SECRET) {
  return isValidProjectRevalidationSignature({ secret, header, rawBody, nowSeconds });
}

describe("isValidProjectRevalidationSignature", () => {
  it("accepts the signature gap-indexer produces (shared test vector)", () => {
    // Same vector as gap-indexer's frontend-project-cache.invalidator.test.ts.
    const header =
      "t=1700000000,v1=b8569b78799ff9e3cbff0fc2d63a33a2b57f3282abd07c37ae5e8e7d79a5f163";

    expect(check(header, "{}", 1_700_000_000, "secret")).toBe(true);
  });

  it("accepts a fresh signature of the exact body", () => {
    expect(check(sign(BODY))).toBe(true);
  });

  it("rejects a signature made with another secret", () => {
    expect(check(sign(BODY, NOW, "x".repeat(64)))).toBe(false);
  });

  it("rejects a body changed after signing", () => {
    expect(check(sign(BODY), BODY.replace("a", "b"))).toBe(false);
  });

  it("rejects a signature older than the tolerance window", () => {
    expect(check(sign(BODY, NOW - SIGNATURE_TOLERANCE_SECONDS - 1))).toBe(false);
  });

  it("rejects a signature from too far in the future", () => {
    expect(check(sign(BODY, NOW + SIGNATURE_TOLERANCE_SECONDS + 1))).toBe(false);
  });

  it("accepts a signature at the edge of the window", () => {
    expect(check(sign(BODY, NOW - SIGNATURE_TOLERANCE_SECONDS))).toBe(true);
  });

  it.each([
    ["no header", null],
    ["an empty header", ""],
    ["no timestamp", `v1=${"0".repeat(64)}`],
    ["no digest", `t=${NOW}`],
    ["a non-hex digest", `t=${NOW},v1=${"z".repeat(64)}`],
    ["a short digest", `t=${NOW},v1=abc`],
    ["a non-numeric timestamp", `t=soon,v1=${"0".repeat(64)}`],
  ])("rejects %s", (_case, header) => {
    expect(check(header)).toBe(false);
  });

  it("rejects everything when no secret is configured", () => {
    expect(check(sign(BODY, NOW, ""), BODY, NOW, "")).toBe(false);
  });
});

describe("projectRevalidationNoticeSchema", () => {
  it("accepts a list of project uids", () => {
    expect(projectRevalidationNoticeSchema.parse({ projects: [{ uid: UID }] })).toEqual({
      projects: [{ uid: UID }],
    });
  });

  it.each([
    ["a slug", "my-project"],
    ["a short hex string", "0xabc"],
    ["a tag-like string", `${UID},project:other`],
  ])("rejects %s as a uid", (_case, uid) => {
    expect(projectRevalidationNoticeSchema.safeParse({ projects: [{ uid }] }).success).toBe(false);
  });

  it("rejects an empty list", () => {
    expect(projectRevalidationNoticeSchema.safeParse({ projects: [] }).success).toBe(false);
  });

  it("rejects more projects than the indexer ever sends at once", () => {
    const projects = Array.from({ length: MAX_PROJECTS_PER_NOTICE + 1 }, () => ({ uid: UID }));

    expect(projectRevalidationNoticeSchema.safeParse({ projects }).success).toBe(false);
  });
});
