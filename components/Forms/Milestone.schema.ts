import { z } from "zod";
import { MESSAGES } from "@/utilities/messages";

export const milestoneSchema = z.object({
  title: z
    .string()
    .min(3, { message: MESSAGES.MILESTONES.FORM.TITLE.MIN })
    .max(50, { message: MESSAGES.MILESTONES.FORM.TITLE.MAX }),
  priority: z.number().optional(),
  description: z.string().optional(),
  dates: z
    .object({
      endsAt: z.date({
        error: MESSAGES.MILESTONES.FORM.DATE,
      }),
      startsAt: z.date().optional(),
    })
    .refine(
      (data) => {
        const endsAt = data.endsAt.getTime() / 1000;
        const startsAt = data.startsAt ? data.startsAt.getTime() / 1000 : undefined;

        return startsAt ? startsAt <= endsAt : true;
      },
      {
        message: "Start date must be before the end date",
        // Relative to the `dates` object this refine is attached to; a
        // ["dates", "startsAt"] path would resolve to dates.dates.startsAt
        path: ["startsAt"],
      }
    ),
});
