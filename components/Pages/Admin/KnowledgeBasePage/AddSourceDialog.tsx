"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Check, FileBadge, FileText, ShieldCheck, X } from "lucide-react";
import { type ComponentType, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/Utilities/Button";
import { useCreateKnowledgeSource } from "@/hooks/knowledge-base/useKnowledgeSourceMutations";
import {
  KNOWLEDGE_SOURCE_KIND_HINTS,
  KNOWLEDGE_SOURCE_KIND_LABELS,
  type KnowledgeSourceKind,
} from "@/types/v2/knowledge-base";

interface Props {
  communityIdOrSlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface KindOption {
  kind: KnowledgeSourceKind;
  Icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  blurb: string;
  bg: string;
  fg: string;
  ring: string;
}

// Note: only the kinds we actively support today are exposed in the UI.
// `url`, `sitemap`, and `gdrive_folder` are intentionally hidden — they remain
// in the type union and on the backend, see
// docs/features/rag-filecoin-knowledge-base.md for the deferral rationale and
// the re-enable plan.
const KIND_OPTIONS: KindOption[] = [
  {
    kind: "gdrive_file",
    Icon: FileText,
    blurb: "A publicly-shared Google Doc",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    fg: "text-emerald-700 dark:text-emerald-300",
    ring: "ring-emerald-500/40 dark:ring-emerald-400/40",
  },
  {
    kind: "pdf_url",
    Icon: FileBadge,
    blurb: "A PDF served from a public URL",
    bg: "bg-rose-50 dark:bg-rose-950/30",
    fg: "text-rose-700 dark:text-rose-300",
    ring: "ring-rose-500/40 dark:ring-rose-400/40",
  },
];

const PLACEHOLDER_BY_KIND: Partial<Record<KnowledgeSourceKind, string>> = {
  gdrive_file: "https://docs.google.com/document/d/<doc-id>/edit",
  pdf_url: "https://example.com/whitepaper.pdf",
};

const DEFAULT_KIND: KnowledgeSourceKind = "gdrive_file";

export function AddSourceDialog({ communityIdOrSlug, open, onOpenChange }: Props) {
  const [kind, setKind] = useState<KnowledgeSourceKind>(DEFAULT_KIND);
  const [externalId, setExternalId] = useState("");
  const [title, setTitle] = useState("");
  const create = useCreateKnowledgeSource(communityIdOrSlug);

  // Reset form when the dialog closes so a re-open starts fresh.
  useEffect(() => {
    if (!open) {
      setKind(DEFAULT_KIND);
      setExternalId("");
      setTitle("");
    }
  }, [open]);

  const canSubmit = externalId.trim().length > 0 && title.trim().length > 0 && !create.isPending;

  const handleSubmit = async () => {
    if (!externalId.trim() || !title.trim()) {
      toast.error("Fill in both the URL/ID and the title.");
      return;
    }
    try {
      await create.mutateAsync({
        kind,
        externalId: externalId.trim(),
        title: title.trim(),
      });
      toast.success("Knowledge source added.");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add source.");
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-stone-950/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-50 flex max-h-[92vh] w-[min(640px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl outline-none dark:border-zinc-800 dark:bg-zinc-950 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-stone-200 px-6 py-5 dark:border-zinc-800">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-zinc-500">
                New entry
              </p>
              <Dialog.Title className="mt-1 text-xl font-semibold tracking-tight text-stone-900 dark:text-zinc-100">
                Register a knowledge source
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="rounded-md p-1.5 text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>

          {/* Body — scrolls when content overflows */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {/* Kind picker */}
            <fieldset>
              <legend className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500 dark:text-zinc-500">
                Choose a kind
              </legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {KIND_OPTIONS.map((opt) => (
                  <KindCard
                    key={opt.kind}
                    option={opt}
                    selected={kind === opt.kind}
                    onSelect={() => setKind(opt.kind)}
                  />
                ))}
              </div>
            </fieldset>

            <PublicAccessReminder kind={kind} />

            {/* Form fields */}
            <div className="mt-6 space-y-4">
              <FormField
                label="Title"
                hint="Shown in the admin list and as the citation label in chat replies."
                htmlFor="kb-title"
              >
                <input
                  id="kb-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Filecoin community docs"
                  maxLength={200}
                  className="h-10 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm text-stone-900 placeholder-stone-400 transition focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300/60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-600 dark:focus:ring-zinc-700/60"
                />
              </FormField>

              <FormField
                label={kind === "gdrive_file" ? "Google Doc URL or ID" : "PDF URL"}
                hint={KNOWLEDGE_SOURCE_KIND_HINTS[kind] ?? "Provide a publicly-accessible URL."}
                htmlFor="kb-external"
              >
                <input
                  id="kb-external"
                  type="text"
                  value={externalId}
                  onChange={(e) => setExternalId(e.target.value)}
                  placeholder={PLACEHOLDER_BY_KIND[kind] ?? ""}
                  maxLength={2048}
                  spellCheck={false}
                  className="h-10 w-full rounded-lg border border-stone-200 bg-white px-3 font-mono text-[13px] text-stone-900 placeholder-stone-400 transition focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300/60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-600 dark:focus:border-zinc-600 dark:focus:ring-zinc-700/60"
                />
              </FormField>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 border-t border-stone-200 bg-stone-50/70 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-xs text-stone-500 dark:text-zinc-500">
              The first sync runs on the next worker tick (typically within an hour).
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={() => onOpenChange(false)}
                className="bg-transparent text-stone-700 hover:bg-stone-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
                {create.isPending ? "Adding…" : "Add source"}
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ── Kind card ────────────────────────────────────────────────────────────────

function KindCard({
  option,
  selected,
  onSelect,
}: {
  option: KindOption;
  selected: boolean;
  onSelect: () => void;
}) {
  const { Icon, kind, blurb, bg, fg, ring } = option;
  return (
    // biome-ignore lint/a11y/useSemanticElements: native radio inputs can't host the rich card layout (icon, label, blurb, check); the button + role="radio" pattern is the documented Radix-style alternative
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`group relative flex flex-col items-start gap-2 rounded-xl border bg-white p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-offset-1 dark:bg-zinc-900 ${
        selected
          ? `border-stone-900 ring-2 ${ring} dark:border-zinc-100`
          : "border-stone-200 hover:border-stone-300 dark:border-zinc-800 dark:hover:border-zinc-700"
      }`}
    >
      <div className="flex w-full items-center justify-between">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${bg}`}
          aria-hidden="true"
        >
          <Icon className={`h-4 w-4 ${fg}`} />
        </div>
        {selected && (
          <span
            aria-hidden="true"
            className="flex h-5 w-5 items-center justify-center rounded-full bg-stone-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            <Check className="h-3 w-3" />
          </span>
        )}
      </div>
      <div>
        <p className="text-sm font-semibold text-stone-900 dark:text-zinc-100">
          {KNOWLEDGE_SOURCE_KIND_LABELS[kind]}
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-stone-500 dark:text-zinc-500">{blurb}</p>
      </div>
    </button>
  );
}

// ── Public-access reminder ──────────────────────────────────────────────────
//
// Karma fetches Google Docs through their public export URL and PDFs via
// plain HTTP — both paths require the source to be readable without auth.
// This callout sets that expectation so admins don't get a confusing "could
// not load" error after registering a private doc.

function PublicAccessReminder({ kind }: { kind: KnowledgeSourceKind }) {
  const isDoc = kind === "gdrive_file";
  return (
    <div className="mt-5 flex items-start gap-3 rounded-xl border border-stone-200 bg-stone-50/80 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/60">
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1 text-xs leading-relaxed text-stone-700 dark:text-zinc-300">
        <p className="font-semibold text-stone-900 dark:text-zinc-100">
          Source must be publicly accessible
        </p>
        {isDoc ? (
          <p className="mt-0.5">
            Open the Google Doc, click <em>Share</em>, and set link access to{" "}
            <strong>“Anyone with the link — Viewer”</strong>. Karma fetches the doc through its
            public export URL — no Drive credentials needed.
          </p>
        ) : (
          <p className="mt-0.5">
            The PDF URL must be reachable without authentication or session cookies. If it&apos;s
            behind a sign-in wall the fetch will fail.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Form field ──────────────────────────────────────────────────────────────

function FormField({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-[12px] font-semibold text-stone-700 dark:text-zinc-300"
      >
        {label}
      </label>
      {children}
      <p className="mt-1.5 text-[11px] leading-relaxed text-stone-500 dark:text-zinc-500">{hint}</p>
    </div>
  );
}
