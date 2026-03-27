import type { Community } from "@/types/v2/community";
import { applyOverrides, type DeepPartial, seq } from "./utils";

// Re-export program factory for backward compatibility
export { createMockProgram, type MockProgram } from "./program.factory";

// ─── Community factory ───

export function createMockCommunity(overrides?: DeepPartial<Community>): Community {
  const n = seq();
  const defaults: Community = {
    uid: `0xcommunity${n.toString(16).padStart(8, "0")}` as `0x${string}`,
    chainID: 10,
    details: {
      name: `Optimism RetroPGF Round ${n}`,
      description:
        "A retroactive public goods funding program rewarding builders who create measurable impact in the Optimism ecosystem.",
      slug: `optimism-retropgf-${n}`,
      imageURL: `https://storage.karma.fund/communities/retropgf-${n}.png`,
    },
    createdAt: "2024-01-10T08:00:00Z",
    updatedAt: "2024-06-01T12:00:00Z",
  };
  return applyOverrides(defaults, overrides);
}
