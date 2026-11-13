/**
 * @file `/api/cache/projects/revalidate`: gap-indexer's project-changed
 * notices. Wire contract: POST, raw JSON body `{ projects: [{ uid }] }`,
 * `x-karma-signature: t=<unix s>,v1=<hex HMAC-SHA256("<t>.<body>")>`.
 */
import { createHmac } from "node:crypto";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { revalidateTagMock, getServerEnvMock, sentryCaptureMock } = vi.hoisted(() => ({
  revalidateTagMock: vi.fn(),
  getServerEnvMock: vi.fn(),
  sentryCaptureMock: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidateTag: revalidateTagMock }));
vi.mock("@/utilities/env", () => ({ getServerEnv: getServerEnvMock }));
vi.mock("@sentry/nextjs", () => ({ captureException: sentryCaptureMock }));

import { POST } from "@/app/api/cache/projects/revalidate/route";

const SECRET = "s".repeat(64);
const UID_A = `0x${"a".repeat(64)}`;
const UID_B = `0x${"B".repeat(64)}`;

function sign(body: string, secret = SECRET, timestamp = Math.floor(Date.now() / 1000)) {
  const digest = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return `t=${timestamp},v1=${digest}`;
}

function makeRequest(body: string, signature: string | null = sign(body)): NextRequest {
  const headers = new Headers({ "content-type": "application/json" });
  if (signature !== null) headers.set("x-karma-signature", signature);
  return new Request("https://www.karmahq.org/api/cache/projects/revalidate", {
    method: "POST",
    headers,
    body,
  }) as unknown as NextRequest;
}

const notice = (...uids: string[]) => JSON.stringify({ projects: uids.map((uid) => ({ uid })) });

beforeEach(() => {
  vi.clearAllMocks();
  getServerEnvMock.mockReturnValue({ PROJECT_CACHE_REVALIDATION_SECRET: SECRET });
});

describe("POST /api/cache/projects/revalidate", () => {
  it("expires each project's tag immediately", async () => {
    const response = await POST(makeRequest(notice(UID_A, UID_B)));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, revalidated: 2 });
    expect(revalidateTagMock.mock.calls).toEqual([
      [`project:${UID_A}`, { expire: 0 }],
      [`project:${UID_B.toLowerCase()}`, { expire: 0 }],
    ]);
  });

  it("expires a project once when the notice repeats it in another case", async () => {
    await POST(makeRequest(notice(UID_A, UID_A.toUpperCase().replace("0X", "0x"))));

    expect(revalidateTagMock).toHaveBeenCalledTimes(1);
  });

  it("refuses every notice when no secret is configured", async () => {
    getServerEnvMock.mockReturnValue({ PROJECT_CACHE_REVALIDATION_SECRET: "" });

    const response = await POST(makeRequest(notice(UID_A)));

    expect(response.status).toBe(401);
    expect(revalidateTagMock).not.toHaveBeenCalled();
  });

  it("refuses an unsigned notice", async () => {
    const response = await POST(makeRequest(notice(UID_A), null));

    expect(response.status).toBe(401);
    expect(revalidateTagMock).not.toHaveBeenCalled();
  });

  it("refuses a notice signed with another secret", async () => {
    const body = notice(UID_A);

    const response = await POST(makeRequest(body, sign(body, "x".repeat(64))));

    expect(response.status).toBe(401);
    expect(revalidateTagMock).not.toHaveBeenCalled();
  });

  it("refuses a replayed notice signed long ago", async () => {
    const body = notice(UID_A);
    const anHourAgo = Math.floor(Date.now() / 1000) - 3600;

    const response = await POST(makeRequest(body, sign(body, SECRET, anHourAgo)));

    expect(response.status).toBe(401);
  });

  it("rejects a signed notice that is not a list of project uids", async () => {
    const body = JSON.stringify({ projects: [{ uid: "some-slug" }] });

    const response = await POST(makeRequest(body));

    expect(response.status).toBe(400);
    expect(revalidateTagMock).not.toHaveBeenCalled();
  });

  it("rejects a signed body that is not JSON", async () => {
    const response = await POST(makeRequest("not json"));

    expect(response.status).toBe(400);
  });

  it("rejects an oversized body before verifying it", async () => {
    const body = "x".repeat(17 * 1024);

    const response = await POST(makeRequest(body));

    expect(response.status).toBe(413);
    expect(revalidateTagMock).not.toHaveBeenCalled();
  });

  it("answers 500 so the indexer retries when revalidation fails", async () => {
    revalidateTagMock.mockImplementation(() => {
      throw new Error("cache unavailable");
    });

    const response = await POST(makeRequest(notice(UID_A)));

    expect(response.status).toBe(500);
    expect(sentryCaptureMock).toHaveBeenCalled();
  });
});
