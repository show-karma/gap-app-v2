import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/client-error/route";

const post = (body: string) =>
  POST(new Request("http://localhost/api/client-error", { method: "POST", body }));

describe("POST /api/client-error", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs the payload to the server console and returns 204", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const res = await post(
      JSON.stringify({ errorMessage: "boom", error: { message: "rpc error" } })
    );
    expect(res.status).toBe(204);
    expect(spy).toHaveBeenCalledWith(
      "[client-error]",
      JSON.stringify({ errorMessage: "boom", error: { message: "rpc error" } })
    );
  });

  it("rejects malformed JSON with 400", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const res = await post("{not json");
    expect(res.status).toBe(400);
  });

  it("rejects oversized bodies with 413", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const res = await post(JSON.stringify({ stack: "x".repeat(9_000) }));
    expect(res.status).toBe(413);
    expect(spy).not.toHaveBeenCalled();
  });
});
