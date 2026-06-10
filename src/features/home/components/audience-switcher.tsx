"use client";

import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { SectionContainer } from "@/src/components/shared/section-container";
import { LayeredScreenshots } from "@/src/features/foundations/components/layered-screenshots";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { PAGES } from "@/utilities/pages";
import { SOCIALS } from "@/utilities/socials";
import { cn } from "@/utilities/tailwind";

// Server-safe layout effect: useLayoutEffect runs synchronously before paint
// on the client, eliminating the SSR-to-client tab flash on direct-linked hashes.
// On the server, fall back to useEffect (a no-op during SSR).
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

type AudienceKey = "foundations" | "donors" | "nonprofits";

const KEY_TO_HASH: Record<AudienceKey, string> = {
  foundations: "foundations",
  donors: "donors-advisors",
  nonprofits: "nonprofits",
};

const HASH_TO_KEY: Record<string, AudienceKey> = {
  foundations: "foundations",
  "donors-advisors": "donors",
  donors: "donors",
  nonprofits: "nonprofits",
};

function readAudienceFromHash(): AudienceKey | null {
  if (typeof window === "undefined") return null;
  const raw = window.location.hash.replace(/^#/, "");
  return HASH_TO_KEY[raw] ?? null;
}

interface Feature {
  label: string;
  title: string;
  description: string;
}

interface PreviewImage {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption?: string;
}

interface LayeredPreview {
  front: { src: string; alt: string; width: number; height: number };
  back: { src: string; alt: string; width: number; height: number };
  caption?: string;
}

interface AudiencePanel {
  key: AudienceKey;
  tabLabel: string;
  headline: string;
  subhead: string;
  features: Feature[];
  primaryCta: { label: string; href: string; external?: boolean };
  /** Optional: some panels have only a single primary action. */
  secondaryCta?: { label: string; href: string; external?: boolean };
  /** Use `layeredPreview` for the two-screenshot composition; otherwise
      pass a single `preview` image. The render path picks layered first. */
  preview?: PreviewImage;
  layeredPreview?: LayeredPreview;
}

const PANELS: AudiencePanel[] = [
  {
    key: "foundations",
    tabLabel: "Foundations",
    headline: "AI-powered funding software that does the work for you.",
    subhead:
      "Run grants, hackathons, and RFPs with a lean team. Karma's AI agents handle evaluation, milestone tracking, and impact reporting, so your team focuses on funding outcomes, not data entry.",
    features: [
      {
        label: "AI evaluation",
        title: "Cut review time by 70%",
        description:
          "Agents score every application against your rubric, flag risks, and surface the strongest proposals. Your team focuses on decisions, not reading.",
      },
      {
        label: "Automated milestone tracking",
        title: "Accountability that runs itself",
        description:
          "Grantees submit milestone updates with proof of work. Karma's agents check them against your criteria and flag what needs attention.",
      },
      {
        label: "Continuous impact reporting",
        title: "Board-ready reports, always current",
        description:
          "Agents aggregate outcomes across your portfolio and keep impact reports up to date. No quarterly scramble.",
      },
      {
        label: "Bring your own agent",
        title: "Use Karma from ChatGPT, Claude, or your own AI",
        description:
          "Connect any AI agent to your Karma instance via MCP to generate reports, query applications, and track milestones from the chat you already use.",
      },
    ],
    primaryCta: { label: "See how foundations use Karma", href: PAGES.FOUNDATIONS },
    secondaryCta: { label: "Schedule a demo", href: SOCIALS.PARTNER_FORM },
    layeredPreview: {
      front: {
        src: "/images/homepage/funder-benefit-01.png",
        alt: "Karma application evaluation dashboard",
        width: 720,
        height: 450,
      },
      back: {
        src: "/images/homepage/funder-benefit-02.png",
        alt: "Karma project registry",
        width: 720,
        height: 450,
      },
      caption: "Application evaluation and project registry.",
    },
  },
  {
    key: "donors",
    tabLabel: "Donors & Advisors",
    headline: "A research brief for every gift, ready in 10 minutes.",
    subhead:
      "Karma's Donor Research scans thousands of 501(c)(3)s against your cause, geography, and grant size, then returns a ranked brief with compliance verified, activity scored, and mission matched. You move from “I want to give” to “here's the shortlist” in one session, not three weeks.",
    features: [
      {
        label: "Compliance verified",
        title: "Every pick passes the IRS check",
        description:
          "We verify 501(c)(3) status against IRS Pub 78, pull the most recent 990, and check state charity registries before any nonprofit shows up in your brief.",
      },
      {
        label: "Activity scored",
        title: "See who's actually still doing the work",
        description:
          "Each recommendation comes with recent public mentions, a freshness score, and a last-active date. Quiet nonprofits don't slip onto your shortlist by accident.",
      },
      {
        label: "Mission matched",
        title: "Tell Karma the cause, get aligned nonprofits",
        description:
          "Set cause, geography, and grant size. Karma surfaces nonprofits whose recent work actually matches what you want to fund, with a transparent composite score.",
      },
      {
        label: "Fast and Deep modes",
        title: "10 minutes for a shortlist, 3 days for diligence",
        description:
          "Fast mode delivers ranked recommendations with EIN and address on every row. Deep mode adds outreach calls and emails so you can vet before you wire.",
      },
    ],
    primaryCta: { label: "Try Donor Research", href: PAGES.DONOR_RESEARCH },
    secondaryCta: { label: "Talk to our team", href: SOCIALS.DONOR_PARTNER_FORM },
    preview: {
      src: "/images/homepage/karma-donor-research-brief.png",
      alt: "Karma Donor Research brief: lead recommendation Northcoast Environmental Center with composite match 74/100, score breakdown across mission match, online presence, and IRS 990 recency, plus three-year financials and recent press coverage",
      width: 1500,
      height: 1049,
      caption: "From a recent research brief.",
    },
  },
  {
    key: "nonprofits",
    tabLabel: "Nonprofits",
    headline: "Just share your website. We'll do the rest.",
    subhead:
      "Karma indexes your site to build a funder-facing profile, then keeps it current by pulling your latest from your blog, socials, and press. Free for nonprofits. Funders pay us, not you.",
    features: [
      {
        label: "Drop your URL",
        title: "We build the profile from your website",
        description:
          "Karma indexes your site to surface your mission, work, impact stories, and team. A funder-facing profile ships in minutes. We email you if anything is missing.",
      },
      {
        label: "Always current",
        title: "Latest blogs, socials, and press, automatically",
        description:
          "Karma watches your public web. New blog posts, social updates, and press mentions flow into your profile so funders see what you're doing right now.",
      },
      {
        label: "Funders find you",
        title: "Live profile in front of active funders",
        description:
          "Karma is where foundations and donors search for grantees. A current, complete profile puts your work in their results.",
      },
    ],
    primaryCta: { label: "Add your nonprofit free", href: PAGES.NONPROFITS },
    preview: {
      src: "/images/homepage/karma-nonprofit-public-profile.png",
      alt: "Karma nonprofit public profile for Greenaction for Health & Environmental Justice, showing 501(c)(3) verification, latest public updates pulled from blogs and press, public data freshness score 96/100, compliance checks, and potential funder fits",
      width: 1797,
      height: 875,
      caption: "Funder-facing profile, assembled from your website.",
    },
  },
];

export function AudienceSwitcher() {
  const [active, setActive] = useState<AudienceKey>("foundations");
  const indicatorId = useId();
  const tablistRef = useRef<HTMLDivElement>(null);
  const panel = PANELS.find((p) => p.key === active) ?? PANELS[0];

  // Read the hash synchronously before paint on the client. Eliminates the
  // brief foundations-to-target-tab flash for direct-linked URLs.
  useIsomorphicLayoutEffect(() => {
    const fromHash = readAudienceFromHash();
    if (fromHash) setActive(fromHash);
  }, []);

  useEffect(() => {
    // Scroll the switcher into view if the page was direct-linked to an audience.
    // Done in a regular effect to avoid blocking paint.
    if (readAudienceFromHash()) {
      requestAnimationFrame(() => {
        document.getElementById("who-its-for")?.scrollIntoView({ block: "start" });
      });
    }

    // Keep state in sync with back/forward navigation and with in-page
    // anchor clicks (e.g., the hero's persona chips). hashchange fires for
    // any non-self-driven hash mutation; we scroll smoothly into view so
    // visitors see the matching panel after a chip click — Next.js Link's
    // default scroll-to-id can't find #foundations because no element has
    // that id (the section's id is #who-its-for).
    const onHashChange = () => {
      const next = readAudienceFromHash();
      if (next) {
        setActive(next);
        requestAnimationFrame(() => {
          document.getElementById("who-its-for")?.scrollIntoView({
            block: "start",
            behavior: "smooth",
          });
        });
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const handleSelect = (key: AudienceKey) => {
    setActive(key);
    // replaceState avoids adding a history entry per tab click and avoids the
    // browser's default hash-scroll behavior.
    window.history.replaceState(null, "", `#${KEY_TO_HASH[key]}`);
  };

  // WAI-ARIA tablist keyboard navigation: ArrowLeft/ArrowRight move focus
  // between tabs, Home/End jump to first/last. Activates on focus.
  const handleTablistKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const currentIndex = PANELS.findIndex((p) => p.key === active);
    if (currentIndex === -1) return;
    let nextIndex = currentIndex;
    if (event.key === "ArrowLeft") {
      nextIndex = currentIndex === 0 ? PANELS.length - 1 : currentIndex - 1;
    } else if (event.key === "ArrowRight") {
      nextIndex = currentIndex === PANELS.length - 1 ? 0 : currentIndex + 1;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = PANELS.length - 1;
    }
    const nextKey = PANELS[nextIndex].key;
    handleSelect(nextKey);
    // Move focus to the newly-active tab so screen readers announce it.
    tablistRef.current?.querySelector<HTMLButtonElement>(`#audience-tab-${nextKey}`)?.focus();
  };

  return (
    <section
      id="who-its-for"
      className={cn(marketingLayoutTheme.padding, "flex flex-col items-center w-full")}
    >
      <SectionContainer className="flex flex-col items-center gap-10 md:gap-14">
        {/* Eyebrow */}
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="text-xs font-medium tracking-[0.14em] uppercase text-muted-foreground">
            Who it&apos;s for
          </span>
          <h2 className="text-foreground font-semibold text-[28px] md:text-[36px] lg:text-[40px] leading-[110%] tracking-[-0.02em] max-w-[640px]">
            One platform. Three sides of philanthropic capital.
          </h2>
        </div>

        {/* Segmented tab strip */}
        <div
          ref={tablistRef}
          role="tablist"
          aria-label="Audience"
          onKeyDown={handleTablistKeyDown}
          className={cn(
            "relative inline-flex flex-col sm:flex-row items-stretch sm:items-center",
            "gap-1 p-1.5 rounded-2xl sm:rounded-full",
            "bg-secondary border border-border",
            "shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
            "w-full sm:w-auto max-w-full"
          )}
        >
          {PANELS.map((p) => {
            const isActive = p.key === active;
            return (
              <button
                key={p.key}
                id={`audience-tab-${p.key}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`audience-panel-${p.key}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => handleSelect(p.key)}
                className={cn(
                  "relative inline-flex items-center justify-center",
                  "px-5 py-2.5 sm:px-6 sm:py-2.5",
                  "rounded-xl sm:rounded-full",
                  "text-sm font-medium",
                  "transition-colors duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  isActive ? "text-background" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId={indicatorId}
                    aria-hidden
                    className="absolute inset-0 bg-foreground rounded-xl sm:rounded-full"
                    transition={{ type: "spring", stiffness: 260, damping: 30 }}
                  />
                )}
                <span className="relative z-10 whitespace-nowrap">{p.tabLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Panel — min-h absorbs residual variance between audiences so the
            CTA section below doesn't jump when switching tabs. */}
        <div className="w-full max-w-[1080px] min-h-[1240px] md:min-h-[1340px] lg:min-h-[1380px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={panel.key}
              id={`audience-panel-${panel.key}`}
              role="tabpanel"
              aria-labelledby={`audience-tab-${panel.key}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col gap-10 md:gap-12"
            >
              {/* Panel header. Eyebrow removed: the active tab already names the audience. */}
              <div className="flex flex-col gap-4 md:max-w-[820px]">
                <h3 className="text-foreground font-semibold text-[28px] md:text-[36px] leading-[115%] tracking-[-0.02em]">
                  {panel.headline}
                </h3>
                <p className="text-muted-foreground text-base md:text-lg leading-[160%] max-w-[680px]">
                  {panel.subhead}
                </p>
              </div>

              {/* Feature grid: 3-up when there are exactly 3 features, 2x2 otherwise */}
              <div
                className={cn(
                  "grid grid-cols-1 gap-3 md:gap-4",
                  panel.features.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2"
                )}
              >
                {panel.features.map((feature) => (
                  <article
                    key={feature.label}
                    className={cn(
                      "group relative flex flex-col gap-2 p-6 md:p-7",
                      "rounded-2xl bg-secondary border border-border",
                      "transition-colors duration-200 hover:border-foreground/15"
                    )}
                  >
                    <span className="text-[11px] font-medium tracking-[0.12em] uppercase text-muted-foreground">
                      {feature.label}
                    </span>
                    <h4 className="text-foreground font-semibold text-[17px] leading-[130%] tracking-[-0.01em]">
                      {feature.title}
                    </h4>
                    <p className="text-muted-foreground text-sm leading-[150%]">
                      {feature.description}
                    </p>
                  </article>
                ))}
              </div>

              {/* Product preview. Three render paths:
                  1. Layered: two stacked product screenshots (foundations, donors)
                  2. SVG placeholder: plain img to bypass next/image SVG gate
                  3. Single PNG: optimized via next/image */}
              {panel.layeredPreview ? (
                <figure className="flex flex-col gap-3 items-center">
                  <LayeredScreenshots
                    className="mt-2"
                    staticAppear
                    front={panel.layeredPreview.front}
                    back={panel.layeredPreview.back}
                    disableDarkMode={panel.key === "donors"}
                  />
                  {panel.layeredPreview.caption ? (
                    <figcaption className="text-[11px] font-medium tracking-[0.12em] uppercase text-muted-foreground text-center">
                      {panel.layeredPreview.caption}
                    </figcaption>
                  ) : null}
                </figure>
              ) : panel.preview ? (
                <figure className="flex flex-col gap-3">
                  <div
                    className={cn(
                      "relative w-full overflow-hidden",
                      "rounded-2xl border border-border bg-background",
                      "shadow-[0_24px_60px_-24px_rgba(15,23,42,0.25)]"
                    )}
                  >
                    {panel.preview.src.endsWith(".svg") ? (
                      // biome-ignore lint/performance/noImgElement: SVG placeholder bypasses next/image SVG gate
                      <img
                        src={panel.preview.src}
                        alt={panel.preview.alt}
                        width={panel.preview.width}
                        height={panel.preview.height}
                        className="w-full h-auto"
                      />
                    ) : (
                      <Image
                        src={panel.preview.src}
                        alt={panel.preview.alt}
                        width={panel.preview.width}
                        height={panel.preview.height}
                        sizes="(min-width: 1080px) 1080px, 100vw"
                        className="w-full h-auto"
                      />
                    )}
                  </div>
                  {panel.preview.caption ? (
                    <figcaption className="text-[11px] font-medium tracking-[0.12em] uppercase text-muted-foreground text-center">
                      {panel.preview.caption}
                    </figcaption>
                  ) : null}
                </figure>
              ) : null}

              {/* CTAs — secondary is optional */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Button asChild className="rounded-md font-semibold px-6 py-2.5">
                  <Link
                    href={panel.primaryCta.href}
                    {...(panel.primaryCta.external
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                  >
                    {panel.primaryCta.label}
                  </Link>
                </Button>
                {panel.secondaryCta ? (
                  <Button asChild variant="outline" className="rounded-md font-medium px-6 py-2.5">
                    <Link
                      href={panel.secondaryCta.href}
                      {...(panel.secondaryCta.external
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                    >
                      {panel.secondaryCta.label}
                    </Link>
                  </Button>
                ) : null}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </SectionContainer>
    </section>
  );
}
