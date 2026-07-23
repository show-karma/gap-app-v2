/**
 * Static-scan accessibility guardrails (issues #1309, #1374, #1238).
 *
 * These lock in fixes that are easiest to enforce at the source level so the
 * class of regression cannot silently return:
 *   - #1309: required top-level routes must render a single <main> landmark.
 *   - #1374: every <SelectTrigger in the Control Center FilterToolbar must
 *            carry an aria-label/aria-labelledby (the trigger renders an
 *            unlabeled combobox button otherwise).
 *   - #1238: TokenSelector must not derive its id from Math.random (breaks the
 *            label/select association and SSR hydration); it must use useId.
 *   - #1516: the milestone <fieldset>'s <legend> must be its direct first child
 *            so it acts as the group's accessible name (a legend nested inside a
 *            wrapper div is treated as a generic element and labels nothing).
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");

function read(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

function countMainLandmarks(source: string): number {
  // Counts opening <main ...> tags and role="main" usages.
  const mainTags = source.match(/<main[\s/>]/g)?.length ?? 0;
  const roleMain = source.match(/role=["']main["']/g)?.length ?? 0;
  return mainTags + roleMain;
}

describe("landmark regions (#1309)", () => {
  const routesWithOwnMain = [
    "app/projects/page.tsx",
    // The dashboard's <main> lives in the layout so it wraps both the overview
    // (/dashboard) and each drill-in segment (/dashboard/[module]).
    "app/dashboard/layout.tsx",
    "app/donations/layout.tsx",
    "app/community/[communityId]/(with-header)/layout.tsx",
    "app/community/[communityId]/donate/page.tsx",
    "app/community/[communityId]/donate/[programId]/page.tsx",
  ];

  it.each(routesWithOwnMain)("%s renders exactly one <main> landmark", (route) => {
    const source = read(route);
    expect(countMainLandmarks(source)).toBe(1);
  });
});

describe("filter select labels (#1374)", () => {
  it("every SelectTrigger in FilterToolbar carries an accessible label", () => {
    const source = read("components/Pages/Admin/ControlCenter/FilterToolbar.tsx");

    // Split on the opening tag so each fragment starts at a trigger; the first
    // fragment is the preamble before any trigger and is dropped.
    const fragments = source.split("<SelectTrigger").slice(1);
    expect(fragments.length).toBeGreaterThanOrEqual(5);

    for (const fragment of fragments) {
      const triggerProps = fragment.slice(0, fragment.indexOf(">"));
      expect(
        /aria-label[=\s]|aria-labelledby[=\s]/.test(triggerProps),
        `A <SelectTrigger is missing aria-label/aria-labelledby: ${triggerProps.trim().slice(0, 80)}`
      ).toBe(true);
    }
  });
});

describe("milestone fieldset legend (#1516)", () => {
  it("legend is the direct first child of the fieldset so it names the group", () => {
    const source = read("src/features/applications/components/MilestoneFieldArray.tsx");

    // Grab the opening <fieldset ...> tag and the first non-whitespace tag that
    // follows it. That tag must be <legend; anything else (e.g. a wrapper
    // <div) demotes the legend to a generic element with no labelling role.
    const fieldsetMatch = source.match(/<fieldset[^>]*>\s*</);
    expect(fieldsetMatch, "no <fieldset> found").not.toBeNull();

    const afterFieldset = source.slice(
      (fieldsetMatch?.index ?? 0) + (fieldsetMatch?.[0]?.length ?? 0) - 1
    );
    expect(afterFieldset.trimStart().startsWith("<legend")).toBe(true);
  });
});

describe("stable form ids (#1238)", () => {
  it("TokenSelector uses useId, never Math.random, for the select id", () => {
    const source = read("components/Donation/TokenSelector.tsx");
    expect(source).toMatch(/useId\(\)/);
    expect(source).not.toMatch(/Math\.random/);
    // The deprecated String.prototype.substr must also be gone.
    expect(source).not.toMatch(/\.substr\(/);
  });
});
