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
        <ToolCatalogSection />
        <FaqSection />
        <div className="mx-auto w-full max-w-3xl px-4 py-8">
          <CtaSection />
        </div>
      </div>
    </main>
  );
}
