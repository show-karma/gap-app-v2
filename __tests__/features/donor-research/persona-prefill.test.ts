/**
 * U8 — buildPersonaPrefill pure-logic tests. Covers the null/empty guards, the
 * resolver-enum geography mapping (NOT raw persona enums), the deliberate
 * absence of amount derivation, and verbatim computedWeights.
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

  it("prefills amount min/max from the persona's explicit extracted figures", () => {
    const prefill = buildPersonaPrefill(makeDonorPersona({ amountMin: 5000, amountMax: 20000 }));
    expect(prefill?.amountMin).toBe(5000);
    expect(prefill?.amountMax).toBe(20000);
  });

  it("does NOT derive amounts from the gift size band (band alone seeds nothing)", () => {
    for (const band of ["small_high_leverage", "mid", "large_institutional"] as const) {
      const prefill = buildPersonaPrefill(
        makeDonorPersona({
          amountMin: undefined,
          amountMax: undefined,
          structured: {
            ...emptyPersonaStructured(),
            giftSizeBand: { value: band, source: "manual" },
          },
        })
      );
      expect(prefill?.amountMin).toBeUndefined();
      expect(prefill?.amountMax).toBeUndefined();
    }
  });

  it("leaves amountMax unset for an open-ended (null) upper bound", () => {
    const prefill = buildPersonaPrefill(makeDonorPersona({ amountMin: 250000, amountMax: null }));
    expect(prefill?.amountMin).toBe(250000);
    expect(prefill?.amountMax).toBeUndefined();
  });

  it("seeds the criteria text with the narrative verbatim (no marker label)", () => {
    const prefill = buildPersonaPrefill(makeDonorPersona({ narrative: "Loves local schools." }));
    expect(prefill?.criteriaTextAppendix).toBe("Loves local schools.");
  });

  it("passes computedWeights through verbatim (no client compute)", () => {
    const persona = makeDonorPersona();
    const prefill = buildPersonaPrefill(persona);
    expect(prefill?.weights).toEqual(persona.computedWeights);
  });
});
