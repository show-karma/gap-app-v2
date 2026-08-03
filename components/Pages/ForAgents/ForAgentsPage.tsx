import { Suspense } from "react";
import { AnswerSection } from "./sections/AnswerSection";
import { CapabilitiesSection } from "./sections/CapabilitiesSection";
import { CtaSection } from "./sections/CtaSection";
import { FaqSection } from "./sections/FaqSection";
import { HeroSection } from "./sections/HeroSection";
import { ToolCatalogSection } from "./sections/ToolCatalogSection";

function ToolCatalogFallback() {
  return (
    <section aria-busy="true" className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-12">
      <header className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
          The full tool catalog
        </h2>
      </header>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {TOOL_SKELETON_KEYS.map((key) => (
          <div key={key} className="h-24 animate-pulse rounded-lg border border-border bg-muted" />
        ))}
      </div>
    </section>
  );
}

const TOOL_SKELETON_KEYS = ["a", "b", "c", "d"] as const;

export function ForAgentsPage() {
  return (
    <main className="flex w-full flex-col items-center bg-background">
      <div className="flex w-full max-w-[1920px] flex-col gap-4">
        <HeroSection />
        <AnswerSection />
        <CapabilitiesSection />
        {/* The tool catalog awaits the indexer's /mcp/tools fetch. Isolating it
            in its own Suspense boundary keeps the rest of the page — the
            answer-first copy above all — in the visible server-rendered shell
            instead of dragging the whole segment into a hidden streamed chunk
            (DEV-612). */}
        <Suspense fallback={<ToolCatalogFallback />}>
          <ToolCatalogSection />
        </Suspense>
        <FaqSection />
        <div className="mx-auto w-full max-w-3xl px-4 py-8">
          <CtaSection />
        </div>
      </div>
    </main>
  );
}
