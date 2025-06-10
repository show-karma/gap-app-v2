import { ICommunityResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";

const CHAIN_SUFFIXES = ['-op', '-arb', '-base', '-celo', '-sei']; // Add more chain suffixes as needed

export function groupSimilarCommunities(communities: ICommunityResponse[]): ICommunityResponse[] {
    const groupedCommunities: { [key: string]: ICommunityResponse } = {};

    communities.forEach((community) => {
        const name = community.details?.data?.name;
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