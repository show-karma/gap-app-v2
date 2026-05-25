import { zodResolver as baseZodResolver } from "@hookform/resolvers/zod";
import type { FieldValues, Resolver } from "react-hook-form";
import type { z } from "zod";

/**
 * Thin wrapper around `@hookform/resolvers` v5's `zodResolver`.
 *
 * v5 types the resolver as `Resolver<Input, Context, Output>`, splitting a Zod
 * schema's input and output types. For schemas that use coercion, transforms,
 * defaults, or conditional/union schemas (where input ≠ output, or the schema is
 * chosen at runtime) this makes the resolver incompatible with
 * `useForm<z.infer<typeof schema>>` — which is how our forms are typed.
 *
 * This wrapper restores the pre-v5 behaviour: the resolver's field-values type is
 * driven by the `useForm<T>` it is assigned to (inferred from call context) rather
 * than re-derived from the schema. Runtime behaviour is identical to the upstream
 * resolver.
 */
export function zodResolver<TFieldValues extends FieldValues = FieldValues>(
  schema: z.ZodType,
  ...options: unknown[]
): Resolver<TFieldValues> {
  return (
    baseZodResolver as unknown as (
      schema: z.ZodType,
      ...options: unknown[]
    ) => Resolver<TFieldValues>
  )(schema, ...options);
}
