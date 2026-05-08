"use client";

import { Loader2, Sparkles, Trash2 } from "lucide-react";
import React, { useState } from "react";
import { DeleteDialog } from "@/components/DeleteDialog";
import { useBuiltInTemplates, useDeleteTemplate, useTemplates } from "../hooks/useTemplates";
import type { EvaluationStyle } from "../schemas/session.schema";
import type { BuiltInTemplate, TemplateResponse } from "../schemas/template.schema";

interface SelectedTemplateShape {
  programDescription: string;
  evaluationCriteria: string;
  evaluationStyle: EvaluationStyle;
}

interface TemplatePickerProps {
  onSelect: (tpl: SelectedTemplateShape) => void;
}

const cardClass =
  "flex w-full flex-col items-start gap-1 rounded-lg border border-border bg-background p-3 text-left transition-colors hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10";

interface TemplateCardProps {
  title: string;
  subtitle: string;
  description?: string;
  onSelect: () => void;
  onDelete?: () => Promise<void>;
  isDeleting?: boolean;
}

const TemplateCard = React.memo(function TemplateCard({
  title,
  subtitle,
  description,
  onSelect,
  onDelete,
  isDeleting,
}: TemplateCardProps) {
  return (
    <div className="relative">
      <button type="button" onClick={onSelect} className={cardClass}>
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Sparkles className="h-3.5 w-3.5 text-brand-500" /> {title}
        </span>
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{subtitle}</span>
        {description ? (
          <span className="text-xs text-muted-foreground line-clamp-2">{description}</span>
        ) : null}
      </button>
      {onDelete ? (
        <div className="absolute right-2 top-2">
          <DeleteDialog
            title={`Delete this template?`}
            deleteFunction={onDelete}
            isLoading={Boolean(isDeleting)}
            buttonElement={{
              icon: <Trash2 className="h-3.5 w-3.5 text-red-500" />,
              text: "",
              styleClass: "border-none p-1 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md",
            }}
          />
        </div>
      ) : null}
    </div>
  );
});

export function TemplatePicker({ onSelect }: TemplatePickerProps) {
  const builtIns = useBuiltInTemplates();
  const userTemplates = useTemplates();
  const deleteTemplate = useDeleteTemplate();

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setPendingDeleteId(id);
    try {
      await deleteTemplate.mutateAsync(id);
    } finally {
      setPendingDeleteId(null);
    }
  };

  return (
    <div className="space-y-4">
      <section aria-label="Your templates">
        <h3 className="mb-2 text-sm font-semibold text-foreground">Your templates</h3>
        {userTemplates.isLoading ? (
          <div className="flex items-center gap-2 rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading templates…
          </div>
        ) : userTemplates.isError ? (
          <div className="flex items-center justify-between gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            <span>Couldn’t load templates: {userTemplates.error.message}</span>
            <button
              type="button"
              className="font-medium underline"
              onClick={() => userTemplates.refetch()}
            >
              Retry
            </button>
          </div>
        ) : (userTemplates.data?.length ?? 0) === 0 ? (
          <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
            You haven’t saved any templates yet. After iterating on a session, save it as a template
            to reuse later.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(userTemplates.data ?? []).map((tpl: TemplateResponse) => (
              <TemplateCard
                key={tpl.id}
                title={tpl.name}
                subtitle={tpl.evaluationStyle}
                description={tpl.programDescription}
                onSelect={() =>
                  onSelect({
                    programDescription: tpl.programDescription,
                    evaluationCriteria: tpl.evaluationCriteria,
                    evaluationStyle: tpl.evaluationStyle,
                  })
                }
                onDelete={() => handleDelete(tpl.id)}
                isDeleting={pendingDeleteId === tpl.id}
              />
            ))}
          </div>
        )}
      </section>

      <section aria-label="Starter templates">
        <h3 className="mb-2 text-sm font-semibold text-foreground">Starter templates</h3>
        {builtIns.isLoading ? (
          <div className="flex items-center gap-2 rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading starters…
          </div>
        ) : builtIns.isError ? (
          <div className="flex items-center justify-between gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            <span>Couldn’t load starters: {builtIns.error.message}</span>
            <button
              type="button"
              className="font-medium underline"
              onClick={() => builtIns.refetch()}
            >
              Retry
            </button>
          </div>
        ) : (builtIns.data?.length ?? 0) === 0 ? (
          <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
            No starter templates available right now.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(builtIns.data ?? []).map((tpl: BuiltInTemplate) => (
              <TemplateCard
                key={tpl.id}
                title={tpl.name}
                subtitle={tpl.evaluationStyle}
                description={tpl.description}
                onSelect={() =>
                  onSelect({
                    programDescription: tpl.programDescription,
                    evaluationCriteria: tpl.evaluationCriteria,
                    evaluationStyle: tpl.evaluationStyle,
                  })
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
