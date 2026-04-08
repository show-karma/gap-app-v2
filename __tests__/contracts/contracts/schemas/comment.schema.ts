import { z } from "zod";

export const commentAuthorRoleSchema = z.enum(["applicant", "admin", "reviewer"]);

export const commentEditHistorySchema = z.object({
  content: z.string(),
  editedAt: z.union([z.string(), z.date()]),
  editedBy: z.string(),
});

export const applicationCommentSchema = z.object({
  id: z.string(),
  applicationId: z.string(),
  authorAddress: z.string(),
  authorRole: commentAuthorRoleSchema,
  authorName: z.string().optional(),
  content: z.string(),
  isDeleted: z.boolean(),
  deletedAt: z.union([z.string(), z.date()]).optional(),
  deletedBy: z.string().optional(),
  editHistory: z.array(commentEditHistorySchema).optional(),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
});

export const commentListResponseSchema = z.object({
  comments: z.array(applicationCommentSchema),
  meta: z
    .object({
      total: z.number(),
    })
    .optional(),
});
