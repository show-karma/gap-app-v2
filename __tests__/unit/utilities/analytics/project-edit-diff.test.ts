/**
 * @file Tests for the `project_edited` field diff
 * (utilities/analytics/project-edit-diff.ts).
 *
 * The defect this replaces: the emit sent `Object.keys({...newProjectInfo,
 * ...socialData})` — the form's own key set, the same 21 names on every submit
 * including the ones that changed nothing. `fields_changed` is supposed to
 * answer "what do people edit?"; that answered "what does the form contain?".
 */

import type { Project } from "@show-karma/karma-gap-sdk";
import {
  changedProjectFields,
  currentProjectEditValues,
  type ProjectEditValues,
} from "@/utilities/analytics/project-edit-diff";

const projectWith = (details: Record<string, unknown>): Project =>
  ({ uid: "0xproject", details }) as unknown as Project;

const STORED = {
  title: "Karma GAP",
  description: "On-chain grant accountability",
  problem: "Grants are unaccountable",
  solution: "Attest to them",
  missionSummary: "",
  locationOfImpact: "Global",
  imageURL: "https://example.test/logo.png",
  businessModel: "nonprofit",
  stageIn: "growth",
  raisedMoney: "1000000",
  pathToTake: "scale",
  tags: [{ name: "public-goods" }, { name: "grants" }],
  links: [
    { type: "twitter", url: "https://x.test/karma" },
    { type: "github", url: "https://github.test/karma" },
    { type: "custom", name: "Docs", url: "https://docs.test" },
  ],
};

/** What the form submits when the user changed nothing. */
const unchangedSubmission = (): ProjectEditValues => ({
  title: STORED.title,
  description: STORED.description,
  problem: STORED.problem,
  solution: STORED.solution,
  missionSummary: undefined,
  locationOfImpact: STORED.locationOfImpact,
  tags: [{ name: "public-goods" }, { name: "grants" }],
  businessModel: STORED.businessModel,
  stageIn: STORED.stageIn,
  raisedMoney: STORED.raisedMoney,
  pathToTake: STORED.pathToTake,
  imageURL: STORED.imageURL,
  twitter: "https://x.test/karma",
  github: "https://github.test/karma",
  discord: "",
  linkedin: "",
  website: "",
  pitchDeck: "",
  demoVideo: "",
  farcaster: "",
  customLinks: [{ name: "Docs", url: "https://docs.test" }],
});

describe("currentProjectEditValues", () => {
  it("reads the detail fields the form owns", () => {
    const values = currentProjectEditValues(projectWith(STORED));

    expect(values).toMatchObject({
      title: "Karma GAP",
      problem: "Grants are unaccountable",
      businessModel: "nonprofit",
      imageURL: "https://example.test/logo.png",
    });
  });

  it("flattens the links array back into the form's per-platform fields", () => {
    const values = currentProjectEditValues(projectWith(STORED));

    expect(values.twitter).toBe("https://x.test/karma");
    expect(values.github).toBe("https://github.test/karma");
    // A platform with no stored link reads as empty, not as missing.
    expect(values.discord).toBe("");
  });

  it("keeps custom links apart from the platform ones", () => {
    const values = currentProjectEditValues(projectWith(STORED));

    expect(values.customLinks).toEqual([{ name: "Docs", url: "https://docs.test" }]);
  });

  it("survives a project with no details at all", () => {
    const values = currentProjectEditValues({ uid: "0xproject" } as unknown as Project);

    expect(values.title).toBeUndefined();
    expect(values.customLinks).toEqual([]);
  });
});

describe("changedProjectFields", () => {
  const previous = () => currentProjectEditValues(projectWith(STORED));

  it("reports nothing when the user changed nothing", () => {
    expect(changedProjectFields(previous(), unchangedSubmission())).toEqual([]);
  });

  it("names only the field that changed", () => {
    expect(
      changedProjectFields(previous(), { ...unchangedSubmission(), title: "Karma GAP v2" })
    ).toEqual(["title"]);
  });

  it("names several fields when several changed", () => {
    const changed = changedProjectFields(previous(), {
      ...unchangedSubmission(),
      title: "Karma GAP v2",
      problem: "A different problem",
      twitter: "https://x.test/karmahq",
    });

    expect(changed.sort()).toEqual(["problem", "title", "twitter"]);
  });

  it("treats an added tag as a change and a reordered one as not", () => {
    expect(
      changedProjectFields(previous(), {
        ...unchangedSubmission(),
        tags: [{ name: "grants" }, { name: "public-goods" }],
      })
    ).toEqual([]);

    expect(
      changedProjectFields(previous(), {
        ...unchangedSubmission(),
        tags: [{ name: "public-goods" }, { name: "grants" }, { name: "ethereum" }],
      })
    ).toEqual(["tags"]);
  });

  it("does not report clearing a field that was already empty", () => {
    // `missionSummary` has never been set. An empty submission is not an edit,
    // and without this every project that never filled it in would report it as
    // changed on every save.
    const changed = changedProjectFields(previous(), {
      ...unchangedSubmission(),
      missionSummary: "",
    });

    expect(changed).toEqual([]);
  });

  it("reports filling in a field that was empty", () => {
    expect(
      changedProjectFields(previous(), {
        ...unchangedSubmission(),
        missionSummary: "Fund what works",
      })
    ).toEqual(["missionSummary"]);
  });

  it("reports clearing a field that had a value", () => {
    expect(changedProjectFields(previous(), { ...unchangedSubmission(), problem: "" })).toEqual([
      "problem",
    ]);
  });

  it("ignores whitespace the form added around an otherwise identical value", () => {
    expect(
      changedProjectFields(previous(), { ...unchangedSubmission(), title: "  Karma GAP  " })
    ).toEqual([]);
  });

  it("reports a custom link added, removed or renamed", () => {
    expect(
      changedProjectFields(previous(), {
        ...unchangedSubmission(),
        customLinks: [
          { name: "Docs", url: "https://docs.test" },
          { name: "Forum", url: "https://forum.test" },
        ],
      })
    ).toEqual(["customLinks"]);

    expect(changedProjectFields(previous(), { ...unchangedSubmission(), customLinks: [] })).toEqual(
      ["customLinks"]
    );

    expect(
      changedProjectFields(previous(), {
        ...unchangedSubmission(),
        customLinks: [{ name: "Documentation", url: "https://docs.test" }],
      })
    ).toEqual(["customLinks"]);
  });

  it("carries field names and never the values behind them", () => {
    const changed = changedProjectFields(previous(), {
      ...unchangedSubmission(),
      description: "A description nobody should see in Mixpanel",
      website: "https://0x1234567890abcdef1234567890abcdef12345678.test",
    });

    const serialised = JSON.stringify(changed);
    expect(serialised).not.toContain("nobody should see");
    expect(serialised).not.toContain("0x1234567890abcdef");
    expect(changed.sort()).toEqual(["description", "website"]);
  });

  it("considers only the fields the submission actually owns", () => {
    // The form does not submit `slug` or `type`; a project holding them must not
    // report them as edited.
    expect(changedProjectFields(previous(), { title: "Karma GAP" })).toEqual([]);
  });
});
