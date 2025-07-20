import { GapIndexerApi } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/GapIndexerApi";
import { envVars } from "@/config/env";

export const gapIndexerApi = new GapIndexerApi(
  envVars.NEXT_PUBLIC_GAP_INDEXER_URL
);
