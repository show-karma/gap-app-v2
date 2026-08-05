import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { TOUR_ANCHORS } from "../tour-anchors";
import { ALL_TOURS } from "../tours";

/**
 * Guards the contract between a tour and the UI it points at.
 *
 * A tour resolves its target by selector, and a selector that misses fails
 * silently — a spotlight over nothing, and no test failure. Nothing else in the
 * suite notices when an element carrying a `data-tour` attribute is renamed or
 * deleted, because no component test asserts on an attribute it doesn't use.
 *
 * So this walks the source and checks that every anchor a tour depends on is
 * still applied somewhere. It can't prove the element renders in the right
 * state — `run-tour` skipping a missing anchor at runtime covers that — but it
 * does turn "someone deleted the element" from a silent production regression
 * into a red build.
 */

const ROOT = resolve(__dirname, "../../../../..");
const SEARCH_DIRS = ["app", "components", "src"];
const SOURCE_EXTENSIONS = [".ts", ".tsx"];
const SKIP_DIRS = new Set(["node_modules", ".next", "__tests__", "__fixtures__"]);

/**
 * The onboarding lib declares the anchors and names them again in the tour
 * definitions, so counting references from inside it would make every anchor
 * trivially "placed" and the check could never fail. Only placements in the UI
 * count.
 */
const ANCHOR_SOURCE_DIR = join("src", "features", "onboarding", "lib");

function* sourceFiles(dir: string): Generator<string> {
  let entries: ReturnType<typeof readdirSync>;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    // SUPPRESSED: a search root that doesn't exist simply contributes nothing.
    return;
  }
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      yield* sourceFiles(path);
    } else if (SOURCE_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
      if (path.includes(ANCHOR_SOURCE_DIR)) continue;
      if (entry.name.includes(".test.") || entry.name.includes(".stories.")) continue;
      yield path;
    }
  }
}

function collectPlacedAnchors(): Set<string> {
  const placed = new Set<string>();
  const reference = /TOUR_ANCHORS\.(\w+)/g;
  for (const dir of SEARCH_DIRS) {
    for (const file of sourceFiles(join(ROOT, dir))) {
      const contents = readFileSync(file, "utf8");
      for (const match of contents.matchAll(reference)) {
        placed.add(match[1]);
      }
    }
  }
  return placed;
}

const ANCHOR_KEY_BY_VALUE = new Map(
  Object.entries(TOUR_ANCHORS).map(([key, value]) => [value as string, key])
);

describe("tour anchors are applied in the UI", () => {
  const placed = collectPlacedAnchors();

  it("finds anchor placements to check against", () => {
    // Guards the walker itself: a broken path or filter would make every
    // assertion below vacuously fail rather than silently pass.
    expect(placed.size).toBeGreaterThan(0);
  });

  for (const tour of ALL_TOURS) {
    for (const step of tour.steps) {
      const key = ANCHOR_KEY_BY_VALUE.get(step.anchor);
      it(`${tour.id} → ${step.anchor} is applied to an element`, () => {
        expect(key, `${step.anchor} is not a declared anchor`).toBeDefined();
        expect(placed.has(key as string)).toBe(true);
      });
    }
  }
});
