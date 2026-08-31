import { z } from "zod";

const IsoTimestampSchema = z.string().datetime({ offset: true });
const PaginationSchema = z
  .object({
    totalCount: z.number().int().nonnegative().max(10_000),
    page: z.number().int().min(1),
    limit: z.number().int().min(1).max(100),
    totalPages: z.number().int().nonnegative().max(100),
    nextPage: z.number().int().min(1).nullable(),
    prevPage: z.number().int().min(1).nullable(),
    hasNextPage: z.boolean(),
    hasPrevPage: z.boolean(),
  })
  .passthrough();

export const NotebookIndicatorDtoSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().trim().min(1).max(500),
    description: z.string().max(5_000),
    unitOfMeasure: z.string().max(200),
    programs: z
      .array(
        z
          .object({
            programId: z.number().int().nonnegative(),
            chainID: z.number().int().nonnegative(),
          })
          .passthrough()
      )
      .max(1_000)
      .nullable(),
    communityUID: z.string().nullable(),
    kernelId: z.string().nullable(),
    syncType: z.enum(["auto", "manual"]).optional(),
    createdAt: IsoTimestampSchema,
    updatedAt: IsoTimestampSchema,
  })
  .passthrough();

export const NotebookIndicatorCatalogDtoSchema = z
  .object({
    payload: z.array(NotebookIndicatorDtoSchema).max(100),
    pagination: PaginationSchema,
  })
  .passthrough();

export const NotebookIndicatorDatapointDtoSchema = z
  .object({
    id: z.string().uuid().or(z.string().trim().min(1).max(200)),
    // Null/empty/non-numeric values are a per-point quality problem, not a
    // reason to discard every otherwise valid point in the response.
    value: z.string().nullable(),
    breakdown: z.string().nullable(),
    startDate: IsoTimestampSchema,
    endDate: IsoTimestampSchema,
    period: z.string().nullable(),
    proof: z.string().nullable(),
    thresholdOp: z.string().nullable(),
    thresholdValue: z.number().nullable(),
    source: z.string(),
    createdAt: IsoTimestampSchema,
    updatedAt: IsoTimestampSchema,
  })
  .passthrough();

export const NotebookIndicatorDatapointsDtoSchema = z
  .object({
    payload: z.array(NotebookIndicatorDatapointDtoSchema).max(100),
    pagination: PaginationSchema,
  })
  .passthrough();

export type NotebookIndicatorDto = z.infer<typeof NotebookIndicatorDtoSchema>;
export type NotebookIndicatorCatalogDto = z.infer<typeof NotebookIndicatorCatalogDtoSchema>;
export type NotebookIndicatorDatapointDto = z.infer<typeof NotebookIndicatorDatapointDtoSchema>;
export type NotebookIndicatorDatapointsDto = z.infer<typeof NotebookIndicatorDatapointsDtoSchema>;
