"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { FileBadge, FileText, Globe, Info, ShieldCheck, X } from "lucide-react";
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
  Icon: ComponentType<{
    className?: string;
    "aria-hidden"?: boolean;
    strokeWidth?: number;
  }>;
  blurb: string;
  fg: string;
}

// Note: `sitemap` and `gdrive_folder` are intentionally hidden — they remain
// in the type union and on the backend, see
// docs/features/rag-filecoin-knowledge-base.md for the deferral rationale and
// the re-enable plan.
const KIND_OPTIONS: KindOption[] = [
  {
    kind: "gdrive_file",
    Icon: FileText,
    blurb: "A publicly-shared Google Doc",
    fg: "text-emerald-600 dark:text-emerald-400",
  },
  {
    kind: "url",
    Icon: Globe,
    blurb: "Any publicly-accessible web page",
    fg: "text-sky-600 dark:text-sky-400",
  },
  {
    kind: "pdf_url",
    Icon: FileBadge,
    blurb: "A PDF served from a public URL",
    fg: "text-rose-600 dark:text-rose-400",
  },
];

const PLACEHOLDER_BY_KIND: Partial<Record<KnowledgeSourceKind, string>> = {
  gdrive_file: "https://docs.google.com/document/d/<doc-id>/edit",
  url: "https://docs.example.com/intro",
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
        <Dialog.Overlay className="fixed inset-0 z-50 bg-stone-950/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0 dark:bg-black/60" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-50 flex max-h-[92vh] w-[min(560px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl outline-none dark:border-zinc-800 dark:bg-zinc-950 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          {/* Header — single-line title, matches design density */}
          <div className="flex items-center gap-3 border-b border-stone-200 px-5 py-4 dark:border-zinc-800">
            <Dialog.Title className="text-[15px] font-semibold tracking-[-0.01em] text-stone-900 dark:text-zinc-100">
              Add a knowledge source
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="ml-auto rounded-md p-1.5 text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>

          {/* Body — scrolls when content overflows */}
          <div className="flex-1 overflow-y-auto px-5 py-[18px]">
            {/* Kind picker */}
            <fieldset>
              <legend className="mb-1.5 block text-xs font-medium text-stone-600 dark:text-zinc-400">
                Source type
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

            {/* Form fields */}
            <div className="mt-4 space-y-3.5">
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
                  className="h-9 w-full rounded-md border border-stone-300 bg-white px-3 text-[13px] text-stone-900 placeholder-stone-400 transition focus:border-sky-500 focus:outline-none focus:ring-[3px] focus:ring-sky-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-sky-400 dark:focus:ring-sky-400/20"
                />
              </FormField>

              <FormField
                label={
                  kind === "gdrive_file"
                    ? "Google Doc URL or ID"
                    : kind === "pdf_url"
                      ? "PDF URL"
                      : "Web page URL"
                }
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
                  className="h-9 w-full rounded-md border border-stone-300 bg-white px-3 font-mono text-[12.5px] text-stone-900 placeholder-stone-400 transition focus:border-sky-500 focus:outline-none focus:ring-[3px] focus:ring-sky-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-600 dark:focus:border-sky-400 dark:focus:ring-sky-400/20"
                />
              </FormField>
            </div>

            <PublicAccessReminder kind={kind} />
            <OneSourceAtATimeNote />
          </div>

          {/* Footer — right-aligned button cluster, matches `.modal-foot` */}
          <div className="flex items-center justify-end gap-2 border-t border-stone-200 px-5 py-3 dark:border-zinc-800">
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
  const { Icon, kind, blurb, fg } = option;
  return (
    // biome-ignore lint/a11y/useSemanticElements: native radio inputs can't host the rich card layout (icon, label, blurb); the button + role="radio" pattern is the documented Radix-style alternative
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`group flex items-center gap-2.5 rounded-md border px-3 py-2.5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 dark:focus-visible:ring-sky-400/40 ${
        selected
          ? "border-sky-500 bg-sky-50 dark:border-sky-400 dark:bg-sky-950/30"
          : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-900/80"
      }`}
    >
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-stone-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
        aria-hidden="true"
      >
        <Icon className={`h-3.5 w-3.5 ${fg}`} strokeWidth={1.75} />
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-stone-900 dark:text-zinc-100">
          {KNOWLEDGE_SOURCE_KIND_LABELS[kind]}
        </p>
        <p className="text-[11.5px] leading-snug text-stone-500 dark:text-zinc-500">{blurb}</p>
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
  return (
    <div className="mt-4 flex items-start gap-2 rounded-md border border-stone-200 bg-stone-50 px-2.5 py-2 dark:border-zinc-800 dark:bg-zinc-900/60">
      <ShieldCheck
        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-500 dark:text-zinc-500"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1 text-[12px] leading-relaxed text-stone-600 dark:text-zinc-400">
        {kind === "gdrive_file" ? (
          <p>
            <strong className="font-semibold text-stone-800 dark:text-zinc-200">
              Source must be publicly accessible.
            </strong>{" "}
            In the Google Doc, click <em>Share</em> and set access to{" "}
            <strong className="font-semibold text-stone-800 dark:text-zinc-200">
              Anyone with the link — Viewer
            </strong>
            . Karma fetches the doc through its public export URL — no Drive credentials needed.
          </p>
        ) : kind === "url" ? (
          <p>
            <strong className="font-semibold text-stone-800 dark:text-zinc-200">
              Source must be publicly accessible.
            </strong>{" "}
            The page must load without a sign-in wall, paywall, or required cookies. Karma converts
            the page&apos;s HTML to markdown — pages that render content via JavaScript only may
            return empty.
          </p>
        ) : (
          <p>
            <strong className="font-semibold text-stone-800 dark:text-zinc-200">
              Source must be publicly accessible.
            </strong>{" "}
            The PDF URL must be reachable without authentication or session cookies — if it&apos;s
            behind a sign-in wall the fetch will fail.
          </p>
        )}
      </div>
    </div>
  );
}

// ── One-source-at-a-time note ───────────────────────────────────────────────
//
// Sets expectations so admins don't paste a curated "table of contents" doc
// expecting Karma to crawl every link inside. Each source is fetched and
// indexed independently — links inside a doc are preserved verbatim but never
// followed.

function OneSourceAtATimeNote() {
  return (
    <div className="mt-2 flex items-start gap-2 rounded-md border border-stone-200 bg-stone-50 px-2.5 py-2 dark:border-zinc-800 dark:bg-zinc-900/60">
      <Info
        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-500 dark:text-zinc-500"
        aria-hidden="true"
      />
      <p className="min-w-0 flex-1 text-[12px] leading-relaxed text-stone-600 dark:text-zinc-400">
        Only this source&apos;s content is ingested.{" "}
        <strong className="font-semibold text-stone-800 dark:text-zinc-200">
          Links inside it are not followed
        </strong>{" "}
        — register them separately if you want them included.
      </p>
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
        className="mb-1.5 block text-xs font-medium text-stone-600 dark:text-zinc-400"
      >
        {label}
      </label>
      {children}
      <p className="mt-1.5 text-xs leading-relaxed text-stone-500 dark:text-zinc-500">{hint}</p>
    </div>
  );
}
