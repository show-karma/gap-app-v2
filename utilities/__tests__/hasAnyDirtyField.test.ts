import { hasAnyDirtyField } from "../hasAnyDirtyField";

describe("hasAnyDirtyField", () => {
  describe("pristine shapes", () => {
    it("returns false for empty object (pristine form)", () => {
      expect(hasAnyDirtyField({})).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(hasAnyDirtyField(undefined)).toBe(false);
    });

    it("returns false for null", () => {
      expect(hasAnyDirtyField(null)).toBe(false);
    });

    it("returns false for empty array", () => {
      expect(hasAnyDirtyField([])).toBe(false);
    });

    it("returns false when every leaf is explicitly false", () => {
      expect(hasAnyDirtyField({ description: false, completionPercentage: false })).toBe(false);
    });

    it("returns false for sparse array with only undefined entries", () => {
      // RHF shape when a useFieldArray field exists but no item is dirty
      // biome-ignore lint/suspicious/noSparseArray: replicating RHF's sparse-array dirtyFields shape
      const sparse = [, , ,];
      expect(hasAnyDirtyField(sparse)).toBe(false);
    });
  });

  describe("primitive field edits", () => {
    it("returns true when a top-level boolean is true (edited text field)", () => {
      expect(hasAnyDirtyField({ description: true })).toBe(true);
    });

    it("returns true when one of several fields is dirty", () => {
      expect(hasAnyDirtyField({ description: false, completionPercentage: true })).toBe(true);
    });
  });

  describe("array field edits (useFieldArray shapes)", () => {
    it("returns true for sparse array with a dirty item at index > 0", () => {
      // User edited deliverables[1].proof; index 0 is pristine
      const dirtyFields = {
        deliverables: [undefined, { proof: true }],
      };
      expect(hasAnyDirtyField(dirtyFields)).toBe(true);
    });

    it("returns true for fully populated dirty array item", () => {
      const dirtyFields = {
        outputs: [{ outputId: true, value: true, proof: true }],
      };
      expect(hasAnyDirtyField(dirtyFields)).toBe(true);
    });

    it("returns false when array item object has no truthy leaves", () => {
      const dirtyFields = {
        outputs: [{ outputId: false, value: false }],
      };
      expect(hasAnyDirtyField(dirtyFields)).toBe(false);
    });
  });

  describe("nested shapes", () => {
    it("returns true when a deeply nested leaf is dirty", () => {
      const dirtyFields = {
        outputs: [{ metadata: { label: true } }],
      };
      expect(hasAnyDirtyField(dirtyFields)).toBe(true);
    });

    it("returns false for deeply nested pristine structure", () => {
      const dirtyFields = {
        outputs: [{ metadata: { label: false, tags: [] } }],
      };
      expect(hasAnyDirtyField(dirtyFields)).toBe(false);
    });
  });

  describe("realistic MilestoneUpdate scenarios", () => {
    it("pristine edit (only invoice attached, no fields touched) → false", () => {
      expect(hasAnyDirtyField({})).toBe(false);
    });

    it("user typed in description → true", () => {
      expect(hasAnyDirtyField({ description: true })).toBe(true);
    });

    it("user changed completion percentage → true", () => {
      expect(hasAnyDirtyField({ completionPercentage: true })).toBe(true);
    });

    it("user edited one deliverable proof → true", () => {
      expect(
        hasAnyDirtyField({
          deliverables: [{ name: false, proof: true, description: false }],
        })
      ).toBe(true);
    });

    it("user changed an output value → true", () => {
      expect(
        hasAnyDirtyField({
          outputs: [{ outputId: false, value: true }],
        })
      ).toBe(true);
    });
  });
});
