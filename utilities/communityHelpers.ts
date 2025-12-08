import type { Community } from "@/types/v2/community";

const CHAIN_SUFFIXES = ["-op", "-arb", "-base", "-celo", "-sei"];

export function groupSimilarCommunities(communities: Community[]): Community[] {
  const groupedCommunities: { [key: string]: Community } = {};

  communities.forEach((community) => {
    const name = community.details?.name;
    if (!name) return;

    let baseName = name;
    for (const suffix of CHAIN_SUFFIXES) {
      if (name.toLowerCase().endsWith(suffix)) {
        baseName = name.slice(0, -suffix.length).trim();
        break;
      }
    }

    if (!groupedCommunities[baseName] || name === baseName) {
      groupedCommunities[baseName] = community;
    }
  });

  return Object.values(groupedCommunities);
}
