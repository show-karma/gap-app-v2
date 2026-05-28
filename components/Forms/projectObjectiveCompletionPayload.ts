import type { IProjectMilestoneStatus } from "@show-karma/karma-gap-sdk/core/class/entities/ProjectMilestone";
import { z } from "zod";
import { urlRegex } from "@/utilities/regexs/urlRegex";
import { sanitizeInput } from "@/utilities/sanitize";

/**
 * Form schema shared between the React form component and the on-chain payload
 * builder below. Kept in its own module so unit tests for the payload builder
 * can import without pulling in the heavy SDK / React form transitive graph.
 */
export const projectObjectiveCompletionSchema = z.object({
  description: z.string().optional(),
  proofOfWork: z
    .string()
    .refine((value) => urlRegex.test(value), {
      message: "Please enter a valid URL",
    })
    .optional()
    .or(z.literal("")),
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

export type ProjectObjectiveCompletionFormData = z.infer<typeof projectObjectiveCompletionSchema>;

export type ProjectObjectiveCompletionPayload = IProjectMilestoneStatus & {
  outputs: ProjectObjectiveCompletionFormData["outputs"];
  deliverables: ProjectObjectiveCompletionFormData["deliverables"];
};

/**
 * Builds the on-chain attestation payload for a project milestone completion.
 *
 * The SDK type `IProjectMilestoneStatus` is narrow (proofOfWork/reason/type),
 * but `ProjectMilestone.complete` spreads the data object into the JSON schema,
 * so any extra keys are persisted. Earlier this site only forwarded the three
 * narrow fields, silently dropping the `outputs` and `deliverables` arrays
 * the form collects — completed milestones then rendered with empty Metrics
 * sections. Always route through this builder to keep that contract intact.
 */
export const buildProjectObjectiveCompletionPayload = (
  data: ProjectObjectiveCompletionFormData
): ProjectObjectiveCompletionPayload => ({
  proofOfWork: sanitizeInput(data.proofOfWork),
  reason: sanitizeInput(data.description),
  type: "project-milestone-completed",
  outputs: data.outputs,
  deliverables: data.deliverables,
});
