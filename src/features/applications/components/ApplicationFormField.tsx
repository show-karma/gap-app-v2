"use client";

import type { Control, FieldPath, UseFormTrigger } from "react-hook-form";
import { Controller } from "react-hook-form";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ApplicationQuestion } from "@/types/whitelabel-entities";
import type { ApplicationFormData } from "../types";
import { KarmaProfileLinkInput } from "./KarmaProfileLinkInput";
import { MilestoneFieldArray } from "./MilestoneFieldArray";

interface ApplicationFormFieldProps {
  question: ApplicationQuestion;
  control: Control<ApplicationFormData>;
  disabled?: boolean;
  trigger?: UseFormTrigger<ApplicationFormData>;
}

function FieldDescription({ source }: { source: string }) {
  if (!source) return null;
  return (
    <div className="text-xs text-zinc-500 dark:text-zinc-400 [&_p]:text-xs [&_p]:text-zinc-500 dark:[&_p]:text-zinc-400">
      <MarkdownPreview source={source} />
    </div>
  );
}

export function ApplicationFormField({
  question,
  control,
  disabled = false,
  trigger,
}: ApplicationFormFieldProps) {
  return (
    <Controller
      name={question.id as FieldPath<ApplicationFormData>}
      control={control}
      render={({ field, fieldState }) => {
        const error = fieldState.error?.message;

        switch (question.type) {
          case "text":
          case "url":
            return (
              <div className="flex flex-col gap-2" data-field-id={question.id}>
                <Label htmlFor={question.id}>
                  {question.label}
                  {question.required && <span className="text-destructive ml-0.5">*</span>}
                </Label>
                {question.description && (
                  <FieldDescription source={question.description as string} />
                )}
                <Input
                  {...field}
                  type={question.type}
                  placeholder={question.placeholder}
                  value={(field.value as string) || ""}
                  onChange={(e) => field.onChange(e.target.value)}
                  disabled={disabled}
                  id={question.id}
                  name={question.id}
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
            );

          case "email":
            return (
              <div className="flex flex-col gap-2" data-field-id={question.id}>
                <Label htmlFor={question.id}>
                  {question.label}
                  {question.required && <span className="text-destructive ml-0.5">*</span>}
                </Label>
                {question.description && (
                  <FieldDescription source={question.description as string} />
                )}
                <Input
                  {...field}
                  type="email"
                  placeholder={question.placeholder || "Enter your email address"}
                  value={(field.value as string) || ""}
                  onChange={(e) => field.onChange(e.target.value)}
                  disabled={disabled}
                  id={question.id}
                  name={question.id}
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
            );

          case "number":
            return (
              <div className="flex flex-col gap-2" data-field-id={question.id}>
                <Label htmlFor={question.id}>
                  {question.label}
                  {question.required && <span className="text-destructive ml-0.5">*</span>}
                </Label>
                {question.description && (
                  <FieldDescription source={question.description as string} />
                )}
                <Input
                  {...field}
                  type="number"
                  placeholder={question.placeholder}
                  value={
                    field.value !== undefined && field.value !== null ? String(field.value) : ""
                  }
                  onChange={(e) =>
                    field.onChange(e.target.value !== "" ? Number(e.target.value) : undefined)
                  }
                  disabled={disabled}
                  id={question.id}
                  name={question.id}
                  min={question.validation?.min}
                  max={question.validation?.max}
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
            );

          case "textarea":
            return (
              <div className="flex flex-col gap-2" data-field-id={question.id}>
                <MarkdownEditor
                  label={question.label}
                  placeholder={question.placeholder}
                  value={(field.value as string) || ""}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  isDisabled={disabled}
                  error={error}
                  description={question.description}
                  isRequired={question.required}
                  id={question.id}
                />
              </div>
            );

          case "select":
            return (
              <div className="w-full flex flex-col gap-2" data-field-id={question.id}>
                <Label htmlFor={question.id}>
                  {question.label}
                  {question.required && <span className="text-destructive ml-0.5">*</span>}
                </Label>
                {question.description && (
                  <FieldDescription source={question.description as string} />
                )}
                <select
                  id={question.id}
                  name={question.id}
                  value={(field.value as string) || ""}
                  onChange={(e) => field.onChange(e.target.value)}
                  disabled={disabled}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">{question.placeholder || "Select an option"}</option>
                  {question.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
            );

          case "multiselect":
            return (
              <div className="w-full flex flex-col gap-2" data-field-id={question.id}>
                <Label>
                  {question.label}
                  {question.required && <span className="text-destructive ml-0.5">*</span>}
                </Label>
                {question.description && (
                  <FieldDescription source={question.description as string} />
                )}
                <div className="space-y-2 rounded-md border border-input p-3">
                  {question.options?.map((option) => {
                    const values = (field.value as string[]) || [];
                    const isChecked = values.includes(option.value);
                    return (
                      <div key={option.value} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          id={`${question.id}-${option.value}`}
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            const current = (field.value as string[]) || [];
                            if (checked) {
                              field.onChange([...current, option.value]);
                            } else {
                              field.onChange(current.filter((v) => v !== option.value));
                            }
                          }}
                          disabled={disabled}
                        />
                        <label
                          htmlFor={`${question.id}-${option.value}`}
                          className="text-sm cursor-pointer"
                        >
                          {option.label}
                        </label>
                      </div>
                    );
                  })}
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
            );

          case "date":
            return (
              <div className="flex flex-col gap-2" data-field-id={question.id}>
                <Label htmlFor={question.id}>
                  {question.label}
                  {question.required && <span className="text-destructive ml-0.5">*</span>}
                </Label>
                {question.description && (
                  <FieldDescription source={question.description as string} />
                )}
                <Input
                  {...field}
                  type="date"
                  placeholder={question.placeholder}
                  value={(field.value as string) || ""}
                  onChange={(e) => field.onChange(e.target.value)}
                  disabled={disabled}
                  id={question.id}
                  name={question.id}
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
            );

          case "milestone":
            return (
              <MilestoneFieldArray
                control={control}
                name={question.id}
                question={question}
                disabled={disabled}
                trigger={trigger}
              />
            );

          case "karma_profile_link":
            return (
              <KarmaProfileLinkInput
                control={control}
                name={question.id}
                question={question}
                disabled={disabled}
              />
            );

          case "checkbox":
            return (
              <div className="flex items-center gap-2" data-field-id={question.id}>
                <Checkbox
                  checked={!!field.value}
                  onCheckedChange={(checked) => field.onChange(checked)}
                  disabled={disabled}
                  id={question.id}
                />
                <Label htmlFor={question.id} className="cursor-pointer">
                  {question.label}
                  {question.required && <span className="text-destructive ml-0.5">*</span>}
                </Label>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
            );

          case "radio":
            return (
              <div className="flex flex-col gap-2" data-field-id={question.id}>
                <Label>
                  {question.label}
                  {question.required && <span className="text-destructive ml-0.5">*</span>}
                </Label>
                {question.description && (
                  <FieldDescription source={question.description as string} />
                )}
                <div className="space-y-2">
                  {question.options?.map((option) => (
                    <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={question.id}
                        value={option.value}
                        checked={field.value === option.value}
                        onChange={() => field.onChange(option.value)}
                        disabled={disabled}
                        className="h-4 w-4 text-primary"
                      />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
            );

          default:
            return <div />;
        }
      }}
    />
  );
}
