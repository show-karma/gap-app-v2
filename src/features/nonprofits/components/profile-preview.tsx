"use client";

import Image from "next/image";
import { SectionContainer } from "@/src/components/shared/section-container";
import { ScrollReveal } from "@/src/features/home/components/scroll-reveal";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { cn } from "@/utilities/tailwind";

export function ProfilePreview() {
  return (
    <section className={cn(marketingLayoutTheme.padding, "flex flex-col items-center w-full")}>
      <SectionContainer className="flex flex-col items-center gap-4">
        <ScrollReveal variant="fade-up" className="w-full">
          <figure className="flex flex-col gap-3 w-full">
            <div
              className={cn(
                "relative w-full overflow-hidden",
                "rounded-2xl border border-border bg-background",
                "shadow-[0_24px_60px_-24px_rgba(15,23,42,0.25)]"
              )}
            >
              <Image
                src="/images/homepage/karma-nonprofit-public-profile.png"
                alt="Karma nonprofit public profile for Greenaction for Health & Environmental Justice, showing 501(c)(3) verification, latest public updates pulled from blogs and press, public data freshness score 96/100, compliance checks, and potential funder fits"
                width={1797}
                height={875}
                sizes="(min-width: 1280px) 1200px, 100vw"
                className="w-full h-auto"
              />
            </div>
            <figcaption className="text-[11px] font-medium tracking-[0.12em] uppercase text-muted-foreground text-center">
              Funder-facing profile, assembled from your website.
            </figcaption>
          </figure>
        </ScrollReveal>
      </SectionContainer>
    </section>
  );
}
