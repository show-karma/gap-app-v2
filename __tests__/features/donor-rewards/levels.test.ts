import { LEVELS } from "@/src/features/donor-rewards/data/mock-data";
import { levelForXp, nextLevelForXp } from "@/src/features/donor-rewards/utils/levels";

describe("levelForXp", () => {
  it("returns the lowest level at 0 XP", () => {
    expect(levelForXp(0).name).toBe("Supporter");
  });

  it("promotes exactly at each level threshold", () => {
    for (const level of LEVELS) {
      expect(levelForXp(level.minXp).name).toBe(level.name);
      expect(levelForXp(level.minXp - 1).name).not.toBe(level.minXp === 0 ? "" : level.name);
    }
  });

  it("stays at the top level past the last threshold", () => {
    expect(levelForXp(1_000_000).name).toBe("Luminary");
  });
});

describe("nextLevelForXp", () => {
  it("returns the next threshold while one exists", () => {
    expect(nextLevelForXp(0)?.name).toBe("Contributor");
    expect(nextLevelForXp(2140)?.name).toBe("Benefactor");
  });

  it("returns null at the top level", () => {
    expect(nextLevelForXp(5200)).toBeNull();
  });
});
