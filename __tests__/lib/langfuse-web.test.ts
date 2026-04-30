/**
 * @file Tests for the Langfuse Web client singleton.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const langfuseWebInstances: Array<{
  args: unknown;
  score: ReturnType<typeof vi.fn>;
}> = [];

vi.mock("langfuse", () => ({
  LangfuseWeb: class MockLangfuseWeb {
    args: unknown;
    score = vi.fn().mockResolvedValue(undefined);
    constructor(args: unknown) {
      this.args = args;
      langfuseWebInstances.push(this);
    }
  },
}));

describe("getLangfuseWeb", () => {
  beforeEach(() => {
    vi.resetModules();
    langfuseWebInstances.length = 0;
    delete process.env.NEXT_PUBLIC_LANGFUSE_PUBLIC_KEY;
    delete process.env.NEXT_PUBLIC_LANGFUSE_HOST;
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_LANGFUSE_PUBLIC_KEY;
    delete process.env.NEXT_PUBLIC_LANGFUSE_HOST;
  });

  it("should_return_null_when_public_key_is_missing", async () => {
    const { getLangfuseWeb } = await import("@/lib/langfuse-web");

    expect(getLangfuseWeb()).toBeNull();
    expect(langfuseWebInstances).toHaveLength(0);
  });

  it("should_construct_a_LangfuseWeb_with_env_credentials_when_keys_are_present", async () => {
    process.env.NEXT_PUBLIC_LANGFUSE_PUBLIC_KEY = "pk-test";
    process.env.NEXT_PUBLIC_LANGFUSE_HOST = "https://cloud.langfuse.test";

    const { getLangfuseWeb } = await import("@/lib/langfuse-web");

    const client = getLangfuseWeb();

    expect(client).not.toBeNull();
    expect(langfuseWebInstances).toHaveLength(1);
    expect(langfuseWebInstances[0].args).toMatchObject({
      publicKey: "pk-test",
      baseUrl: "https://cloud.langfuse.test",
    });
  });

  it("should_return_the_same_instance_on_repeated_calls", async () => {
    process.env.NEXT_PUBLIC_LANGFUSE_PUBLIC_KEY = "pk-test";

    const { getLangfuseWeb } = await import("@/lib/langfuse-web");

    const a = getLangfuseWeb();
    const b = getLangfuseWeb();

    expect(a).toBe(b);
    expect(langfuseWebInstances).toHaveLength(1);
  });
});
