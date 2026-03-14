import {
  buildCompositeProgramId,
  parseCompositeProgramKey,
  parseProgramIdAndChainId,
} from "@/src/features/program-registry/utils/program-utils";

jest.mock("@/components/Pages/ProgramRegistry/helper", () => ({
  registryHelper: { supportedNetworks: 1 },
}));

describe("parseProgramIdAndChainId", () => {
  it("should parse simple programId_chainId format", () => {
    const result = parseProgramIdAndChainId("1018_10");
    expect(result).toEqual({ programId: "1018", chainId: 10 });
  });

  it("should handle program IDs containing underscores", () => {
    const result = parseProgramIdAndChainId("my_program_42");
    expect(result).toEqual({ programId: "my_program", chainId: 42 });
  });

  it("should handle program IDs with multiple underscores", () => {
    const result = parseProgramIdAndChainId("a_b_c_100");
    expect(result).toEqual({ programId: "a_b_c", chainId: 100 });
  });

  it("should return default chainId for IDs without underscore", () => {
    const result = parseProgramIdAndChainId("simple-id");
    expect(result).toEqual({ programId: "simple-id", chainId: 1 });
  });

  it("should return default chainId for empty string", () => {
    const result = parseProgramIdAndChainId("");
    expect(result).toEqual({ programId: "", chainId: 1 });
  });

  it("should fall back if chainId part is not numeric", () => {
    const result = parseProgramIdAndChainId("program_abc");
    expect(result).toEqual({ programId: "program_abc", chainId: 1 });
  });

  it("should accept custom default chainId", () => {
    const result = parseProgramIdAndChainId("no-chain", 42);
    expect(result).toEqual({ programId: "no-chain", chainId: 42 });
  });
});

describe("parseCompositeProgramKey", () => {
  it("should parse simple composite key", () => {
    const result = parseCompositeProgramKey("1018_10");
    expect(result).toEqual({ programId: "1018", chainID: 10 });
  });

  it("should handle program IDs containing underscores", () => {
    const result = parseCompositeProgramKey("my_program_42");
    expect(result).toEqual({ programId: "my_program", chainID: 42 });
  });

  it("should return null chainID for IDs without underscore", () => {
    const result = parseCompositeProgramKey("simple-id");
    expect(result).toEqual({ programId: "simple-id", chainID: null });
  });

  it("should return null chainID if trailing part is not numeric", () => {
    const result = parseCompositeProgramKey("program_abc");
    expect(result).toEqual({ programId: "program_abc", chainID: null });
  });
});

describe("buildCompositeProgramId", () => {
  it("should build composite key with chainID", () => {
    expect(buildCompositeProgramId("1018", 10)).toBe("1018_10");
  });

  it("should return just programId when chainID is null", () => {
    expect(buildCompositeProgramId("1018", null)).toBe("1018");
  });

  it("should return just programId when chainID is undefined", () => {
    expect(buildCompositeProgramId("1018", undefined)).toBe("1018");
  });

  it("should handle undefined programId", () => {
    expect(buildCompositeProgramId(undefined, 10)).toBe("_10");
  });

  it("should roundtrip through parse correctly", () => {
    const key = buildCompositeProgramId("my_program", 42);
    const parsed = parseCompositeProgramKey(key);
    expect(parsed).toEqual({ programId: "my_program", chainID: 42 });
  });
});
