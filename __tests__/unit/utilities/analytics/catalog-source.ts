import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The property names each catalog event declares, read out of the catalog's own
 * source.
 *
 * Read from the text rather than from the types because the check this feeds is
 * about the DOC: a tracking plan whose Properties column has drifted from the
 * catalog is worse than one with no column at all, because it reads as an
 * answer. TypeScript already guarantees the emit sites match the types; nothing
 * guaranteed the prose did.
 */

const CATALOG_PATH = join(process.cwd(), "utilities/analytics/events.ts");

/** Properties every `_failed` leg carries, via `FailureProps`. */
const FAILURE_PROPS = ["error_code"];

const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

/** The body of `AnalyticsEventMap`, comments removed. */
const catalogBody = (): string => {
  const source = readFileSync(CATALOG_PATH, "utf-8");
  const start = source.indexOf("export interface AnalyticsEventMap");
  const end = source.indexOf("export type AnalyticsEventName");
  if (start === -1 || end === -1) throw new Error("AnalyticsEventMap not found in the catalog");
  return stripComments(source.slice(start, end));
};

/**
 * Consumes one event's type expression, starting at `from`, and returns it with
 * the index just past it.
 *
 * Brace-counted rather than line-based: most entries are one line, several span
 * a dozen, and an intersection (`FailureProps & { … }`) is both.
 */
const readTypeExpression = (body: string, from: number): { text: string; next: number } => {
  let depth = 0;
  let index = from;

  while (index < body.length) {
    const char = body[index];
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (char === ";" && depth === 0) break;
    index += 1;
  }

  return { text: body.slice(from, index), next: index + 1 };
};

/** Top-level property names inside a type expression, in declaration order. */
const propertyNames = (typeExpression: string): string[] => {
  const names: string[] = [];
  let depth = 0;

  for (let index = 0; index < typeExpression.length; index += 1) {
    const char = typeExpression[index];
    if (char === "{") {
      depth += 1;
      continue;
    }
    if (char === "}") {
      depth -= 1;
      continue;
    }
    // Only the outermost object's own keys. A nested `{ … }` in a property's
    // type is that property's shape, not another property of the event.
    if (depth !== 1) continue;

    const rest = typeExpression.slice(index);
    const match = /^([a-z_][a-z0-9_]*)\s*:/.exec(rest);
    if (match) {
      names.push(match[1]);
      index += match[0].length - 1;
    }
  }

  if (typeExpression.includes("FailureProps")) names.unshift(...FAILURE_PROPS);
  return names;
};

/** Every catalog event, mapped to the property names it declares. */
export const catalogEventProperties = (): Map<string, string[]> => {
  const body = catalogBody();
  const events = new Map<string, string[]>();
  const entry = /^ {2}([a-z][a-z0-9_]*):\s*/gm;

  let match = entry.exec(body);
  while (match !== null) {
    const { text, next } = readTypeExpression(body, match.index + match[0].length);
    events.set(match[1], propertyNames(text));
    entry.lastIndex = next;
    match = entry.exec(body);
  }

  return events;
};
