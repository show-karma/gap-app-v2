/**
 * Unit tests for the persona PUT serializer (buildPersonaPutBody). The wire
 * contract (PRD §1):
 *  - omit a top-level key  => preserve (key absent from body)
 *  - explicit null          => clear
 *  - a cleared chip (value:null) must NOT carry `source`
 *  - a set chip defaults `source` to "manual" when not provided
 */

import { describe, expect, it } from "vitest";
import { buildPersonaPutBody } from "@/services/donor-research.service";

describe("buildPersonaPutBody", () => {
  it("omits keys that are not provided (omit = preserve)", () => {
    expect(buildPersonaPutBody({})).toEqual({});
    expect(buildPersonaPutBody({ narrative: "x" })).toEqual({ narrative: "x" });
    expect(buildPersonaPutBody({ sourceText: "x" })).not.toHaveProperty("narrative");
  });

  it("sends explicit null to clear sourceText / narrative", () => {
    expect(buildPersonaPutBody({ sourceText: null, narrative: null })).toEqual({
      sourceText: null,
      narrative: null,
    });
  });

  it("drops `source` on a cleared chip (value: null)", () => {
    const body = buildPersonaPutBody({
      structured: { faithStance: { value: null, source: "manual" } },
    });
    expect(body.structured).toEqual({ faithStance: { value: null } });
    expect((body.structured as Record<string, object>).faithStance).not.toHaveProperty("source");
  });

  it("defaults a set chip's source to manual when not provided", () => {
    const body = buildPersonaPutBody({
      structured: { orgMaturity: { value: "established" } },
    });
    expect(body.structured).toEqual({ orgMaturity: { value: "established", source: "manual" } });
  });

  it("keeps an explicit extracted source on an untouched refine chip", () => {
    const body = buildPersonaPutBody({
      structured: { geoRadius: { value: "local", source: "extracted" } },
    });
    expect(body.structured).toEqual({ geoRadius: { value: "local", source: "extracted" } });
  });

  it("only includes the chips that are present (per-chip omit = preserve)", () => {
    const body = buildPersonaPutBody({
      structured: { giftSizeBand: { value: "mid", source: "manual" } },
    });
    expect(Object.keys(body.structured as object)).toEqual(["giftSizeBand"]);
  });
});
