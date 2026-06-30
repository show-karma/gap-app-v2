/**
 * U8 — buildPersonaPrefill pure-logic tests. Covers the null/empty guards, the
 * resolver-enum geography mapping (NOT raw persona enums), amount bands, and
 * verbatim computedWeights.
 */

import { describe, expect, it } from "vitest";
import { buildPersonaPrefill } from "@/src/features/donor-research/utils/persona-prefill";
import {
  emptyPersonaStructured,
  makeDonorPersona,
} from "../../msw/handlers/donor-research.handlers";

describe("buildPersonaPrefill", () => {
  it("returns null for a null persona", () => {
    expect(buildPersonaPrefill(null)).toBeNull();
  });

  it("returns null when both texts are empty AND every chip is unset", () => {
    const persona = makeDonorPersona({
      sourceText: null,
      narrative: null,
      structured: emptyPersonaStructured(),
    });
    expect(buildPersonaPrefill(persona)).toBeNull();
  });

  it("is non-null when only a structured chip is set (no text)", () => {
    const persona = makeDonorPersona({
      sourceText: null,
      narrative: null,
      structured: {
        ...emptyPersonaStructured(),
        geoRadius: { value: "national", source: "manual" },
      },
    });
    const prefill = buildPersonaPrefill(persona);
    expect(prefill).not.toBeNull();
    expect(prefill?.geography).toBe("national");
  });

  it("maps geoRadius to the resolver enum (local→metro, regional→regional, national→national)", () => {
    const make = (value: "local" | "regional" | "national" | null) =>
      buildPersonaPrefill(
        makeDonorPersona({
          structured: { ...emptyPersonaStructured(), geoRadius: { value, source: "extracted" } },
        })
      )?.geography;

    expect(make("local")).toBe("metro");
    expect(make("regional")).toBe("regional");
    expect(make("national")).toBe("national");
  });

  it("leaves geography undefined when geoRadius is null", () => {
    const prefill = buildPersonaPrefill(
      makeDonorPersona({
        structured: {
          ...emptyPersonaStructured(),
          giftSizeBand: { value: "mid", source: "manual" },
        },
      })
    );
    expect(prefill?.geography).toBeUndefined();
  });

  it("maps gift size bands to amount ranges", () => {
    const amounts = (band: "small_high_leverage" | "mid" | "large_institutional") => {
      const p = buildPersonaPrefill(
        makeDonorPersona({
          structured: {
            ...emptyPersonaStructured(),
            giftSizeBand: { value: band, source: "manual" },
          },
        })
      );
      return [p?.amountMin, p?.amountMax];
    };

    expect(amounts("small_high_leverage")).toEqual([10000, 50000]);
    expect(amounts("mid")).toEqual([50000, 250000]);
    expect(amounts("large_institutional")).toEqual([250000, null]);
  });

  it("appends the narrative to the criteria text with a separator", () => {
    const prefill = buildPersonaPrefill(makeDonorPersona({ narrative: "Loves local schools." }));
    expect(prefill?.criteriaTextAppendix).toBe("\n\n[From donor persona]\nLoves local schools.");
  });

  it("passes computedWeights through verbatim (no client compute)", () => {
    const persona = makeDonorPersona();
    const prefill = buildPersonaPrefill(persona);
    expect(prefill?.weights).toEqual(persona.computedWeights);
  });
});
