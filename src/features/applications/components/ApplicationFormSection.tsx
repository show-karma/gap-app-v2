"use client";

import type { Control, UseFormTrigger } from "react-hook-form";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import type { ApplicationQuestion } from "@/types/whitelabel-entities";
import type { ApplicationFormData } from "../types";
import { ApplicationFormField } from "./ApplicationFormField";

interface ApplicationFormSectionProps {
  title?: string;
  description?: string;
  questions: ApplicationQuestion[];
  control: Control<ApplicationFormData>;
  disabled?: boolean;
  trigger?: UseFormTrigger<ApplicationFormData>;
}

export function ApplicationFormSection({
  title,
  description,
  questions,
  control,
  disabled,
  trigger,
}: ApplicationFormSectionProps) {
  if (questions.length === 0) {
    return null;
  }

  const content = (
    <div className="space-y-6">
      {questions.map((question) => (
        <ApplicationFormField
          key={question.id}
          question={question}
          control={control}
          disabled={disabled}
          trigger={trigger}
        />
      ))}
    </div>
  );

  if (!title && !description) {
    return content;
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      {(title || description) && (
        <div className="flex flex-col gap-1 mb-6">
          {title && <h3 className="text-xl font-semibold">{title}</h3>}
          {description && <MarkdownPreview source={description} />}
        </div>
      )}
      {content}
    </div>
  );
}
