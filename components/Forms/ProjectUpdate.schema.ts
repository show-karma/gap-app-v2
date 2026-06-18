import { z } from "zod";
import { MESSAGES } from "@/utilities/messages";

// Cap the update body length. The whole body is serialized into the attestation
// payload, and for sponsored (gasless) submissions the resulting operation must fit
// under the bundler's gas limit — cost scales ~linearly with length. 15k characters
// keeps a single update comfortably within that limit.
export const PROJECT_UPDATE_MAX_LENGTH = 15000;

// Only surface the live character counter as the body approaches the cap, so
// short updates stay uncluttered.
export const PROJECT_UPDATE_COUNTER_THRESHOLD = 10000;

export const updateSchema = z.object({
  title: z
    .string()
    .min(3, { message: MESSAGES.PROJECT_UPDATE_FORM.TITLE.MIN })
    .max(75, { message: MESSAGES.PROJECT_UPDATE_FORM.TITLE.MAX }),
  text: z
    .string()
    .min(3, { message: MESSAGES.PROJECT_UPDATE_FORM.TEXT.MIN })
    .max(PROJECT_UPDATE_MAX_LENGTH, { message: MESSAGES.PROJECT_UPDATE_FORM.TEXT.MAX }),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  grants: z.array(z.string()).optional(),
  outputs: z.array(
    z.object({
      outputId: z.string().min(1, "Output is required"),
      value: z.union([z.number().min(0), z.string()]),
      proof: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    })
  ),
  deliverables: z.array(
    z.object({
      name: z.string().min(1, "Name is required"),
      proof: z.string().min(1, "Proof is required"),
      description: z.string().optional(),
    })
  ),
});

export type UpdateType = z.infer<typeof updateSchema>;
