"use client";

import { Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const MAX_TITLE_LENGTH = 200;

interface Props {
  title: string;
  saving: boolean;
  onRename: (title: string) => void;
}

export function PanelTitle({ title, saving, onRename }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);

  useEffect(() => {
    if (!editing) setDraft(title);
  }, [title, editing]);

  const commit = () => {
    const next = draft.trim();
    setEditing(false);
    if (next.length === 0 || next === title) return;
    onRename(next);
  };

  if (editing) {
    return (
      <Input
        autoFocus
        aria-label="Panel title"
        value={draft}
        maxLength={MAX_TITLE_LENGTH}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit();
          if (event.key === "Escape") {
            setDraft(title);
            setEditing(false);
          }
        }}
        className="h-7 w-64 text-sm"
      />
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={saving}
      onClick={() => setEditing(true)}
      aria-label="Rename panel"
      className="group flex min-w-0 items-center gap-2 px-1"
    >
      <span
        className="truncate font-semibold text-sm tracking-tight"
        style={{ color: "var(--kp-ink)" }}
      >
        {title}
      </span>
      <Pencil
        className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
        style={{ color: "var(--kp-ink-faint)" }}
        aria-hidden
      />
    </Button>
  );
}
