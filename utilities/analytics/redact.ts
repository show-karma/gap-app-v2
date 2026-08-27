/**
 * Last-line PII guard for outbound analytics properties.
 *
 * The typed catalog in `events.ts` is the primary defence — a property has to
 * be declared before it can be sent. This is the runtime backstop for the ways
 * that defence is bypassed in practice: a value that turns out to hold an email
 * at runtime, a merged-in property bag, or a catalog entry added without
 * thinking about what actually flows into it.
 *
 * Dropping is deliberately silent in the browser: a warning would fire on every
 * page load of a build that has the problem and tell the user nothing. Tests
 * turn the guard strict instead (see `__setStrictAnalyticsForTests` in
 * `client.ts`), so a regression fails a suite rather than quietly shipping.
 */

/** Property names that are PII by construction, whatever they happen to hold. */
const SENSITIVE_KEY = /email|wallet|address|phone|token|secret/i;

/** An email anywhere inside the value, not only as the whole value. */
const EMAIL_VALUE = /[^\s@]+@[^\s@]+\.[a-z]{2,}/i;

const EVM_ADDRESS_VALUE = /^0x[0-9a-fA-F]{40}$/;

export interface RedactionResult {
  safe: Record<string, unknown>;
  /** Names of the properties that were withheld, for the strict-mode error. */
  dropped: string[];
}

/**
 * Only strings are inspected. Numbers, booleans and null cannot carry an
 * identifier in a shape this guard could recognise, and treating them as
 * suspect would drop real metrics (`total_usd`, `chain_id`).
 */
const isSensitiveValue = (value: unknown): boolean =>
  typeof value === "string" && (EMAIL_VALUE.test(value) || EVM_ADDRESS_VALUE.test(value));

/**
 * An array whose *name* is safe keeps its shape: only the offending elements
 * go. `fields_changed: ["title", "walletAddress"]` is a list of form field
 * names, not of wallets — dropping the whole array over one element would
 * silently empty a property the product relies on.
 */
const redactArray = (values: readonly unknown[]): unknown[] =>
  values.filter((value) => !isSensitiveValue(value));

export const redactSensitiveProps = (props: Record<string, unknown>): RedactionResult => {
  const safe: Record<string, unknown> = {};
  const dropped: string[] = [];

  for (const [key, value] of Object.entries(props)) {
    if (SENSITIVE_KEY.test(key)) {
      dropped.push(key);
      continue;
    }

    if (Array.isArray(value)) {
      const kept = redactArray(value);
      if (kept.length !== value.length) dropped.push(key);
      safe[key] = kept;
      continue;
    }

    if (isSensitiveValue(value)) {
      dropped.push(key);
      continue;
    }

    safe[key] = value;
  }

  return { safe, dropped };
};
