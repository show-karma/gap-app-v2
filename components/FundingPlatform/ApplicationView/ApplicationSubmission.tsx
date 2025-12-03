"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { type FC, useCallback, useEffect, useMemo, useState } from "react";
import { Controller, type SubmitHandler, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { z } from "zod";
import { Button } from "@/components/Utilities/Button";
import type { IFormField, IFormSchema } from "@/types/funding-platform";
import { cn } from "@/utilities/tailwind";

interface IApplicationSubmissionProps {
  programId: string;
  chainId: number;
  formSchema: IFormSchema;
  onSubmit?: (applicationData: Record<string, any>) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  initialData?: Record<string, any>;
  isEditMode?: boolean;
  onMatchingDiagnostics?: (
    diagnostics: {
      matched: Array<{ fieldLabel: string; originalKey: string; fieldId: string }>;
      unmatched: Array<{ originalKey: string; value: any }>;
      matchRate: number;
    } | null
  ) => void;
}

const labelStyle = "text-sm font-bold text-black dark:text-zinc-100";
const inputStyle =
  "mt-2 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder:text-zinc-300";

/**
 * Finds the original key in initialData that matches the given field.
 * Uses multiple matching strategies to handle different key formats.
 */
function findOriginalKey(field: IFormField, initialData: Record<string, any>): string | undefined {
  const fieldName = field.label.toLowerCase().replace(/\s+/g, "_");

  // Strategy 1: Match with field.id (if available) - most reliable
  if (field.id && field.id in initialData) {
    return field.id;
  }

  // Strategy 2: Exact match with fieldName
  if (fieldName in initialData) {
    return fieldName;
  }

  // Strategy 3: Case-insensitive match with fieldName
  const caseInsensitiveMatch = Object.keys(initialData).find(
    (key) => key.toLowerCase() === fieldName
  );
  if (caseInsensitiveMatch) {
    return caseInsensitiveMatch;
  }

  // Strategy 4: Match with original field label (case-insensitive)
  const labelMatch = Object.keys(initialData).find(
    (key) => key.toLowerCase() === field.label.toLowerCase()
  );
  if (labelMatch) {
    return labelMatch;
  }

  // Strategy 5: Normalized match (remove special chars, extra spaces)
  const normalizedFieldLabel = field.label
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "");
  const normalizedMatch = Object.keys(initialData).find((key) => {
    const normalizedKey = key
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ")
      .replace(/[^\w\s]/g, "");
    return normalizedKey === normalizedFieldLabel;
  });
  if (normalizedMatch) {
    return normalizedMatch;
  }

  return undefined;
}

const ApplicationSubmission: FC<IApplicationSubmissionProps> = ({
  programId,
  chainId,
  formSchema,
  onSubmit,
  onCancel,
  isLoading = false,
  initialData,
  isEditMode = false,
  onMatchingDiagnostics,
}) => {
  const { address } = useAccount();
  const [submitting, setSubmitting] = useState(false);

  // Generate dynamic Zod schema based on form schema
  const generateValidationSchema = useCallback((schema: IFormSchema) => {
    const schemaObject: Record<string, any> = {};

    schema.fields.forEach((field) => {
      const fieldName = field.label.toLowerCase().replace(/\s+/g, "_");
      let fieldSchema: z.ZodTypeAny;

      switch (field.type) {
        case "email":
          if (field.required) {
            fieldSchema = z
              .string()
              .email("Please enter a valid email address")
              .min(1, `${field.label} is required`);
          } else {
            fieldSchema = z
              .string()
              .optional()
              .or(z.literal(""))
              .refine(
                (val) => {
                  if (!val || val === "") return true; // Empty is OK for optional fields
                  return z.string().email().safeParse(val).success;
                },
                { message: "Please enter a valid email address" }
              );
          }
          break;
        case "url":
          if (field.required) {
            fieldSchema = z
              .string()
              .url("Please enter a valid URL")
              .min(1, `${field.label} is required`);
          } else {
            fieldSchema = z
              .string()
              .optional()
              .or(z.literal(""))
              .refine(
                (val) => {
                  if (!val || val === "") return true; // Empty is OK for optional fields
                  return z.string().url().safeParse(val).success;
                },
                { message: "Please enter a valid URL" }
              );
          }
          break;
        case "checkbox": {
          // Checkboxes return arrays of selected values
          let checkboxSchema: z.ZodTypeAny = z.array(z.string());
          if (field.validation?.min) {
            checkboxSchema = (checkboxSchema as z.ZodArray<z.ZodString>).min(
              field.validation.min,
              `Please select at least ${field.validation.min} option(s)`
            );
          }
          if (field.validation?.max) {
            checkboxSchema = (checkboxSchema as z.ZodArray<z.ZodString>).max(
              field.validation.max,
              `Please select at most ${field.validation.max} option(s)`
            );
          }
          if (field.required) {
            checkboxSchema = (checkboxSchema as z.ZodArray<z.ZodString>).min(
              1,
              `${field.label} is required`
            );
          } else {
            checkboxSchema = (checkboxSchema as z.ZodArray<z.ZodString>)
              .optional()
              .or(z.array(z.string()).length(0));
          }
          fieldSchema = checkboxSchema;
          break;
        }
        case "radio":
          fieldSchema = z.string();
          break;
        case "number": {
          let numberSchema: z.ZodTypeAny = z.string();
          if (field.required) {
            numberSchema = (numberSchema as z.ZodString).min(1, `${field.label} is required`);
          } else {
            numberSchema = (numberSchema as z.ZodString).optional().or(z.literal(""));
          }
          numberSchema = (numberSchema as z.ZodString).refine(
            (val: string) => {
              if (!val || val === "") return !field.required;
              return !Number.isNaN(Number(val));
            },
            { message: "Please enter a valid number" }
          );
          if (field.validation?.min !== undefined) {
            numberSchema = (numberSchema as z.ZodEffects<any>).refine(
              (val: string) => {
                if (!val || val === "") return !field.required;
                const num = Number(val);
                return !Number.isNaN(num) && num >= field.validation!.min!;
              },
              { message: `Minimum value is ${field.validation.min}` }
            );
          }
          if (field.validation?.max !== undefined) {
            numberSchema = (numberSchema as z.ZodEffects<any>).refine(
              (val: string) => {
                if (!val || val === "") return !field.required;
                const num = Number(val);
                return !Number.isNaN(num) && num <= field.validation!.max!;
              },
              { message: `Maximum value is ${field.validation.max}` }
            );
          }
          fieldSchema = numberSchema;
          break;
        }
        case "text":
        case "textarea": {
          let textSchema: z.ZodTypeAny = z.string();
          if (field.validation?.min && field.validation.min > 1) {
            textSchema = (textSchema as z.ZodString).min(
              field.validation.min,
              `Minimum ${field.validation.min} characters required`
            );
          }
          if (field.validation?.pattern) {
            textSchema = (textSchema as z.ZodString).refine(
              (val: string) => new RegExp(field.validation!.pattern!).test(val),
              { message: field.validation.message || "Invalid format" }
            );
          }
          if (field.required) {
            textSchema = (textSchema as z.ZodString).min(1, `${field.label} is required`);
          } else {
            textSchema = (textSchema as z.ZodString).optional().or(z.literal(""));
          }
          fieldSchema = textSchema;
          break;
        }
        case "select":
        case "date":
          fieldSchema = z.string();
          break;
        case "milestone":
          if (field.required) {
            if (field.validation?.minMilestones) {
              fieldSchema = z
                .array(z.any())
                .min(
                  field.validation.minMilestones,
                  `Please add at least ${field.validation.minMilestones} milestone(s)`
                );
            } else {
              fieldSchema = z.array(z.any()).min(1, `${field.label} is required`);
            }
            if (field.validation?.maxMilestones) {
              fieldSchema = (fieldSchema as z.ZodArray<any>).max(
                field.validation.maxMilestones,
                `Maximum ${field.validation.maxMilestones} milestone(s) allowed`
              );
            }
          } else {
            fieldSchema = z.array(z.any()).optional().or(z.array(z.any()).length(0));
          }
          break;
        default:
          fieldSchema = z.string();
          break;
      }

      // Apply required validation for select, date, and radio fields
      if (["select", "date", "radio"].includes(field.type)) {
        if (field.required) {
          fieldSchema = (fieldSchema as z.ZodString).min(1, `${field.label} is required`);
        } else {
          fieldSchema = (fieldSchema as z.ZodString).optional().or(z.literal("")) as z.ZodTypeAny;
        }
      }

      // Use field.id if available, otherwise fall back to fieldName
      // This prevents issues with duplicate field labels
      const schemaKey = field.id || fieldName;
      schemaObject[schemaKey] = fieldSchema;
    });

    return z.object(schemaObject);
  }, []);

  const validationSchema = generateValidationSchema(formSchema);
  type FormData = z.infer<typeof validationSchema>;

  // Build default values for form fields
  const getDefaultValues = useCallback((): Partial<FormData> => {
    const defaults: Record<string, any> = {};
    formSchema.fields.forEach((field) => {
      const fieldName = field.label.toLowerCase().replace(/\s+/g, "_");
      // Use field.id if available, otherwise fall back to fieldName (consistent with validation schema)
      const fieldKey = field.id || fieldName;
      if (field.type === "checkbox") {
        defaults[fieldKey] = [];
      } else {
        defaults[fieldKey] = "";
      }
    });
    return defaults as Partial<FormData>;
  }, [formSchema.fields]);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    trigger,
    control,
  } = useForm<FormData>({
    resolver: zodResolver(validationSchema),
    mode: "onChange",
    defaultValues: getDefaultValues(),
  });

  // Count validation errors
  const errorCount = Object.keys(errors).length;

  // Create mapping from field IDs to labels (for submission)
  const fieldIdToLabelMapping = useMemo(() => {
    const mapping: Record<string, string> = {};
    formSchema.fields.forEach((field) => {
      const fieldKey = field.id || field.label.toLowerCase().replace(/\s+/g, "_");
      mapping[fieldKey] = field.label;
    });
    return mapping;
  }, [formSchema.fields]);

  // Create key mapping from form field keys to original keys in initialData
  // This preserves the original key format when submitting edits
  const keyMapping = useMemo(() => {
    if (!isEditMode || !initialData) return null;

    const mapping: Record<string, string> = {};
    formSchema.fields.forEach((field) => {
      const fieldKey = field.id || field.label.toLowerCase().replace(/\s+/g, "_");
      const originalKey = findOriginalKey(field, initialData);

      if (originalKey) {
        mapping[fieldKey] = originalKey;
      }
    });

    return mapping;
  }, [isEditMode, initialData, formSchema.fields]);

  // Track matching diagnostics to identify fields that matched vs didn't match
  const matchingDiagnostics = useMemo(() => {
    if (!isEditMode || !initialData || !formSchema.fields.length) return null;

    const diagnostics = {
      matched: [] as Array<{ fieldLabel: string; originalKey: string; fieldId: string }>,
      unmatched: [] as Array<{ originalKey: string; value: any }>,
      matchRate: 0,
    };

    // Track which fields matched
    formSchema.fields.forEach((field) => {
      const fieldKey = field.id || field.label.toLowerCase().replace(/\s+/g, "_");
      const originalKey = findOriginalKey(field, initialData);

      if (originalKey) {
        diagnostics.matched.push({
          fieldLabel: field.label,
          originalKey,
          fieldId: fieldKey,
        });
      }
    });

    // Track keys in initialData that don't match any field
    const matchedKeys = new Set(diagnostics.matched.map((m) => m.originalKey));
    Object.entries(initialData).forEach(([key, value]) => {
      if (!matchedKeys.has(key)) {
        diagnostics.unmatched.push({
          originalKey: key,
          value,
        });
      }
    });

    const totalFields = formSchema.fields.length;
    const matchedCount = diagnostics.matched.length;
    diagnostics.matchRate = totalFields > 0 ? matchedCount / totalFields : 1;

    return diagnostics;
  }, [isEditMode, initialData, formSchema.fields]);

  // Log warnings for low match rate
  useEffect(() => {
    if (matchingDiagnostics) {
      if (matchingDiagnostics.matchRate < 0.5) {
        console.error(
          `🚨 Critical: Low field matching rate: ${(matchingDiagnostics.matchRate * 100).toFixed(0)}%`,
          {
            matched: matchingDiagnostics.matched.length,
            unmatched: matchingDiagnostics.unmatched.length,
            unmatchedFields: matchingDiagnostics.unmatched.map((f) => f.originalKey),
            totalFields: matchingDiagnostics.matched.length + matchingDiagnostics.unmatched.length,
          }
        );
      } else if (matchingDiagnostics.matchRate < 0.7) {
        console.warn(
          `⚠️ Low field matching rate: ${(matchingDiagnostics.matchRate * 100).toFixed(0)}%`,
          {
            matched: matchingDiagnostics.matched.length,
            unmatched: matchingDiagnostics.unmatched.length,
            unmatchedFields: matchingDiagnostics.unmatched.map((f) => f.originalKey),
          }
        );
      }
    }
  }, [matchingDiagnostics]);

  // Expose diagnostics to parent component
  useEffect(() => {
    onMatchingDiagnostics?.(matchingDiagnostics);
  }, [matchingDiagnostics, onMatchingDiagnostics]);

  // Pre-fill form when initialData is provided (edit mode)
  useEffect(() => {
    if (initialData && formSchema.fields.length > 0 && isEditMode) {
      try {
        const formData: Record<string, any> = {};

        formSchema.fields.forEach((field) => {
          const fieldName = field.label.toLowerCase().replace(/\s+/g, "_");
          // Use field.id if available, otherwise fall back to fieldName (consistent with validation schema)
          const fieldKey = field.id || fieldName;

          // Use the extracted function to find matching key
          const matchingKey = findOriginalKey(field, initialData);

          if (matchingKey !== undefined && matchingKey in initialData) {
            const value = initialData[matchingKey];

            // Handle checkbox fields (arrays)
            if (field.type === "checkbox") {
              formData[fieldKey] = Array.isArray(value) ? value : [value];
            } else {
              // Convert all other values to strings
              if (Array.isArray(value)) {
                formData[fieldKey] = value.join(", ");
              } else if (value === null || value === undefined) {
                formData[fieldKey] = "";
              } else if (Number.isNaN(value)) {
                // Handle NaN specifically (NaN !== NaN, so we need explicit check)
                formData[fieldKey] = "NaN";
              } else if (value === Infinity || value === -Infinity) {
                // Handle Infinity specifically
                formData[fieldKey] = String(value);
              } else {
                formData[fieldKey] = String(value);
              }
            }
          } else {
            // Set default values for unmatched fields
            if (field.type === "checkbox") {
              formData[fieldKey] = [];
            } else {
              formData[fieldKey] = "";
            }
          }
        });

        reset(formData);
        // Trigger validation after reset
        setTimeout(() => {
          trigger();
        }, 0);
      } catch (error) {
        console.error("Error pre-filling form:", error);
        toast.error(
          "Some fields could not be loaded. Please check all fields carefully before submitting."
        );
        // Still reset form with empty defaults to prevent crash
        reset({});
      }
    }
  }, [initialData, formSchema.fields, reset, trigger, isEditMode]);

  const handleFormSubmit: SubmitHandler<FormData> = async (data) => {
    if (!address) {
      toast.error("Please connect your wallet to submit an application");
      return;
    }

    setSubmitting(true);
    try {
      // Always transform form data to use labels as keys (not field IDs)
      // This ensures payload always uses human-readable keys like "Project Name"
      // regardless of what the original key format was
      const transformedData: Record<string, any> = {};

      // Map all form field IDs to their current labels
      Object.entries(data).forEach(([formKey, value]) => {
        const label = fieldIdToLabelMapping[formKey] || formKey;
        transformedData[label] = value;
      });

      // When editing, preserve unmatched fields from initialData
      if (isEditMode && initialData && keyMapping) {
        const matchedKeys = new Set(Object.values(keyMapping));
        const formLabels = new Set(Object.values(fieldIdToLabelMapping));

        Object.entries(initialData).forEach(([key, value]) => {
          // Only preserve if:
          // 1. Not matched to any form field (truly unmatched)
          // 2. Not already in transformedData (not overwritten by form)
          // 3. Not a label that exists in current form (avoid duplicates)
          if (!matchedKeys.has(key) && !(key in transformedData) && !formLabels.has(key)) {
            transformedData[key] = value;
          }
        });
      }

      await onSubmit?.(transformedData);
      if (!isEditMode) {
        toast.success("Application submitted successfully!");
        reset();
      }
    } catch (error) {
      console.error("Error submitting application:", error);
      if (!isEditMode) {
        toast.error("Failed to submit application. Please try again.");
      }
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: any, index: number) => {
    const fieldName = field.label.toLowerCase().replace(/\s+/g, "_");
    // Use field.id if available, otherwise fall back to fieldName (consistent with validation schema)
    const fieldKey = (field.id || fieldName) as keyof FormData;
    const error = errors[fieldKey];
    const errorMessage = error?.message ? String(error.message) : error ? String(error) : "";

    switch (field.type) {
      case "textarea":
        return (
          <div key={index} className="flex w-full flex-col">
            <label htmlFor={fieldName} className={labelStyle}>
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <textarea
              id={fieldName}
              className={cn(
                inputStyle,
                "min-h-[100px] resize-y",
                error && "border-red-500 dark:border-red-500"
              )}
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              {...register(fieldKey)}
            />
            {error && <p className="text-sm text-red-400 mt-1">{errorMessage}</p>}
          </div>
        );

      case "select":
        return (
          <div key={index} className="flex w-full flex-col">
            <label htmlFor={fieldName} className={labelStyle}>
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <select
              id={fieldName}
              className={cn(inputStyle, error && "border-red-500 dark:border-red-500")}
              {...register(fieldKey)}
            >
              <option value="">Select an option</option>
              {field.options?.map((option: string, optIndex: number) => (
                <option key={optIndex} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {error && <p className="text-sm text-red-400 mt-1">{errorMessage}</p>}
          </div>
        );

      case "checkbox":
        return (
          <div key={index} className="flex w-full flex-col">
            <div className={labelStyle}>
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </div>
            <Controller
              name={fieldKey}
              control={control}
              render={({ field: { onChange, value } }) => (
                <div className="mt-2 space-y-2">
                  {field.options?.map((option: string, optIndex: number) => (
                    <label key={optIndex} className="flex items-center">
                      <input
                        type="checkbox"
                        value={option}
                        checked={Array.isArray(value) && value.includes(option)}
                        onChange={(e) => {
                          const currentValue = Array.isArray(value) ? value : [];
                          if (e.target.checked) {
                            onChange([...currentValue, option]);
                          } else {
                            onChange(currentValue.filter((v: string) => v !== option));
                          }
                        }}
                        className="mr-2 h-4 w-4 rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{option}</span>
                    </label>
                  ))}
                </div>
              )}
            />
            {error && <p className="text-sm text-red-400 mt-1">{errorMessage}</p>}
          </div>
        );

      case "radio":
        return (
          <div key={index} className="flex w-full flex-col">
            <div className={labelStyle}>
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </div>
            <div className="mt-2 space-y-2">
              {field.options?.map((option: string, optIndex: number) => (
                <label key={optIndex} className="flex items-center">
                  <input
                    type="radio"
                    value={option}
                    className="mr-2 h-4 w-4 border-gray-300"
                    {...register(fieldKey)}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{option}</span>
                </label>
              ))}
            </div>
            {error && <p className="text-sm text-red-400 mt-1">{errorMessage}</p>}
          </div>
        );

      case "number":
        return (
          <div key={index} className="flex w-full flex-col">
            <label htmlFor={fieldName} className={labelStyle}>
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <input
              type="number"
              id={fieldName}
              className={cn(inputStyle, error && "border-red-500 dark:border-red-500")}
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              {...register(fieldKey)}
            />
            {error && <p className="text-sm text-red-400 mt-1">{errorMessage}</p>}
          </div>
        );

      default:
        return (
          <div key={index} className="flex w-full flex-col">
            <label htmlFor={fieldName} className={labelStyle}>
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <input
              type={field.type === "email" ? "email" : field.type === "url" ? "url" : "text"}
              id={fieldName}
              className={cn(inputStyle, error && "border-red-500 dark:border-red-500")}
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              {...register(fieldKey)}
            />
            {error && <p className="text-sm text-red-400 mt-1">{errorMessage}</p>}
          </div>
        );
    }
  };

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Wallet Connection Required
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Please connect your wallet to submit a grant application.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{formSchema.title}</h2>
        {formSchema.description && (
          <p className="text-gray-600 dark:text-gray-400">{formSchema.description}</p>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {formSchema.fields.map((field, index) => renderField(field, index))}

        {/* Validation Error Summary */}
        {errorCount > 0 && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Please fix the following errors to continue
                </h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                  <p>
                    {errorCount === 1
                      ? "There is 1 validation error in the form."
                      : `There are ${errorCount} validation errors in the form.`}
                  </p>
                  <p className="mt-1">
                    Please review the fields marked in red above and correct any issues.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
          {onCancel && (
            <Button
              type="button"
              onClick={onCancel}
              variant="secondary"
              disabled={submitting || isLoading}
              className="px-6 py-2"
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            isLoading={submitting || isLoading}
            disabled={!isValid || submitting || isLoading}
            variant="primary"
            className="px-6 py-2"
          >
            {isEditMode ? "Update Application" : "Submit Application"}
          </Button>
        </div>
      </form>

      {/* Connected Wallet Info */}
      <div className="text-xs text-gray-500 dark:text-gray-400">Submitting as: {address}</div>
    </div>
  );
};

export default ApplicationSubmission;
