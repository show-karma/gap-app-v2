/**
 * Program ids come in two shapes across the stack:
 *
 * - **base** — `"1013"`. What `program_registry` / `funding_program_configs`
 *   store, and what every program-scoped endpoint keys on.
 * - **composite** — `"1013_42161"`, i.e. `<programId>_<chainId>`. What grants
 *   carry (`grant.programId`) and what legacy bookmarked URLs contain.
 *
 * Anything used as a *lookup key* (`useProgram`, reviewer lists, track configs)
 * must be normalized to the base form first; anything forwarded to the backend
 * for **resolution** (e.g. the funding-application-by-project lookup) should
 * keep the composite form so the chain suffix stays available to disambiguate.
 */

/**
 * Strips the optional chain-id suffix from a program id.
 *
 * `"1013_42161"` -> `"1013"`, `"1013"` -> `"1013"`.
 */
export const normalizeProgramId = (id: string): string => {
  return id.includes("_") ? id.split("_")[0] : id;
};

/**
 * Null-safe {@link normalizeProgramId}.
 *
 * Returns `undefined` for missing, empty, or suffix-only (`"_42161"`) input so
 * callers can hand the result straight to an `enabled`-gated query without
 * accidentally firing a request for an empty id.
 */
export const parseProgramId = (id?: string | null): string | undefined => {
  if (!id) return undefined;
  const base = normalizeProgramId(id);
  return base || undefined;
};
