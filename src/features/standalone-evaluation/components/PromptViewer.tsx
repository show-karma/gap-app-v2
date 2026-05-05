"use client";

import { ChevronDown, ChevronUp, Copy, Loader2, Pencil, X } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { cn } from "@/utilities/tailwind";
import { useUpdatePrompt } from "../hooks/useEvaluationRun";
import type { SessionResponse } from "../schemas/session.schema";

interface PromptViewerProps {
  session: SessionResponse;
}

const PROMPT_MAX = 50_000;
const PROMPT_MIN = 20;

export function PromptViewer({ session }: PromptViewerProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(session.currentPrompt);
  const updatePrompt = useUpdatePrompt();
  const [, copy] = useCopyToClipboard();

  // Reset the draft whenever the session's currentPrompt changes from the BE
  // (e.g. after a feedback iteration appends to it). Don't clobber an
  // in-flight edit, though.
  useEffect(() => {
    if (!editing) setDraft(session.currentPrompt);
  }, [session.currentPrompt, editing]);

  const handleCopy = () => {
    void copy(session.currentPrompt, "Prompt copied");
  };

  const handleSave = async () => {
    const trimmed = draft.trim();
    if (trimmed.length < PROMPT_MIN) {
      toast.error(`Prompt must be at least ${PROMPT_MIN} characters`);
      return;
    }
    if (trimmed.length > PROMPT_MAX) {
      toast.error(`Prompt must be at most ${PROMPT_MAX} characters`);
      return;
    }
    try {
      await updatePrompt.mutateAsync({ sessionId: session.id, prompt: trimmed });
      setEditing(false);
    } catch {
      // toast handled in the mutation onError
    }
  };

  const handleCancel = () => {
    setDraft(session.currentPrompt);
    setEditing(false);
  };

  const feedbackCount = session.feedbackHistory.length;

  return (
    <section className="rounded-xl border border-border bg-background">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left"
        aria-expanded={open}
      >
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          System prompt
        </span>
        <span className="text-xs text-muted-foreground">
          {session.currentPrompt.length.toLocaleString()} chars
          {feedbackCount > 0
            ? ` · ${feedbackCount} feedback ${feedbackCount === 1 ? "line" : "lines"} appended`
            : ""}
        </span>
        <span className="ml-auto text-muted-foreground">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {open ? (
        <div className="border-t border-border p-4">
          {editing ? (
            <>
              <textarea
                aria-label="System prompt"
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, PROMPT_MAX))}
                disabled={updatePrompt.isPending}
                className={cn(
                  "h-72 w-full resize-y rounded-md border border-border bg-background p-3 font-mono text-[12px] leading-relaxed text-foreground",
                  "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                )}
              />
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                <p className="text-yellow-700 dark:text-yellow-300">
                  Saving overwrites the prompt and clears the feedback history. Future feedback
                  restarts from this baseline.
                </p>
                <span className="ml-auto tabular-nums text-muted-foreground">
                  {draft.length.toLocaleString()}/{PROMPT_MAX.toLocaleString()}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={updatePrompt.isPending || draft.trim().length < PROMPT_MIN}
                >
                  {updatePrompt.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Saving
                    </>
                  ) : (
                    "Save prompt"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={updatePrompt.isPending}
                >
                  <X className="h-4 w-4" /> Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-3 font-mono text-[12px] leading-relaxed text-foreground">
                {session.currentPrompt}
              </pre>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
                  <Pencil className="h-3.5 w-3.5" /> Edit prompt
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
                  <Copy className="h-3.5 w-3.5" /> Copy
                </Button>
              </div>
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}
