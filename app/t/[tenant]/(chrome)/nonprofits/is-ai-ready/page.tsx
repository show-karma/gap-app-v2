import { MousePointerClick, Scan, Shield, Wrench } from "lucide-react";
import type { Metadata } from "next";
import { Reveal } from "@/src/features/scanner/components/reveal";
import { ScannerBeforeAfter } from "@/src/features/scanner/components/scanner-before-after";
import { ScannerHeroPreview } from "@/src/features/scanner/components/scanner-hero-preview";
import { ScannerJourney } from "@/src/features/scanner/components/scanner-journey";
import { ScannerSubmitForm } from "@/src/features/scanner/components/scanner-submit-form";
import { customMetadata } from "@/utilities/meta";

export const metadata: Metadata = customMetadata({
  title: "AI-Readiness Checker | Karma",
  description:
    "Grade any nonprofit website on whether AI agents acting for donors can reach, understand, trust, and transact with it.",
  path: "/nonprofits/is-ai-ready",
});

const HOW_IT_WORKS = [
  {
    icon: Scan,
    title: "1 · Scan",
    body: "Twenty-five checks run in about 40 seconds, from reachability to structured data.",
  },
  {
    icon: MousePointerClick,
    title: "2 · Walk the flow",
    body: "An AI agent walks your donate form right up to the payment step.",
  },
  {
    icon: Wrench,
    title: "3 · Fix",
    body: "Get a prioritized fix list, with the points each fix is worth.",
  },
];

export default function ScannerPage() {
  return (
    <main className="flex flex-col">
      {/* hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          className="pointer-events-none absolute left-1/2 top-[-140px] h-[440px] w-[620px] -translate-x-1/2 rounded-full bg-brand/20 blur-3xl dark:bg-brand/10"
          aria-hidden
        />
        <div className="relative mx-auto flex w-full max-w-[1120px] flex-col items-center px-6 py-16 text-center sm:py-24">
          <Reveal
            as="h1"
            className="max-w-[820px] text-[clamp(2.2rem,5vw,3.4rem)] font-bold leading-[1.04] tracking-tight text-foreground"
          >
            Is your site ready for AI donors?
          </Reveal>
          <Reveal
            as="p"
            delay={90}
            className="mt-[18px] max-w-[620px] text-[clamp(1rem,2vw,1.2rem)] leading-relaxed text-foreground-alt"
          >
            Paste your URL. We send a polite AI agent through your site the way a donor's assistant
            would, and grade whether it can{" "}
            <strong className="font-semibold text-foreground">
              reach, understand, trust, and transact
            </strong>
            .
          </Reveal>
          <Reveal delay={180} className="mt-8 flex w-full justify-center">
            <ScannerSubmitForm showExamples />
          </Reveal>
          <Reveal delay={260} className="w-full">
            <ScannerHeroPreview />
          </Reveal>
        </div>
      </section>

      {/* what it measures */}
      <section className="mx-auto w-full max-w-[1080px] px-6 pb-10 pt-16">
        <Reveal className="mb-12 text-center">
          <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-brand-emphasis">
            What it measures
          </span>
          <h2 className="mb-3 mt-2.5 text-[clamp(1.6rem,3vw,2.1rem)] font-semibold tracking-tight text-foreground">
            Five categories, one journey
          </h2>
          <p className="mx-auto max-w-[560px] text-[15.5px] leading-relaxed text-muted-foreground">
            A grade from A to F, a per-category breakdown, and a prioritized fix list ranked by
            impact.
          </p>
        </Reveal>
        <ScannerJourney />
      </section>

      {/* how it works */}
      <section className="mx-auto w-full max-w-[1080px] px-6 pb-10 pt-6">
        <div className="grid grid-cols-1 gap-7 rounded-2xl border border-border bg-card p-8 shadow-sm sm:grid-cols-3">
          {HOW_IT_WORKS.map((step, i) => {
            const Icon = step.icon;
            return (
              <Reveal key={step.title} delay={i * 110} className="group flex flex-col gap-2.5">
                <div className="flex h-[42px] w-[42px] items-center justify-center rounded-xl bg-secondary text-brand-emphasis transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-0.5 group-hover:scale-105">
                  <Icon className="h-[21px] w-[21px]" aria-hidden />
                </div>
                <h3 className="text-base font-semibold text-foreground">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              </Reveal>
            );
          })}
        </div>
        <p className="mt-[22px] flex items-center justify-center gap-1.5 text-center text-[12.5px] text-muted-foreground">
          <Shield className="h-3.5 w-3.5" aria-hidden />
          Our agent identifies itself, respects robots.txt, and never submits a payment.
        </p>
      </section>

      {/* the score moves — before / after proof */}
      <ScannerBeforeAfter />
    </main>
  );
}
