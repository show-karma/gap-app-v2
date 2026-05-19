import type { TeamRole } from "@/lib/ai-agent-client";

/** Pastel role palettes ported from the design bundle. */
export const ROLE_PALETTES: Record<
  TeamRole,
  { bg: string; bgDeep: string; stroke: string; ink: string; accent: string }
> = {
  orchestrator: {
    bg: "#D7F5E5",
    bgDeep: "#CDEEDA",
    stroke: "#86E3B5",
    ink: "#166534",
    accent: "#22C55E",
  },
  fundraiser: {
    bg: "#FAEFC4",
    bgDeep: "#F5E6B4",
    stroke: "#F1D582",
    ink: "#92400E",
    accent: "#F59E0B",
  },
  communications: {
    bg: "#DBE7F8",
    bgDeep: "#CFDEF4",
    stroke: "#A6C2EE",
    ink: "#1E40AF",
    accent: "#3B82F6",
  },
  operations: {
    bg: "#E6E0FB",
    bgDeep: "#DCD3F7",
    stroke: "#BFB0F0",
    ink: "#5B21B6",
    accent: "#8B5CF6",
  },
};
