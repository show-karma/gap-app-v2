import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guardrail against re-introducing a site-wide Speakable JSON-LD block.
 *
 * `SpeakableJsonLd` used to be mounted in the root layout, so every non-whitelabel
 * page advertised a WebPage/SpeakableSpecification schema. Google restricts
 * Speakable to eligible news content; Karma publishes none, so the markup was
 * inapplicable on every route it shipped on.
 *
 * Speakable may legitimately return one day, but only scoped to an individual
 * eligible article — never mounted globally. This test enforces both halves:
 * the root layout mounts nothing Speakable, and no source file emits the schema.
 */

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const SCANNED_DIRS = ["app", "components", "src"];
const SCANNED_EXTENSIONS = [".ts", ".tsx"];
const IGNORED_DIRS = new Set(["node_modules", ".next", "__tests__"]);

function collectSourceFiles(dir: string, collected: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || IGNORED_DIRS.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectSourceFiles(fullPath, collected);
    } else if (SCANNED_EXTENSIONS.includes(path.extname(entry.name))) {
      collected.push(fullPath);
    }
  }
  return collected;
}

describe("no global Speakable JSON-LD", () => {
  it("root layout does not mount a Speakable schema", () => {
    const layout = readFileSync(
      path.join(REPO_ROOT, "app/t/[tenant]/(chrome)/layout.tsx"),
      "utf-8"
    );
    expect(layout).not.toMatch(/speakable/i);
  });

  it("no source file emits a SpeakableSpecification schema", () => {
    const offenders = SCANNED_DIRS.flatMap((dir) =>
      collectSourceFiles(path.join(REPO_ROOT, dir))
    ).filter((file) => /SpeakableSpecification/.test(readFileSync(file, "utf-8")));

    expect(offenders.map((file) => path.relative(REPO_ROOT, file))).toEqual([]);
  });
});
