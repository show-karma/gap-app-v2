import { Search, Users } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionContainer } from "@/src/components/shared/section-container";
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
      href: SOCIALS.PARTNER_FORM,
      external: true,
    },
  },
];

export function FreeToolsSection() {
  return (
    <section className={cn(marketingLayoutTheme.padding, "flex flex-col items-start w-full")}>
      <SectionContainer className="flex flex-col items-start gap-10">
        <div className="flex flex-col items-start gap-4 w-full max-w-2xl">
          <Badge
            variant="secondary"
            className={cn(
              "text-secondary-foreground font-medium text-xs",
              "leading-[150%] tracking-[0.015em]",
              "rounded-full py-[3px] px-2",
              "bg-secondary border-0 w-fit"
            )}
          >
            Free tools & a helping hand
          </Badge>

          <h2 className={cn("section-title", "text-left", "w-full")}>
            <span className="text-foreground">Built for nonprofits.</span>
            <br />
            <span className="text-muted-foreground">Free, because funders pay us.</span>
          </h2>
          <p className="text-muted-foreground font-medium text-base md:text-lg leading-[28px] mt-2">
            Two things you can use today without signing up, paying, or sitting through a demo.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <article
                key={tool.label}
                className={cn(
                  "flex flex-col gap-4 p-8 md:p-10",
                  "rounded-2xl border border-border bg-secondary",
                  "transition-colors duration-200 hover:border-foreground/15"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center">
                    <Icon className="w-5 h-5 text-foreground" />
                  </div>
                  <span className="text-[11px] font-medium tracking-[0.12em] uppercase text-muted-foreground">
                    {tool.label}
                  </span>
                </div>
                <h3 className="text-foreground font-semibold text-[20px] leading-[120%] tracking-[-0.02em]">
                  {tool.title}
                </h3>
                <p className="text-muted-foreground font-medium text-sm leading-[22px] flex-1">
                  {tool.description}
                </p>
                <div>
                  <Button
                    asChild
                    variant="outline"
                    className="rounded-md font-medium px-5 py-2.5 bg-background"
                  >
                    <Link
                      href={tool.cta.href}
                      {...(tool.cta.external
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                    >
                      {tool.cta.label}
                    </Link>
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </SectionContainer>
    </section>
  );
}
