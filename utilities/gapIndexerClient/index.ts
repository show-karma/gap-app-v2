import { GapIndexerClient } from "@show-karma/karma-gap-sdk/core/class";
import { envVars } from "../enviromentVars";

export const gapIndexerClient = new GapIndexerClient(
	envVars.NEXT_PUBLIC_GAP_INDEXER_URL,
);
