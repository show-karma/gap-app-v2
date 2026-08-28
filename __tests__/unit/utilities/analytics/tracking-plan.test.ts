/**
 * @file The catalog and the tracking plan have to stay in step.
 *
 * A catalog entry with no row in the plan is an event nobody can interpret: the
 * name reaches Mixpanel, someone builds a report on it, and what it actually
 * measures lives only in whichever hook happens to emit it. A row with no
 * catalog entry is the opposite — a documented event that no longer fires, which
 * is worse, because a board built on it silently reads zero.
 *
 * So this asserts both directions.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ANALYTICS_EVENT_NAMES } from "@/utilities/analytics/events";
import { catalogEventProperties } from "./catalog-source";

const PLAN_PATH = join(process.cwd(), "docs/analytics/tracking-plan.md");

const plan = readFileSync(PLAN_PATH, "utf-8");
const lines = plan.split(/\r?\n/);

/**
 * Event names as the plan's event tables cite them.
 *
 * Cells are normalised before matching, because a markdown formatter pads table
 * columns to align them — a parser that assumed single spaces would pass on the
 * file as written and fail the moment anyone ran one.
 *
 * Scoped to tables under the event header rather than to every table: the plan
 * also has a super-properties table, a profile table and a page-view table
 * whose first column is a backticked snake_case name too, and counting those
 * would let an undocumented event pass because a property happened to share its
 * name.
 */
const EVENT_TABLE_HEADER = "Event | Fires when | Properties | Board";
const PROPERTIES_COLUMN = 2;
const EVENT_NAME = /^`([a-z][a-z0-9_]*)`$/;

const isTableRow = (line: string): boolean => line.trimStart().startsWith("|");

/** `|  a  |  b  |` -> `['a', 'b']`, so padding cannot change what a row says. */
const normaliseRow = (line: string): string[] =>
  line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());

/** Each documented event, mapped to the row that documents it. */
const documentedRows = (): Map<string, string[]> => {
  const rows = new Map<string, string[]>();
  let inEventTable = false;

  for (const line of lines) {
    if (!isTableRow(line)) {
      inEventTable = false;
      continue;
    }

    const cells = normaliseRow(line);
    if (cells.join(" | ") === EVENT_TABLE_HEADER) {
      inEventTable = true;
      continue;
    }
    if (!inEventTable) continue;

    const match = EVENT_NAME.exec(cells[0] ?? "");
    if (match) rows.set(match[1], cells);
  }

  return rows;
};

/**
 * The property names a row claims. An em dash means "none", which is how the
 * plan writes an event that carries no properties at all.
 */
const documentedProperties = (cells: string[]): string[] => {
  const cell = cells[PROPERTIES_COLUMN] ?? "";
  if (cell === "" || cell === "—" || cell === "-") return [];
  return [...cell.matchAll(/`([a-z_][a-z0-9_]*)`/g)].map((match) => match[1]);
};

describe("tracking plan", () => {
  const rows = documentedRows();
  const documented = new Set(rows.keys());
  const catalog = catalogEventProperties();

  it("found the plan's event tables", () => {
    // A path typo or a reformat that broke the tables would otherwise make
    // every assertion below vacuous.
    expect(documented.size).toBeGreaterThan(50);
  });

  it.each(ANALYTICS_EVENT_NAMES.map((name) => [name]))("documents %s", (name) => {
    expect(documented).toContain(name);
  });

  it("documents no event that is not in the catalog", () => {
    // A documented event that no longer fires is worse than an undocumented
    // one: a board built on it reads zero and nobody notices.
    const names = new Set<string>(ANALYTICS_EVENT_NAMES);
    const extra = [...documented].filter((name) => !names.has(name));

    expect(extra).toEqual([]);
  });

  it("read the catalog's own property names", () => {
    // The source parser below is the load-bearing part of the next assertion;
    // if it silently found nothing, every property check would pass vacuously.
    expect(catalog.size).toBe(ANALYTICS_EVENT_NAMES.length);
    expect(catalog.get("login_started")).toEqual(["entry_point"]);
    expect(catalog.get("project_create_failed")).toEqual(["error_code", "chain_id"]);
  });

  it.each(ANALYTICS_EVENT_NAMES.map((name) => [name]))(
    "lists the real properties of %s",
    (name) => {
      // A Properties column that has drifted from the catalog is worse than no
      // column at all, because it reads as an answer. Nothing but this keeps
      // the prose honest — TypeScript only checks the emit sites.
      const cells = rows.get(name);
      if (!cells) throw new Error(`${name} has no row`);

      expect([...documentedProperties(cells)].sort()).toEqual(
        [...(catalog.get(name) ?? [])].sort()
      );
    }
  );

  it("names the server-side plan, so the two halves are findable from each other", () => {
    expect(plan).toContain("gap-indexer/docs/analytics/server-events.md");
  });

  it("records the identity-merge check as unverified", () => {
    // R1: the project's ID Merge mode could not be checked without dashboard
    // access, and the reset-on-logout behaviour is only correct under
    // Simplified. If someone verifies it, this assertion is the reminder to
    // update the plan rather than leave a stale UNVERIFIED sitting in it.
    expect(plan).toContain("UNVERIFIED");
    expect(plan).toContain("Identity Merge");
  });
});
