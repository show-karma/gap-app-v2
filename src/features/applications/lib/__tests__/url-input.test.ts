import { describe, expect, it } from "vitest";
import { buildUrlSchema } from "../schema-builders/text-schema";
import { INVALID_URL_MESSAGE, isValidWebUrl } from "../url-input";

describe("isValidWebUrl", () => {
  it.each(["https://zondax.ch", "http://www.zondax.ch/blog", "https://github.com/Zondax"])(
    "accepts %s",
    (value) => {
      expect(isValidWebUrl(value)).toBe(true);
    }
  );

  it.each([
    "zondax.ch",
    "www.zondax.ch",
    "htt://zondax.ch",
    "mailto:team@zondax.ch",
    "https://i dont care",
    "https://localhost",
    "https://zondax.",
  ])("rejects %s", (value) => {
    expect(isValidWebUrl(value)).toBe(false);
  });
});

describe("buildUrlSchema", () => {
  const question = { id: "website", type: "url", label: "Website", required: true } as const;

  it("explains that the link must start with https://", () => {
    const result = buildUrlSchema(question).safeParse("zondax.ch");
    expect(result.error?.issues[0]?.message).toBe(INVALID_URL_MESSAGE);
    expect(INVALID_URL_MESSAGE).toContain("https://");
  });

  it("keeps the value exactly as typed", () => {
    expect(buildUrlSchema(question).parse("https://zondax.ch/blog")).toBe("https://zondax.ch/blog");
  });

  it("accepts a link pasted with surrounding spaces", () => {
    expect(buildUrlSchema(question).safeParse(" https://zondax.ch ").success).toBe(true);
  });

  it("requires a value when the question is required", () => {
    const result = buildUrlSchema(question).safeParse("");
    expect(result.error?.issues[0]?.message).toBe("This field is required");
  });

  it("allows an empty value when the question is optional", () => {
    expect(buildUrlSchema({ ...question, required: false }).safeParse("").success).toBe(true);
  });
});
