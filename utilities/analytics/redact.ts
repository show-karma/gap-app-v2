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

interface RedactionResult {
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

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Mixpanel flattens nested objects into `parent.child` columns, so a nested bag
 * is just as reportable — and just as leaky — as a top-level one. It is scanned
 * with the same rules.
 *
 * Exactly one level deep. Anything deeper is dropped outright rather than
 * walked: an unbounded walk over an arbitrary object is a way to spend a page's
 * frame budget on analytics, and a property bag nested three deep is not
 * something the catalog should be sending in the first place.
 */
const redactNested = (
  entries: Record<string, unknown>
): { safe: Record<string, unknown>; changed: boolean } => {
  const safe: Record<string, unknown> = {};
  let changed = false;

  for (const [key, value] of Object.entries(entries)) {
    if (SENSITIVE_KEY.test(key) || isSensitiveValue(value)) {
      changed = true;
      continue;
    }
    if (isPlainObject(value) || Array.isArray(value)) {
      // Second level of containers: too deep to inspect, so it goes.
      changed = true;
      continue;
    }
    safe[key] = value;
  }

  return { safe, changed };
};

/**
 * An array whose *name* is safe keeps its shape: only the offending elements
 * go. `fields_changed: ["title", "walletAddress"]` is a list of form field
 * names, not of wallets — dropping the whole array over one element would
 * silently empty a property the product relies on.
 */
const redactArray = (values: readonly unknown[]): { safe: unknown[]; changed: boolean } => {
  const safe: unknown[] = [];
  let changed = false;

  for (const value of values) {
    if (isSensitiveValue(value)) {
      changed = true;
      continue;
    }
    if (isPlainObject(value)) {
      const nested = redactNested(value);
      if (nested.changed) changed = true;
      safe.push(nested.safe);
      continue;
    }
    if (Array.isArray(value)) {
      // An array of arrays is past the one level this guard will vouch for.
      changed = true;
      continue;
    }
    safe.push(value);
  }

  return { safe, changed };
};

export const redactSensitiveProps = (props: Record<string, unknown>): RedactionResult => {
  const safe: Record<string, unknown> = {};
  const dropped: string[] = [];

  for (const [key, value] of Object.entries(props)) {
    if (SENSITIVE_KEY.test(key)) {
      dropped.push(key);
      continue;
    }

    if (Array.isArray(value)) {
      const { safe: kept, changed } = redactArray(value);
      if (changed) dropped.push(key);
      safe[key] = kept;
      continue;
    }

    if (isPlainObject(value)) {
      const { safe: kept, changed } = redactNested(value);
      if (changed) dropped.push(key);
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
