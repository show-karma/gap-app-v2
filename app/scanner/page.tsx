import type { Metadata } from "next";
import { ScannerSubmitForm } from "@/src/features/scanner/components/scanner-submit-form";

export const metadata: Metadata = {
  title: "Karma AI-Readiness Checker",
  description:
    "Grade any nonprofit website on whether AI agents acting for donors can reach, understand, trust, and transact with it.",
};

export default function ScannerPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12 sm:py-16">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
          Is your nonprofit AI-ready?
        </h1>
        <p className="text-base text-zinc-600 dark:text-zinc-400">
          Paste a URL. We will check how your site looks to AI agents that act for donors and donor
          advisors, and grade it across five categories. The headline grade is public and shareable.
          Top fixes and per-check evidence are visible after you log in.
        </p>
      </header>

      <section className="flex flex-col gap-4 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <ScannerSubmitForm />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          We scan as a polite crawler that identifies itself and never submits any payment. See the
          scorecard for what the agent could and could not do.
        </p>
      </section>
    </main>
  );
}
