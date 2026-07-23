import { LEVELS } from "../data/mock-data";
import type { LevelDef } from "../types";

export function levelForXp(xp: number): LevelDef {
  let current = LEVELS[0];
  for (const level of LEVELS) {
    if (xp >= level.minXp) current = level;
  }
  return current;
}

export function nextLevelForXp(xp: number): LevelDef | null {
  return LEVELS.find((level) => level.minXp > xp) ?? null;
}
