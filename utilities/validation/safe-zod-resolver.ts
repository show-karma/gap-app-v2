import type { FieldError, FieldErrors, FieldValues, Resolver } from "react-hook-form";
import type { z } from "zod";

/**
 * A react-hook-form resolver built on Zod's `safeParse`.
 *
 * The stock `@hookform/resolvers/zod` resolver recovers validation errors with
 * `error instanceof $ZodError`. When the bundle ships more than one physical
 * copy of `zod/v4/core` (turbopack does here — there are three zod copies in
 * the tree), the thrown `$ZodError` is not an instance of the copy the resolver
 * imported, so it re-throws: the ZodError escapes as an unhandled promise
 * rejection (GAP-FRONTEND-21N) AND the field errors never reach the form.
 *
 * `safeParse` never throws — it returns `{ success, error }` — and we map
 * `error.issues` structurally (no `instanceof`), so this is immune to the
 * duplicate-copy problem regardless of how the bundler dedupes zod. First error
 * per field wins, matching react-hook-form's default `criteriaMode: "firstError"`.
 */
export function safeZodResolver<TInput extends FieldValues>(
  schema: z.ZodType<TInput>
): Resolver<TInput> {
  return async (values) => {
    const result = schema.safeParse(values);

    if (result.success) {
      return { values: result.data, errors: {} };
    }

    const errors: FieldErrors<TInput> = {};

    for (const issue of result.error.issues) {
      const { path } = issue;
      const depth = path.length;
      if (depth === 0) continue;

      let node = errors as Record<string, unknown>;
      for (let i = 0; i < depth - 1; i += 1) {
        const key = String(path[i]);
        if (typeof node[key] !== "object" || node[key] === null) {
          node[key] = {};
        }
        node = node[key] as Record<string, unknown>;
      }

      const leaf = String(path[depth - 1]);
      if (node[leaf] === undefined) {
        const fieldError: FieldError = {
          type: String(issue.code),
          message: issue.message,
        };
        node[leaf] = fieldError;
      }
    }

    return { values: {}, errors };
  };
}
