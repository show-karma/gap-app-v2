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
 * get an invisible post (regression seen in Studio, 2026-07). The schema makes
 * the date required so publish is blocked when it is missing.
 *
 * It must NOT auto-populate `publishedAt` (no initialValue): the slug locks as
 * soon as publishedAt is set (`slug.readOnly`), so auto-filling the date on a
 * brand-new document would lock the required slug field before the editor could
 * ever set it — a publish-blocking catch-22. Both invariants are asserted here.
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
  it("does not auto-populate, so the slug stays editable on a new post", () => {
    // slug.readOnly locks on `!!document.publishedAt`; an initialValue here
    // would lock the required slug before it could be set (publish catch-22).
    const field = getField("publishedAt");
    expect(field.initialValue).toBeUndefined();
  });

  it("requires the cover image to have an uploaded asset, not just alt text", () => {
    const cover = getField("coverImage") as SchemaField & {
      validation?: (rule: unknown) => unknown;
    };
    const required = vi.fn().mockReturnThis();
    const assetRequired = vi.fn().mockReturnThis();
    const rule = { required, assetRequired } as unknown;
    cover.validation?.(rule);
    expect(required).toHaveBeenCalled();
    expect(assetRequired).toHaveBeenCalled();
  });

  it("locks the slug once a publish date is set", () => {
    const slug = getField("slug") as SchemaField & {
      readOnly?: (ctx: { document?: Record<string, unknown> }) => boolean;
    };
    expect(typeof slug.readOnly).toBe("function");
    // Editable while unset, locked once a date exists (URL stability after go-live).
    expect(slug.readOnly?.({ document: {} })).toBeFalsy();
    expect(slug.readOnly?.({ document: { publishedAt: "2026-07-13T00:00:00Z" } })).toBe(true);
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
