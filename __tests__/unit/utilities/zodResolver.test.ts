import { zodResolver as baseZodResolver } from "@hookform/resolvers/zod";
import type { FieldValues, Resolver, ResolverOptions } from "react-hook-form";
import { z } from "zod";
import "@testing-library/jest-dom";
import { zodResolver as wrappedZodResolver } from "@/utilities/zodResolver";

/**
 * Regression guard for the zod ↔ @hookform/resolvers version interaction.
 *
 * Under zod v4 + @hookform/resolvers v4.x, `zodResolver` re-threw `ZodError`
 * on validation failure instead of returning `{ values, errors }`. In the app
 * that surfaced as unhandled promise rejections (7 production Sentry issues),
 * because React Hook Form's `handleSubmit` promise rejected and nothing caught
 * it. Unit tests of individual forms missed it (they only covered happy paths).
 *
 * These tests pin the resolver contract for BOTH entry points the app uses:
 * the wrapper (`@/utilities/zodResolver`, for forms whose schema input ≠
 * output) and the raw resolver (`@hookform/resolvers/zod`, used everywhere
 * else). A future incompatible zod/resolver bump fails here, in one place,
 * instead of silently in production.
 */

// Mirrors the exact fields behind the production crashes:
// required string (name), number w/ custom message (chainID -> "Network is
// required"), max length (title), required date (dates.endsAt), coerced number.
const schema = z.object({
  name: z.string(),
  chainID: z.number({ error: "Network is required" }),
  title: z.string().max(50, { message: "Title must be less than 50 characters" }),
  dates: z.object({ endsAt: z.date({ error: "Date is required." }) }),
  priority: z.coerce.number().optional(),
});

// Minimal shape of what React Hook Form passes to a resolver.
const rhfOptions: ResolverOptions<FieldValues> = {
  fields: {},
  shouldUseNativeValidation: false,
};

type ResolverFactory = (schema: z.ZodType) => Resolver<FieldValues>;

const resolvers: Array<[string, ResolverFactory]> = [
  ["wrapper (@/utilities/zodResolver)", wrappedZodResolver],
  ["raw (@hookform/resolvers/zod)", baseZodResolver as unknown as ResolverFactory],
];

describe.each(resolvers)("zodResolver: %s", (_label, makeResolver) => {
  it("returns field errors instead of throwing on invalid input", async () => {
    const resolver = makeResolver(schema);

    // The production bug was the resolver *rejecting* here. It must resolve.
    const result = await resolver(
      { name: undefined, chainID: undefined, title: "x".repeat(60), dates: {} },
      undefined,
      rhfOptions
    );

    expect(result.errors.name?.message).toBeTruthy();
    expect(result.errors.chainID?.message).toBe("Network is required");
    expect(result.errors.title?.message).toBe("Title must be less than 50 characters");
    expect(result.errors.dates).toBeTruthy(); // nested error object is present
    expect(result.values).toEqual({});
  });

  it("returns coerced values and no errors on valid input", async () => {
    const resolver = makeResolver(schema);

    const result = await resolver(
      { name: "Acme", chainID: 10, title: "Hello", dates: { endsAt: new Date() }, priority: "3" },
      undefined,
      rhfOptions
    );

    expect(result.errors).toEqual({});
    expect(result.values).toMatchObject({ name: "Acme", chainID: 10, priority: 3 });
  });
});
