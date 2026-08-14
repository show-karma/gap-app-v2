import { CapabilitiesSection } from "./sections/CapabilitiesSection";
import { CtaSection } from "./sections/CtaSection";
import { FaqSection } from "./sections/FaqSection";
import { HeroSection } from "./sections/HeroSection";
import { ToolCatalogSection } from "./sections/ToolCatalogSection";

export function ForAgentsPage() {
  return (
    <main className="flex w-full flex-col items-center bg-background">
      <div className="flex w-full max-w-[1920px] flex-col gap-4">
        <HeroSection />
        <CapabilitiesSection />
        {/* The tool catalog awaits the indexer's /mcp/tools fetch and is the
            page's substantive content, so it is NOT wrapped in Suspense:
            /for-agents ships in the sitemap, and a boundary streamed the whole
            catalog into a hidden chunk while no-JS readers saw only a skeleton
            (DEV-612). Awaiting it inline blocks on that one fetch, the trade
            every route in SITEMAP_NO_LOADING makes. */}
        <ToolCatalogSection />
        <FaqSection />
        <div className="mx-auto w-full max-w-3xl px-4 py-8">
          <CtaSection />
        </div>
      </div>
    </main>
  );
}
