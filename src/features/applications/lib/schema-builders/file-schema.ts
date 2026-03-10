import { z } from "zod";
import type { ApplicationQuestion } from "@/types/whitelabel-entities";

export function buildFileSchema(q: ApplicationQuestion) {
  if (q.required) {
    let fieldSchema: z.ZodTypeAny = z
      .union([z.instanceof(File), z.undefined(), z.null()])
      .refine((val) => val !== undefined && val !== null, {
        message: "This field is required",
      });

    if (q.validation?.maxFileSize) {
      const maxSizeMB = q.validation.maxFileSize / (1024 * 1024);
      fieldSchema = fieldSchema.refine(
        (val: unknown) => val instanceof File && val.size <= q.validation!.maxFileSize!,
        {
          message: `Maximum file size is ${maxSizeMB}MB`,
        }
      );
    }

    if (q.validation?.fileTypes && q.validation.fileTypes.length > 0) {
      fieldSchema = fieldSchema.refine(
        (val: unknown) => {
          if (val instanceof File) {
            const ext = `.${val.name.split(".").pop()?.toLowerCase()}`;
            return q.validation!.fileTypes!.includes(ext);
          }
          return true;
        },
        {
          message: `Allowed file types: ${q.validation.fileTypes.join(", ")}`,
        }
      );
    }

    return fieldSchema;
  }

  if (q.validation?.maxFileSize || (q.validation?.fileTypes && q.validation.fileTypes.length > 0)) {
    let fileSchema: z.ZodTypeAny = z.instanceof(File);

    if (q.validation?.maxFileSize) {
      const maxSizeMB = q.validation.maxFileSize / (1024 * 1024);
      fileSchema = fileSchema.refine(
        (file: unknown) => file instanceof File && file.size <= q.validation!.maxFileSize!,
        `Maximum file size is ${maxSizeMB}MB`
      );
    }

    if (q.validation?.fileTypes && q.validation.fileTypes.length > 0) {
      fileSchema = fileSchema.refine(
        (file: unknown) => {
          if (!(file instanceof File)) return true;
          const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
          return q.validation!.fileTypes!.includes(ext);
        },
        `Allowed file types: ${q.validation.fileTypes.join(", ")}`
      );
    }

    return z.union([fileSchema, z.null(), z.undefined()]);
  }

  return z.union([z.instanceof(File), z.null(), z.undefined()]);
}
