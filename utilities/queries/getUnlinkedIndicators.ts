import { z } from "zod";
import { errorManager } from "@/components/Utilities/errorManager";
import { api } from "../api/client";
import { INDEXER } from "../indexer";

const UnlinkedIndicatorSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    unitOfMeasure: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough();

export type UnlinkedIndicator = z.infer<typeof UnlinkedIndicatorSchema>;

const UnlinkedIndicatorsResponseSchema = z.array(UnlinkedIndicatorSchema);

export const getUnlinkedIndicators = async (search?: string): Promise<UnlinkedIndicator[]> => {
  try {
    return await api.get<UnlinkedIndicator[]>(INDEXER.INDICATORS.UNLINKED(search), {
      schema: UnlinkedIndicatorsResponseSchema,
    });
  } catch (error) {
    errorManager("Error fetching unlinked indicators", error);
    return [];
  }
};
