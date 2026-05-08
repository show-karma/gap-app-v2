"use client";
import { useDominantColor } from "@/hooks/useDominantColor";
import { useCommunityDetails } from "@/hooks/v2/useCommunityDetails";
import { communityColors } from "@/utilities/communityColors";
import { useWhitelabel } from "@/utilities/whitelabel-context";

const ACCENT_PALETTE = [
  "#0090FF",
  "#2ED1A8",
  "#7C3AED",
  "#F59E0B",
  "#EF4444",
  "#06B6D4",
  "#EC4899",
  "#10B981",
  "#6366F1",
  "#F97316",
];

function pickAccent(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return ACCENT_PALETTE[hash % ACCENT_PALETTE.length];
}

export function useCommunityAccent(communityIdOrSlug: string | undefined): string {
  const { config } = useWhitelabel();
  const { community } = useCommunityDetails(communityIdOrSlug);
  const dominantColor = useDominantColor(community?.details?.logoUrl);

  const uid = community?.uid?.toLowerCase() || "";
  const slug = community?.details?.slug?.toLowerCase() || communityIdOrSlug?.toLowerCase() || "";
  const seed = uid || slug || community?.details?.name || "community";

  return (
    config?.theme?.logoBackground ??
    communityColors[uid] ??
    communityColors[slug] ??
    dominantColor ??
    pickAccent(seed)
  );
}
