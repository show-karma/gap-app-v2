"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/Utilities/Button";
import { useCreateKnowledgeSource } from "@/hooks/knowledge-base/useKnowledgeSourceMutations";
import {
  KNOWLEDGE_SOURCE_KIND_HINTS,
  KNOWLEDGE_SOURCE_KIND_LABELS,
  type KnowledgeSourceKind,
} from "@/types/v2/knowledge-base";

const KINDS: KnowledgeSourceKind[] = ["url", "sitemap", "gdrive_file", "gdrive_folder", "pdf_url"];

interface Props {
  communityIdOrSlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SERVICE_ACCOUNT_ENV_HINT =
  "For Drive sources, share the file/folder with your service account email (set via GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 on the indexer).";

export function AddSourceDialog({ communityIdOrSlug, open, onOpenChange }: Props) {
  const [kind, setKind] = useState<KnowledgeSourceKind>("url");
  const [externalId, setExternalId] = useState("");
  const [title, setTitle] = useState("");
  const create = useCreateKnowledgeSource(communityIdOrSlug);

  const reset = () => {
    setKind("url");
    setExternalId("");
    setTitle("");
  };

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
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add source.");
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold">Add knowledge source</Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-4 space-y-4">
            <label className="block text-sm">
              <span className="font-medium">Kind</span>
              <select
                className="mt-1 block w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                value={kind}
                onChange={(e) => setKind(e.target.value as KnowledgeSourceKind)}
              >
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {KNOWLEDGE_SOURCE_KIND_LABELS[k]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="font-medium">Title</span>
              <input
                className="mt-1 block w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Filecoin community docs"
                maxLength={200}
              />
            </label>

            <label className="block text-sm">
              <span className="font-medium">URL or ID</span>
              <input
                className="mt-1 block w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                value={externalId}
                onChange={(e) => setExternalId(e.target.value)}
                placeholder="https://docs.example.com/intro"
                maxLength={2048}
              />
              <p className="mt-1 text-xs text-zinc-500">{KNOWLEDGE_SOURCE_KIND_HINTS[kind]}</p>
            </label>

            {(kind === "gdrive_file" || kind === "gdrive_folder") && (
              <p className="rounded bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
                {SERVICE_ACCOUNT_ENV_HINT}
              </p>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              className="bg-zinc-200 text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600"
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={create.isPending}>
              {create.isPending ? "Adding…" : "Add source"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
