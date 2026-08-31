import type { ContributorProfile } from "@show-karma/karma-gap-sdk";
import { errorManager } from "@/components/Utilities/errorManager";
import { api } from "../api/client";
import { INDEXER } from "../indexer";

export const getContributorProfiles = async (
  addresses: string[]
): Promise<ContributorProfile[] | undefined> => {
  try {
    // TODO(#1775): add zod schema
    return await api.get<ContributorProfile[]>(INDEXER.PROFILE.GET(addresses.join(",")));
  } catch (e) {
    errorManager("Failed to fetch profiles", e, {
      addresses,
    });
    return;
  }
};
