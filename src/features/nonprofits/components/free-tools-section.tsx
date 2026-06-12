"use client";

import { ArrowUpRight, Search, Users } from "lucide-react";
import Link from "next/link";
import { SectionContainer } from "@/src/components/shared/section-container";
import { ScrollReveal } from "@/src/features/home/components/scroll-reveal";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { NON_PROFITS_PAGES } from "@/utilities/pages";
import { SOCIALS } from "@/utilities/socials";
import { cn } from "@/utilities/tailwind";

interface ToolCard {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  title: string;
  description: string;
  cta: { label: string; href: string; external?: boolean };
}

const tools: ToolCard[] = [
  {
    icon: Search,
    label: "Free tool",
    title: "Search funders in plain English",
    description:
      "Type what you're looking for the way you'd say it: \"foundations funding bilingual education in the Bay Area.\" Karma searches its funder map and returns aligned grantors with their giving history. No signup, results in seconds.",
    cta: { label: "Try the funder search", href: NON_PROFITS_PAGES.HOME },
  },
  {
    icon: Users,
    label: "Need a hand?",
    title: "We can help with reports and social",
    description:
      "Tight on time? Tell us where you need a hand and Karma's team can help run your impact reporting or manage your social. We do it with AI agents, which makes our cost low enough that we offer it free.",
    cta: {
      label: "Talk to us",
      href: SOCIALS.NONPROFIT_HELP_FORM,
      external: true,
    },
  },
];

export function FreeToolsSection() {
  return (
    <section className={cn(marketingLayoutTheme.padding, "flex flex-col items-start w-full")}>
      <SectionContainer className="flex flex-col items-start gap-10">
        <ScrollReveal variant="fade-up">
          <div className="relative w-full max-w-2xl">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[11px] font-medium tracking-[0.14em] uppercase text-muted-foreground whitespace-nowrap">
                Free tools & a helping hand
              </span>
              <span aria-hidden className="flex-1 h-px bg-border" />
            </div>

            <h2 className={cn("section-title", "text-left", "w-full")}>
              <span className="text-foreground">Built for nonprofits.</span>
              <br />
              <span className="text-muted-foreground">Free, because funders pay us.</span>
            </h2>
            <p className="text-muted-foreground font-medium text-base md:text-lg leading-[28px] mt-3">
              Two things you can use today without signing up, paying, or sitting through a demo.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal variant="fade-up" delay={100} className="w-full">
          <div
            className={cn(
              "grid grid-cols-1 md:grid-cols-2 gap-px overflow-hidden w-full",
              "rounded-2xl border border-border bg-border"
            )}
          >
            {tools.map((tool) => {
              const Icon = tool.icon;
              const linkProps = tool.cta.external
                ? { target: "_blank" as const, rel: "noopener noreferrer" as const }
                : {};
              return (
                <Link
                  key={tool.label}
                  href={tool.cta.href}
                  {...linkProps}
                  className={cn(
                    "group/extra relative flex flex-col gap-4 p-8 md:p-10",
                    "bg-background",
                    "transition-colors duration-200 hover:bg-secondary/40",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "inline-flex h-10 w-10 items-center justify-center rounded-full",
                          "bg-secondary text-foreground"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-[11px] font-medium tracking-[0.12em] uppercase text-muted-foreground">
                        {tool.label}
                      </span>
                    </div>
                    <ArrowUpRight
                      className={cn(
                        "h-4 w-4 text-muted-foreground",
                        "transition-transform duration-200 group-hover/extra:translate-x-0.5 group-hover/extra:-translate-y-0.5",
                        "group-hover/extra:text-foreground"
                      )}
                    />
                  </div>
                  <h3 className="text-foreground font-semibold text-[20px] leading-[120%] tracking-[-0.02em]">
                    {tool.title}
                  </h3>
                  <p className="text-muted-foreground font-medium text-sm leading-[22px] flex-1">
                    {tool.description}
                  </p>
                  <span className="text-[13px] font-medium text-foreground/80 group-hover/extra:text-foreground transition-colors">
                    {tool.cta.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </ScrollReveal>
      </SectionContainer>
    </section>
  );
}
