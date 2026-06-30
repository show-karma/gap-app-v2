"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SectionContainer } from "@/src/components/shared/section-container";
import { LayeredScreenshots } from "@/src/features/foundations/components/layered-screenshots";
import { ScrollReveal } from "@/src/features/home/components/scroll-reveal";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { PAGES } from "@/utilities/pages";
import { SOCIALS } from "@/utilities/socials";
import { cn } from "@/utilities/tailwind";

type RowVisual =
  | { kind: "single"; src: string; alt: string; width: number; height: number }
  | { kind: "layered-foundation" };

interface ProductRow {
  audience: string;
  headline: string;
  body: string;
  features: string[];
  visual: RowVisual;
  caption: string;
  primaryCta: { label: string; href: string; external?: boolean };
  secondaryCta: { label: string; href: string; external?: boolean };
}

const ROWS: ProductRow[] = [
  {
    audience: "For donor advisors",
    headline: "Generate a donor-ready research brief in 10 minutes",
    body: "Donor advisors use Karma to build a ranked shortlist for any cause, geography, or grant size. Every brief ships with a composite score, the inputs that produced it, and source documents linked, so you save hours of diligence and hand donors a recommendation they can act on with confidence.",
    features: [
      "Composite scoring with mission match, online presence, and IRS 990 recency",
      "IRS Pub 78, latest 990, and state registries verified up front",
      "Deep mode: 3-day diligence with outreach. Fast mode ships a shortlist in 10.",
    ],
    visual: {
      kind: "single",
      src: "/images/homepage/karma-donor-research-brief.png",
      alt: "A Karma Nonprofit Research brief showing the lead recommendation with composite match score, breakdown across mission match, online presence and IRS 990 recency, plus three-year financials and recent press coverage",
      width: 1500,
      height: 1049,
    },
    caption: "A research brief from a recent gift, with the score breakdown.",
    primaryCta: { label: "Explore Nonprofit Research", href: PAGES.DONOR_ADVISORS },
    secondaryCta: {
      label: "Get a demo",
      href: SOCIALS.DONOR_PARTNER_FORM,
      external: true,
    },
  },
  {
    audience: "For grant programs and foundations",
    headline: "Cut application review time by 70% and pay on proof of work",
    body: "Run grants, hackathons, and RFPs end to end. Intake, AI-assisted evaluation with risk flags, milestone-gated payouts, board-ready impact reports.",
    features: [
      "AI evaluation cuts review time by 70%, with risk flags on every applicant",
      "Milestone-based payouts, gated on proof of work",
      "Portfolio impact reports aligned with the Common Impact Data Standard",
      "Bring your own AI: run your program from ChatGPT, Claude, or any agents",
    ],
    visual: { kind: "layered-foundation" },
    caption: "Application evaluation feeding the live project registry.",
    primaryCta: { label: "See how foundations use Karma", href: PAGES.FOUNDATIONS },
    secondaryCta: {
      label: "Schedule a foundation demo",
      href: SOCIALS.PARTNER_FORM,
      external: true,
    },
  },
];

function ProductRowBlock({ row, reverse }: { row: ProductRow; reverse: boolean }) {
  return (
    <ScrollReveal variant="fade-up" className="w-full">
      <div
        className={cn(
          "grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center w-full",
          reverse ? "lg:[&>*:first-child]:order-2" : ""
        )}
      >
        {/* Text column. Audience kicker matches the section header's
            kicker style (rule + uppercase label) — no numeric prefix,
            because the rows are parallel products, not sequential steps. */}
        <div className="flex flex-col gap-5 md:gap-6">
          <div className="flex items-center gap-3">
            <span aria-hidden className="h-px w-8 bg-foreground/40" />
            <span className="text-[11px] font-medium tracking-[0.18em] uppercase text-muted-foreground">
              {row.audience}
            </span>
          </div>
          {/* H3 drops to Inter so the type hierarchy reads as: H1/H2 in
              the editorial display family, H3 + body in the operational
              sans. The size step (24/28/32) sits well below the section
              H2 (32/44/52) for clear visual hierarchy. */}
          <h3
            className={cn(
              "font-body font-semibold text-foreground",
              "text-[24px] md:text-[28px] lg:text-[32px]",
              "leading-[120%] tracking-[-0.015em] max-w-[520px]"
            )}
          >
            {row.headline}
          </h3>
          <p className="text-muted-foreground text-base md:text-lg leading-[160%] max-w-[560px]">
            {row.body}
          </p>
          <ul className="flex flex-col gap-3 mt-2 max-w-[560px]">
            {row.features.map((feature) => (
              <li key={feature} className="grid grid-cols-[auto_1fr] gap-x-3 items-baseline">
                {/* Refined bullet: small filled square at foreground/75 so
                    the list reads scannably without competing with the
                    headline. Baseline-aligned via translate so the marker
                    sits on the text baseline rather than centered. */}
                <span
                  aria-hidden
                  className="inline-block h-1.5 w-1.5 translate-y-[-2px] rounded-[1.5px] bg-foreground/75"
                />
                <span className="text-foreground text-[15px] leading-[155%]">{feature}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <Button asChild className="rounded-md font-semibold px-6 py-2.5">
              <Link
                href={row.primaryCta.href}
                {...(row.primaryCta.external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                {row.primaryCta.label}
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-md font-medium px-6 py-2.5">
              <Link
                href={row.secondaryCta.href}
                {...(row.secondaryCta.external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                {row.secondaryCta.label}
              </Link>
            </Button>
          </div>
        </div>

        {/* Visual column. Cleaner border treatment than the old heavy
            drop-shadow: thin border with a soft outer ring for elevation
            that respects both light and dark themes. */}
        <figure className="flex flex-col gap-3 w-full">
          {row.visual.kind === "layered-foundation" ? (
            <LayeredScreenshots />
          ) : (
            <div
              className={cn(
                "relative w-full overflow-hidden",
                "rounded-2xl border border-border bg-background",
                "ring-1 ring-foreground/[0.04]",
                "shadow-[0_8px_32px_-12px_rgb(0_0_0/0.12)]"
              )}
            >
              <Image
                src={row.visual.src}
                alt={row.visual.alt}
                width={row.visual.width}
                height={row.visual.height}
                sizes="(min-width: 1280px) 600px, 100vw"
                className="w-full h-auto"
              />
            </div>
          )}
          <figcaption className="text-[11px] font-medium tracking-[0.14em] uppercase text-muted-foreground text-center">
            {row.caption}
          </figcaption>
        </figure>
      </div>
    </ScrollReveal>
  );
}

export function WorkflowSection() {
  return (
    <section id="why-karma" className="flex flex-col items-center w-full">
      {/* Editorial section header: kicker rule + label sit immediately above
          the H2 in a single left-aligned column. No 2-column grid (the
          asymmetric kicker felt orphaned from the headline). Top padding
          carries the transition from the hero; bottom padding stays tight
          so the header reads as the lede for row 01 below. */}
      <div className={cn(marketingLayoutTheme.padding, "w-full pt-20 md:pt-28 pb-10 md:pb-14")}>
        <SectionContainer>
          <ScrollReveal variant="fade-up">
            <div className="flex flex-col gap-4 max-w-[680px]">
              <div className="flex items-center gap-3">
                <span aria-hidden className="h-px w-8 bg-foreground/40" />
                <span className="text-[11px] font-medium tracking-[0.18em] uppercase text-muted-foreground">
                  Why Karma
                </span>
              </div>
              <h2
                className={cn(
                  "font-display font-medium text-foreground",
                  "text-[32px] md:text-[44px] lg:text-[52px]",
                  "leading-[105%] tracking-[-0.02em]"
                )}
              >
                Find the organizations worth funding.
              </h2>
              <p className="text-muted-foreground text-base md:text-lg leading-[160%]">
                Karma indexes nonprofit projects and updates from across philanthropy, plus the
                progress grantees post directly. This rich source of live nonprofit data lets donor
                advisors recommend the right organization to clients, and foundations run end-to-end
                grant programs. Fund on better data.
              </p>
            </div>
          </ScrollReveal>
        </SectionContainer>
      </div>

      {/* Alternating row backgrounds. Row 01 sits on the page background
          (continues from the header without a visual seam); Row 02 gets a
          bg-secondary band that signals a distinct product path. Inner
          vertical padding sized for breathing room; the band itself is the
          rhythm beat, not stacked py. */}
      {ROWS.map((row, index) => {
        const isAlternate = index % 2 === 1;
        return (
          <div
            key={row.audience}
            className={cn(
              marketingLayoutTheme.padding,
              "w-full py-14 md:py-20",
              isAlternate ? "bg-secondary" : "bg-background"
            )}
          >
            <SectionContainer>
              <ProductRowBlock row={row} reverse={isAlternate} />
            </SectionContainer>
          </div>
        );
      })}

      {/* Quiet closing moment. Single sentence + arrow link gives end-of-
          page visitors a final pull without competing with the per-row
          CTAs above. Routes to the general partner form so visitors who
          don't fit either bucket get the right intake. */}
      <ScrollReveal variant="fade-up" className="w-full">
        <div className={cn(marketingLayoutTheme.padding, "w-full py-14 md:py-20")}>
          <SectionContainer className="flex flex-col items-center text-center gap-1">
            <p className="text-sm md:text-base text-muted-foreground">Not sure which path fits?</p>
            <a
              href={SOCIALS.PARTNER_FORM}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-foreground hover:text-foreground/80 transition-colors font-medium text-base md:text-lg group"
            >
              Talk to our team
              <span
                aria-hidden
                className="transition-transform duration-200 group-hover:translate-x-1"
              >
                →
              </span>
            </a>
          </SectionContainer>
        </div>
      </ScrollReveal>
    </section>
  );
}
