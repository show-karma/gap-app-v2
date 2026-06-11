import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { SectionContainer } from "@/src/components/shared/section-container";
import { ScrollReveal } from "@/src/features/home/components/scroll-reveal";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { NON_PROFITS_PAGES, PAGES } from "@/utilities/pages";
import { SOCIALS } from "@/utilities/socials";
import { cn } from "@/utilities/tailwind";

interface PersonaCta {
  audience: string;
  description: string;
  primary: { label: string; href: string; external?: boolean };
  secondary?: { label: string; href: string; external?: boolean };
}

const personaCtas: PersonaCta[] = [
  {
    audience: "Foundations",
    description: "Run grants, hackathons, and RFPs with a lean team. See the platform end-to-end.",
    primary: {
      label: "Schedule a demo",
      href: SOCIALS.PARTNER_FORM,
      external: true,
    },
    secondary: { label: "Explore foundations", href: PAGES.FOUNDATIONS },
  },
  {
    audience: "Donors & advisors",
    description:
      "Get a ranked research brief in 10 minutes. Compliance verified, activity scored, mission matched.",
    primary: { label: "Try Donor Research", href: PAGES.DONOR_RESEARCH.INDEX },
    secondary: { label: "How it helps you give", href: PAGES.DONOR_ADVISORS },
  },
  {
    audience: "Nonprofits",
    description:
      "Share your URL. Karma builds the funder-facing profile and keeps it current. Free.",
    primary: { label: "Add your nonprofit free", href: PAGES.CREATE_PROJECT_PROFILE },
    secondary: { label: "Search funders for free", href: NON_PROFITS_PAGES.HOME },
  },
];

export function CTASection() {
  return (
    <section className={cn(marketingLayoutTheme.padding, "pb-16 md:pb-24")}>
      <SectionContainer>
        <ScrollReveal variant="fade-up">
          <div className="flex flex-col items-center gap-10 md:gap-14">
            <div className="flex flex-col items-center gap-4 text-center max-w-2xl">
              <span className="text-xs font-medium tracking-[0.14em] uppercase text-muted-foreground">
                Pick your side
              </span>
              <h2 className="section-title text-foreground">
                One platform. Every side of the table.
              </h2>
              <p className="text-base md:text-lg font-normal text-muted-foreground leading-[28px]">
                Foundations run programs. Donors find nonprofits worth backing. Nonprofits get
                found. Start where you sit.
              </p>
            </div>

            <div
              className={cn(
                "grid grid-cols-1 md:grid-cols-3 w-full gap-px overflow-hidden",
                "rounded-2xl border border-border bg-border"
              )}
            >
              {personaCtas.map((cta) => (
                <div
                  key={cta.audience}
                  className={cn("flex flex-col gap-5 p-6 md:p-8", "bg-background")}
                >
                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-medium tracking-[0.12em] uppercase text-muted-foreground">
                      {cta.audience}
                    </span>
                    <p className="text-foreground text-[15px] leading-[150%]">{cta.description}</p>
                  </div>
                  <div className="flex flex-col gap-2 mt-auto">
                    <Link
                      href={cta.primary.href}
                      {...(cta.primary.external
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                      className={cn(
                        "inline-flex items-center justify-between gap-2",
                        "rounded-md bg-foreground text-background font-semibold text-sm",
                        "px-4 py-2.5 hover:bg-foreground/90 transition-colors"
                      )}
                    >
                      <span>{cta.primary.label}</span>
                      <ArrowUpRight className="h-4 w-4" aria-hidden />
                    </Link>
                    {cta.secondary ? (
                      <Link
                        href={cta.secondary.href}
                        {...(cta.secondary.external
                          ? { target: "_blank", rel: "noopener noreferrer" }
                          : {})}
                        className={cn(
                          "inline-flex items-center justify-between gap-2",
                          "rounded-md border border-border bg-background text-foreground font-medium text-sm",
                          "px-4 py-2.5 hover:bg-secondary transition-colors"
                        )}
                      >
                        <span>{cta.secondary.label}</span>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                      </Link>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </SectionContainer>
    </section>
  );
}
