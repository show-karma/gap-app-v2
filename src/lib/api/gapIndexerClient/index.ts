import { envVars } from "../enviromentVars";
import { GapIndexerClient } from "@show-karma/karma-gap-sdk/core/class";

export const gapIndexerClient = new GapIndexerClient(envVars.NEXT_PUBLIC_GAP_INDEXER_URL);