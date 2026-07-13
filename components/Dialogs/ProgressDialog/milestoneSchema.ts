import { z } from "zod";

// Form schema for creating milestones (roadmap + grant milestones).
export const milestoneSchema = z.object({
  title: z
    .string()
    .min(3, { message: "Title must be at least 3 characters" })
    .max(50, { message: "Title must be at most 50 characters" }),
  description: z.string().min(3, { message: "Description is required" }),
  priority: z
    .literal("")
    .transform(() => undefined)
    .or(z.coerce.number())
    .optional(),
  dates: z
    .object({
      endsAt: z.date({
        error: "End date is required",
      }),
      startsAt: z.date().optional(),
    })
    .optional()
    .refine(
      (data) => {
        // Only validate if both dates exist
        if (!data || !data.startsAt || !data.endsAt) return true;
        // Ensure start date is not after end date
        return data.startsAt <= data.endsAt;
      },
      {
        message: "Start date must be on or before the end date",
        path: ["startsAt"],
      }
    ),
});

export type MilestoneFormData = z.infer<typeof milestoneSchema>;
