import { ContributorProfile } from "@show-karma/karma-gap-sdk";
import fetchData from "../fetchData";
import { INDEXER } from "../indexer";
import { errorManager } from "@/components/Utilities/errorManager";

export const getContributorProfiles = async (
  addresses: string[]
): Promise<ContributorProfile[] | undefined> => {
  try {
    const [data, error] = await fetchData(
      INDEXER.PROFILE.GET(addresses.join(","))
    );
    if (error || !data) throw error;
    return data;
  } catch (e) {
    errorManager("Failed to fetch profiles", e, {
      addresses,
    });
    return;
  }
};
