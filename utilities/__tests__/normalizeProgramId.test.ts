import { normalizeProgramId, parseProgramId } from "@/utilities/normalizeProgramId";

describe("normalizeProgramId", () => {
  it("strips the chain-id suffix from a composite id", () => {
    expect(normalizeProgramId("1013_42161")).toBe("1013");
  });

  it("returns a base id unchanged", () => {
    expect(normalizeProgramId("1013")).toBe("1013");
  });

  it("keeps only the first segment when several underscores are present", () => {
    expect(normalizeProgramId("1013_42161_10")).toBe("1013");
  });

  it("returns an empty string for a suffix-only id", () => {
    expect(normalizeProgramId("_42161")).toBe("");
  });

  it("returns an empty string unchanged", () => {
    expect(normalizeProgramId("")).toBe("");
  });
});

describe("parseProgramId", () => {
  it("strips the chain-id suffix from a composite id", () => {
    expect(parseProgramId("1013_42161")).toBe("1013");
  });

  it("returns a base id unchanged", () => {
    expect(parseProgramId("1013")).toBe("1013");
  });

  it("returns undefined for undefined", () => {
    expect(parseProgramId(undefined)).toBeUndefined();
  });

  it("returns undefined for null", () => {
    expect(parseProgramId(null)).toBeUndefined();
  });

  it("returns undefined for an empty string", () => {
    expect(parseProgramId("")).toBeUndefined();
  });

  it("returns undefined for a suffix-only id so callers never fetch an empty id", () => {
    expect(parseProgramId("_42161")).toBeUndefined();
  });

  it("preserves non-numeric program ids", () => {
    expect(parseProgramId("propgf-batch-2_42161")).toBe("propgf-batch-2");
  });
});
