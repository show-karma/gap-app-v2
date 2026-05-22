"use client";

/**
 * HelpModal — "how to use" dialog for the non-profits agent.
 *
 * Ported from grant-atlas src/components/help-modal.tsx.
 * Voice Search removed (not implemented here); product name updated.
 */

import { Bookmark, Search, Sparkles, X } from "lucide-react";
import { useEffect, useRef } from "react";

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
}

const FEATURES = [
  {
    icon: Search,
    title: "Natural Language Search",
    description:
      "Ask questions in plain English about foundations, nonprofits, and grants. Results are pulled from IRS 990-PF filings.",
  },
  {
    icon: Sparkles,
    title: "AI Analysis",
    description:
      "Each search includes an AI-generated narrative that summarizes findings and highlights key insights.",
  },
  {
    icon: Bookmark,
    title: "Research Tray",
    description:
      "Bookmark entities to save them for later. Your bookmarks are saved to your account and persist across sessions.",
  },
];

export function HelpModal({ open, onClose }: HelpModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => onClose();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      className="m-auto w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-0 shadow-xl backdrop:bg-black/50 dark:border-zinc-700 dark:bg-zinc-900"
    >
      <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          How to use Grow Nonprofit
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close help"
          className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="px-6 py-5">
        <p className="mb-5 text-sm text-zinc-600 dark:text-zinc-400">
          Grow Nonprofit helps you explore U.S. philanthropy data using AI-powered search across IRS
          990-PF filings.
        </p>

        <div className="space-y-4">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="flex gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-950">
                <feature.icon className="size-4 text-brand-600 dark:text-brand-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {feature.title}
                </h3>
                <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-xl bg-zinc-50 px-4 py-3 dark:bg-zinc-800/50">
          <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Tips
          </h3>
          <ul className="mt-2 space-y-1.5 text-sm text-zinc-600 dark:text-zinc-400">
            <li>
              Try specific queries like &ldquo;foundations funding education in California&rdquo;
            </li>
            <li>Click any result to see detailed information</li>
            <li>Bookmark entities to build a prospect list</li>
            <li>Press Enter to search</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl bg-brand-500 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
        >
          Got it
        </button>
      </div>
    </dialog>
  );
}
