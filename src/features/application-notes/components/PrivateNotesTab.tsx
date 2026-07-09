"use client";

import { AlertCircle, Lock, RefreshCw, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useApplicationNote } from "../hooks/use-application-note";

interface PrivateNotesTabProps {
  referenceNumber: string;
  /** Resolved reviewer/admin flag. Fails closed — false hides the notes entirely. */
  canViewNotes: boolean;
}

const MAX_NOTE_LENGTH = 10000;

function formatEditor(name: string | null | undefined, address: string): string {
  if (name) return name;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * DEV-515 — reviewer/admin-only private note on a funding application.
 * The permission gate is the ONE allowed `return null` (not a data state).
 * It lives in this wrapper so no hook runs for a non-reviewer.
 */
export function PrivateNotesTab({ referenceNumber, canViewNotes }: PrivateNotesTabProps) {
  if (!canViewNotes) {
    return null;
  }

  return <PrivateNotesTabContent referenceNumber={referenceNumber} />;
}

function PrivateNotesTabContent({ referenceNumber }: { referenceNumber: string }) {
  const { note, isLoading, error, saveNote, isSaving, refetch } = useApplicationNote({
    referenceNumber,
    canViewNotes: true,
  });

  const [draft, setDraft] = useState("");
  const [initialized, setInitialized] = useState(false);

  // Seed the editor once from the loaded note (or empty when none exists yet).
  // Not re-seeded on every render so an in-progress draft is never clobbered.
  useEffect(() => {
    if (!initialized && !isLoading) {
      setDraft(note?.content ?? "");
      setInitialized(true);
    }
  }, [initialized, isLoading, note]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Spinner data-testid="notes-loading-spinner" className="size-6" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              <span>Failed to load note: {error.message}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isDirty = draft !== (note?.content ?? "");

  const handleSave = async () => {
    if (!isDirty || isSaving) return;
    await saveNote(draft);
  };

  return (
    <section className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <Lock className="h-5 w-5 text-muted-foreground" />
        <div>
          <h2 className="text-base font-semibold text-foreground">Private notes</h2>
          <p className="text-[13px] text-muted-foreground">
            Visible only to reviewers and admins of this community.
          </p>
        </div>
      </div>

      <div className="space-y-3 px-5 py-4">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a private note visible only to reviewers…"
          rows={8}
          maxLength={MAX_NOTE_LENGTH}
          disabled={isSaving}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[12.5px] text-muted-foreground">
            {note
              ? `Last edited by ${formatEditor(
                  note.updatedByName,
                  note.updatedByAddress
                )} · ${new Date(note.updatedAt).toLocaleString()}`
              : "No note yet."}
          </p>
          <Button size="sm" onClick={handleSave} disabled={!isDirty || isSaving}>
            {isSaving ? <Spinner className="size-4" /> : <Save className="w-4 h-4" />}
            Save
          </Button>
        </div>
      </div>
    </section>
  );
}
