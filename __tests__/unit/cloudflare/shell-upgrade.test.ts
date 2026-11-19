/**
 * @vitest-environment node
 */
import {
  isFallbackShellResponse,
  messageGroupId,
  queueShellUpgrade,
  type RevalidationMessage,
  type RevalidationQueueNamespace,
  shellUpgradeMessage,
} from "../../../cloudflare/shell-upgrade";

// Without this, a project or community page that was not generated at build is
// rendered in full on every request on the Worker (cloudflare/shell-upgrade.ts).

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 10, 19, 12);

function page(headers: Record<string, string>, status = 200) {
  return new Response("<html></html>", { status, headers });
}
const SHELL = { "x-nextjs-postponed": "1" };

function fakeQueue() {
  const sent: { shard: string; message: RevalidationMessage }[] = [];
  const revalidate = vi.fn(async (_message: RevalidationMessage) => undefined);
  const queue: RevalidationQueueNamespace & { sent: typeof sent; revalidate: typeof revalidate } = {
    sent,
    revalidate,
    idFromName: (name: string) => name,
    get: (id: never) => ({
      revalidate: async (message: RevalidationMessage) => {
        sent.push({ shard: id as unknown as string, message });
        return revalidate(message);
      },
    }),
  };
  return queue;
}

describe("isFallbackShellResponse", () => {
  const request = (init: RequestInit = {}) => new Request("https://app.test/project/gitcoin", init);

  it("is true for a postponed page that did not come from the cache", () => {
    expect(isFallbackShellResponse(request(), page(SHELL))).toBe(true);
  });

  it.each([
    ["a cache hit", page({ ...SHELL, "x-nextjs-cache": "HIT" })],
    ["a stored render", page({ "x-nextjs-cache": "MISS" })],
    ["a page that is not postponed", page({})],
    ["a 404", page(SHELL, 404)],
  ])("is false for %s", (_label, response) => {
    expect(isFallbackShellResponse(request(), response)).toBe(false);
  });

  it("is false for the queue's own revalidation request", () => {
    const revalidation = request({ headers: { "x-prerender-revalidate": "id" } });
    expect(isFallbackShellResponse(revalidation, page(SHELL))).toBe(false);
  });

  it("is false for client navigations and non-GET requests", () => {
    expect(isFallbackShellResponse(request({ headers: { rsc: "1" } }), page(SHELL))).toBe(false);
    expect(isFallbackShellResponse(request({ method: "POST" }), page(SHELL))).toBe(false);
  });
});

describe("messageGroupId", () => {
  // Values from OpenNext's own generateMessageGroupId, so both land on one queue shard.
  it.each([
    ["/project/gitcoin", "revalidate-8"],
    ["/community/optimism", "revalidate-9"],
    ["/t/karma/project/gitcoin", "revalidate-1"],
    ["/", "revalidate-6"],
  ])("matches OpenNext for %s", (path, shard) => {
    expect(messageGroupId(path)).toBe(shard);
  });
});

describe("shellUpgradeMessage", () => {
  it("asks for the internal path on the request's host", () => {
    const message = shellUpgradeMessage(
      { host: "app.test", path: "/t/karma/project/gitcoin" },
      0,
      T0
    );
    expect(message).toEqual({
      MessageBody: { host: "app.test", url: "/t/karma/project/gitcoin", lastModified: T0 - DAY },
      MessageDeduplicationId: "shell-upgrade:app.test/t/karma/project/gitcoin",
      MessageGroupId: "revalidate-1",
    });
  });

  it("renders again after a new deployment, even within a day", () => {
    const deployedAt = T0 - 60_000;
    const message = shellUpgradeMessage(
      { host: "app.test", path: "/t/karma/project/gitcoin" },
      deployedAt,
      T0
    );
    expect(message.MessageBody.lastModified).toBe(deployedAt);
  });
});

describe("queueShellUpgrade", () => {
  it("sends the URL to its queue shard", async () => {
    const queue = fakeQueue();
    await queueShellUpgrade(
      { host: "a.test", path: "/community/optimism" },
      {
        queue,
        deployedAt: 0,
        now: () => T0,
      }
    );
    expect(queue.sent).toHaveLength(1);
    expect(queue.sent[0].shard).toBe("revalidate-9");
    expect(queue.sent[0].message.MessageBody.url).toBe("/community/optimism");
  });

  it("does not queue the same URL twice within ten minutes", async () => {
    const queue = fakeQueue();
    const url = { host: "b.test", path: "/project/gitcoin" };
    await queueShellUpgrade(url, { queue, deployedAt: 0, now: () => T0 });
    await queueShellUpgrade(url, { queue, deployedAt: 0, now: () => T0 + 300_000 });
    await queueShellUpgrade(url, { queue, deployedAt: 0, now: () => T0 + 601_000 });
    expect(queue.sent).toHaveLength(2);
  });

  it("reports a queue failure and lets the next request try again", async () => {
    const queue = fakeQueue();
    queue.revalidate.mockRejectedValueOnce(new Error("DO down"));
    const onError = vi.fn();
    const url = { host: "c.test", path: "/project/gitcoin" };
    await queueShellUpgrade(url, { queue, deployedAt: 0, onError, now: () => T0 });
    await queueShellUpgrade(url, { queue, deployedAt: 0, onError, now: () => T0 + 1000 });
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: "DO down" }));
    expect(queue.revalidate).toHaveBeenCalledTimes(2);
  });
});
