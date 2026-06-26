import type { Metadata } from "next";
import { ScannerSubmitForm } from "@/src/features/scanner/components/scanner-submit-form";

export const metadata: Metadata = {
  title: "AI-Readiness Checker | Karma",
  description:
    "Grade any nonprofit website on whether AI agents acting for donors can reach, understand, trust, and transact with it.",
};

export default function ScannerPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-14 px-6 py-16 sm:py-24">
      <header className="flex flex-col gap-4">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">
          Karma AI-Readiness Checker
        </span>
        <h1 className="font-display text-[clamp(2.25rem,6vw,3.5rem)] leading-[1.05] tracking-tight text-zinc-900 dark:text-zinc-50">
          What can an AI agent learn about your nonprofit?
        </h1>
        <p className="max-w-prose text-base text-zinc-600 dark:text-zinc-400">
          Paste a URL. We score the site across five categories that determine whether agents acting
          for donors and donor advisors can{" "}
          <em className="not-italic font-medium">reach, understand, trust, and transact</em> with
          you. The headline grade is public and shareable. The fix list opens after you log in.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <ScannerSubmitForm />
        <p className="font-mono text-[11px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          Polite crawler. Identifies itself. Never submits payment.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-6 border-t border-zinc-200 pt-10 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">
            What it measures
          </span>
          <p>
            Crawler access, schema, EIN cross-reference against IRS records, DAF giving path,
            captcha-free donate flow, freshness.
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">
            What you get
          </span>
          <p>
            A grade from A to F, a per-category breakdown, and (after sign-in) a prioritized fix
            list ranked by impact.
          </p>
        </div>
      </section>
    </main>
  );
}
