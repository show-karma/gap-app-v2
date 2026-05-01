"use client";

import { Loader2, Save } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCreateTemplate } from "../hooks/useTemplates";
import type { SessionResponse } from "../schemas/session.schema";
import { TEMPLATE_NAME_MAX, templateCreateSchema } from "../schemas/template.schema";

interface TemplateSavePanelProps {
  session: SessionResponse;
}

const inputClass =
  "mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-500";

export function TemplateSavePanel({ session }: TemplateSavePanelProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createTemplate = useCreateTemplate();

  const handleSave = async () => {
    const parsed = templateCreateSchema.safeParse({
      name,
      programDescription: session.programDescription,
      evaluationCriteria: session.evaluationCriteria,
      evaluationStyle: session.evaluationStyle,
      feedbackInstructions: session.feedbackHistory,
    });
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? "Invalid template");
      return;
    }
    setError(null);
    try {
      await createTemplate.mutateAsync(parsed.data);
      setOpen(false);
      setName("");
    } catch {
      // toast handled in hook
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        disabled={createTemplate.isPending}
      >
        <Save className="h-4 w-4" /> Save as template
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-background">
          <DialogHeader>
            <DialogTitle>Save evaluation template</DialogTitle>
            <DialogDescription>
              Reuse this configuration (program, criteria, style, and feedback iterations) for
              future sessions.
            </DialogDescription>
          </DialogHeader>
          <div>
            <label htmlFor="template-name" className="text-sm font-medium text-foreground">
              Template name
            </label>
            <input
              id="template-name"
              className={inputClass}
              maxLength={TEMPLATE_NAME_MAX}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Optimism public goods rubric v1"
              disabled={createTemplate.isPending}
            />
            <p className="mt-1 text-xs text-red-500">{error}</p>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={createTemplate.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={createTemplate.isPending || name.trim().length < 2}
            >
              {createTemplate.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving
                </>
              ) : (
                "Save template"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
