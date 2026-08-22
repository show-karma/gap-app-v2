import { describe, expect, it } from "vitest";
import { TOUR_ANCHORS } from "../tour-anchors";
import { ALL_TOURS, surfaceFor } from "../tours";

const KNOWN_ANCHORS = new Set<string>(Object.values(TOUR_ANCHORS));

describe("tour registry", () => {
  it("points every step at a declared anchor", () => {
    for (const tour of ALL_TOURS) {
      for (const step of tour.steps) {
        expect(KNOWN_ANCHORS.has(step.anchor), `${tour.id} → ${step.anchor}`).toBe(true);
      }
    }
  });

  it("gives every tour a unique id", () => {
    const ids = ALL_TOURS.map((tour) => tour.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every tour at least one step and readable copy", () => {
    for (const tour of ALL_TOURS) {
      expect(tour.steps.length, tour.id).toBeGreaterThan(0);
      for (const step of tour.steps) {
        expect(step.title.trim()).not.toBe("");
        expect(step.description.trim()).not.toBe("");
      }
    }
  });

  it("does not reuse an anchor twice inside one tour", () => {
    for (const tour of ALL_TOURS) {
      const anchors = tour.steps.map((step) => step.anchor);
      expect(new Set(anchors).size, tour.id).toBe(anchors.length);
    }
  });

  it("keys storage per tour and version", () => {
    const surfaces = ALL_TOURS.map(surfaceFor);
    expect(new Set(surfaces).size).toBe(surfaces.length);
    for (const tour of ALL_TOURS) {
      expect(surfaceFor(tour)).toContain(`v${tour.version}`);
    }
  });
});
