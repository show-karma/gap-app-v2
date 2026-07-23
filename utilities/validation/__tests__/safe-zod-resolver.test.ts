import type { ResolverOptions } from "react-hook-form";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { safeZodResolver } from "../safe-zod-resolver";
import { requiredString } from "../zod-primitives";

const schema = z.object({
  name: requiredString("Name", {
    min: 3,
    messages: { min: "This name is too short" },
  }),
  bio: z.string().optional(),
  nested: z.object({ handle: requiredString("Handle") }).optional(),
});

type FormValues = z.infer<typeof schema>;

const options: ResolverOptions<FormValues> = {
  fields: {},
  shouldUseNativeValidation: false,
};

describe("safeZodResolver", () => {
  it("returns parsed values and no errors for valid input", async () => {
    const resolver = safeZodResolver(schema);

    const result = await resolver({ name: "Alice", bio: "hi" }, undefined, options);

    expect(result.errors).toEqual({});
    expect(result.values).toEqual({ name: "Alice", bio: "hi" });
  });

  it("resolves with a field error instead of throwing when required input is empty (GAP-FRONTEND-21N)", async () => {
    const resolver = safeZodResolver(schema);

    // Previously the stock resolver let this ZodError escape as an unhandled
    // rejection; it must now RESOLVE with the field error.
    const result = await resolver({ name: "", bio: "" }, undefined, options);

    expect(result.values).toEqual({});
    expect(result.errors.name).toMatchObject({ message: "Name is required" });
  });

  it("reports the length message when the value is too short", async () => {
    const resolver = safeZodResolver(schema);

    const result = await resolver({ name: "ab", bio: "" }, undefined, options);

    expect(result.errors.name).toMatchObject({ message: "This name is too short" });
  });

  it("nests errors under their field path", async () => {
    const resolver = safeZodResolver(schema);

    const result = await resolver({ name: "Alice", nested: { handle: "" } }, undefined, options);

    expect(result.errors.nested?.handle).toMatchObject({
      message: "Handle is required",
    });
  });
});
