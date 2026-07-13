import { describe, expect, it, vi } from "vitest";

// The `sanity` package eagerly imports Studio CSS that vitest can't load, and we
// only need the plain schema config object here — so stub the schema helpers to
// identity functions and read the config back directly.
vi.mock("sanity", () => ({
  defineType: (schema: unknown) => schema,
  defineField: (field: unknown) => field,
  defineArrayMember: (member: unknown) => member,
}));

import { post } from "@/sanity/schemas/post";

/**
 * Guards the "a post can't silently ship without a publish date" behavior.
 * The /blog index + sitemap only surface posts whose `publishedAt` is set and
 * in the past, so an editor who clicks Publish without a date would otherwise
 * get an invisible post (regression seen in Studio, 2026-07). The schema must
 * (a) default new posts to "now" and (b) make the date required so publish is
 * blocked when it is missing.
 */
type SchemaField = {
  name: string;
  initialValue?: () => unknown;
  validation?: (rule: unknown) => unknown;
};

function getField(name: string): SchemaField {
  const fields = (post as unknown as { fields: SchemaField[] }).fields;
  const field = fields.find((f) => f.name === name);
  if (!field) throw new Error(`field ${name} not found on post schema`);
  return field;
}

describe("post schema — publishedAt", () => {
  it("defaults new posts to a valid current ISO datetime", () => {
    const field = getField("publishedAt");
    expect(typeof field.initialValue).toBe("function");

    const value = field.initialValue?.();
    expect(typeof value).toBe("string");
    const parsed = new Date(value as string);
    expect(Number.isNaN(parsed.getTime())).toBe(false);
    // Default must be now-or-past so the post is immediately eligible for /blog.
    expect(parsed.getTime()).toBeLessThanOrEqual(Date.now() + 1000);
  });

  it("is required so a post can't be published without a date", () => {
    const field = getField("publishedAt");
    expect(typeof field.validation).toBe("function");

    const required = vi.fn().mockReturnValue("required-rule");
    const rule = { required } as unknown;
    const result = field.validation?.(rule);

    expect(required).toHaveBeenCalledTimes(1);
    expect(result).toBe("required-rule");
  });
});
