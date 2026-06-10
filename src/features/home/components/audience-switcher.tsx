"use client";

import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { memo, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { SectionContainer } from "@/src/components/shared/section-container";
import { LayeredScreenshots } from "@/src/features/foundations/components/layered-screenshots";
import {
  type AudienceKey,
  type AudiencePanel,
  KEY_TO_HASH,
  PANELS,
  readAudienceFromHash,
} from "@/src/features/home/components/audience-panels";
import { marketingLayoutTheme, marketingPreviewFrame } from "@/src/helper/theme";
import { cn } from "@/utilities/tailwind";

// Server-safe layout effect: useLayoutEffect runs synchronously before paint
// on the client, eliminating the SSR-to-client tab flash on direct-linked hashes.
// On the server, fall back to useEffect (a no-op during SSR).
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function AudienceSwitcher() {
  const [active, setActive] = useState<AudienceKey>("foundations");
  const indicatorId = useId();
  const tablistRef = useRef<HTMLDivElement>(null);

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

    // Keep state in sync with back/forward navigation and with the hero's
    // persona chips (which replaceState + dispatch a synthetic hashchange).
    // We scroll smoothly into view so visitors see the matching panel.
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
    // browser's default hash-scroll behavior. The hero chips use the same
    // replaceState strategy so back-button behavior is consistent everywhere.
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
      className={cn(marketingLayoutTheme.padding, "relative flex flex-col items-center w-full")}
    >
      {/* No-JS fallback targets for the hero chips' #foundations /
          #donors-advisors / #nonprofits hrefs: with JS the chip handler
          intercepts the click; without it, the browser's native anchor
          scroll lands here at the top of the switcher. */}
      {PANELS.map((p) => (
        <span key={p.key} id={KEY_TO_HASH[p.key]} aria-hidden className="absolute top-0" />
      ))}
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

        {/* Panels. All three render stacked in the same grid cell so the
            container's height is the tallest panel's height — no layout
            jump when switching tabs and no magic min-height to maintain.
            Inactive panels stay in the DOM (SEO + valid aria-controls
            targets) but are aria-hidden, inert, and faded out. */}
        <div className="grid w-full max-w-[1080px]">
          {PANELS.map((panel) => (
            <AudiencePanelView key={panel.key} panel={panel} isActive={panel.key === active} />
          ))}
        </div>
      </SectionContainer>
    </section>
  );
}

interface AudiencePanelViewProps {
  panel: AudiencePanel;
  isActive: boolean;
}

/** One audience tabpanel. Memoized: only the panels whose `isActive` flips
    re-render on a tab switch; the panel content itself is static. */
const AudiencePanelView = memo(function AudiencePanelView({
  panel,
  isActive,
}: AudiencePanelViewProps) {
  return (
    <motion.div
      id={`audience-panel-${panel.key}`}
      role="tabpanel"
      aria-labelledby={`audience-tab-${panel.key}`}
      aria-hidden={!isActive}
      inert={!isActive}
      initial={false}
      animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "col-start-1 row-start-1 flex flex-col gap-10 md:gap-12",
        isActive ? "z-10" : "z-0 pointer-events-none select-none"
      )}
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
            <p className="text-muted-foreground text-sm leading-[150%]">{feature.description}</p>
          </article>
        ))}
      </div>

      {/* Product preview: layered two-screenshot composition or a single
          next/image shot. */}
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
          <div className={marketingPreviewFrame}>
            <Image
              src={panel.preview.src}
              alt={panel.preview.alt}
              width={panel.preview.width}
              height={panel.preview.height}
              sizes="(min-width: 1080px) 1080px, 100vw"
              className="w-full h-auto"
            />
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
            {...(panel.primaryCta.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
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
  );
});
