import { Badge } from "@/components/ui/badge";
import { SectionContainer } from "@/src/components/shared/section-container";
import { ThemeImage } from "@/src/components/ui/theme-image";
import { ScrollReveal } from "@/src/features/home/components/scroll-reveal";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { cn } from "@/utilities/tailwind";

interface PlatformCard {
  subtitle: string;
  title: string;
  description: string;
  image: string;
}

const platformCards: PlatformCard[] = [
  {
    subtitle: "Intake & Evaluation",
    title: "Applications reviewed before you open your inbox",
    description:
      "Custom intake forms, eligibility filters, and AI agents that evaluate every submission. By the time you sit down to review, applications are pre-scored, risk-flagged, and ranked. Ready for your decision.",
    image: "/images/homepage/funder-benefit-01.png",
  },
  {
    subtitle: "Project Registry",
    title: "A live portfolio you never have to maintain",
    description:
      "Every funded project, milestone, and update in one registry, maintained automatically. Grantees submit progress directly. You get a board-ready portfolio view without chasing a single email.",
    image: "/images/homepage/funder-benefit-02.png",
  },
  {
    subtitle: "Impact Measurement",
    title: "Board reports that write themselves",
    description:
      "Metrics pulled automatically from GitHub, on-chain data, and custom integrations. Impact reports aligned with the Common Impact Data Standard are always current. No quarterly scramble.",
    image: "/images/homepage/funder-benefit-03.png",
  },
  {
    subtitle: "Fund Distribution",
    title: "Funds move when milestones are met",
    description:
      "Direct grants, milestone-based releases, hackathon prizes, retroactive funding. Disbursement across fiat and crypto, triggered automatically so funds move on schedule.",
    image: "/images/homepage/funder-benefit-04.png",
  },
];

export function PlatformSection() {
  return (
    <section className={cn(marketingLayoutTheme.padding, "flex flex-col items-start w-full")}>
      <SectionContainer className="flex flex-col items-start gap-12">
        <ScrollReveal variant="fade-up">
          <div className="flex flex-col items-start gap-4 w-full max-w-[768px]">
            <Badge
              variant="secondary"
              className={cn(
                "text-secondary-foreground font-medium text-xs",
                "leading-[150%] tracking-[0.015em]",
                "rounded-full py-[3px] px-2",
                "bg-secondary border-0 w-fit"
              )}
            >
              The Platform
            </Badge>

            <h2 className={cn("section-title", "text-left", "w-full")}>
              <span className="text-foreground">Do more with less.</span> <br />
              <span className="text-muted-foreground">Each module automates a full job.</span>
            </h2>

            <p
              className={cn(
                "text-muted-foreground font-normal text-left",
                "text-lg leading-[28px] lg:text-xl lg:leading-[30px]",
                "w-full"
              )}
            >
              Each module automates a job that used to require dedicated staff: evaluation,
              tracking, reporting, distribution. Use what you need, add more as you grow.
            </p>
          </div>
        </ScrollReveal>

        {/* Cards Grid */}
        <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4 w-full")}>
          {platformCards.map((card, index) => (
            <ScrollReveal key={index} variant="scale-up" delay={index * 100}>
              <div
                className={cn(
                  "flex flex-col justify-between gap-3",
                  "bg-secondary rounded-2xl",
                  "h-[540px]"
                )}
              >
                {/* Text Content */}
                <div className="flex flex-col gap-2 p-8 lg:p-10">
                  <span
                    className={cn(
                      "text-muted-foreground font-medium text-xs",
                      "leading-[150%] tracking-[0.015em]"
                    )}
                  >
                    {card.subtitle}
                  </span>

                  <h3
                    className={cn(
                      "text-foreground font-semibold",
                      "text-xl leading-[120%] tracking-[-0.02em]"
                    )}
                  >
                    {card.title}
                  </h3>

                  <p className={cn("text-muted-foreground font-medium text-sm", "leading-[22px]")}>
                    {card.description}
                  </p>
                </div>

                {/* Image */}
                <div className="relative w-full h-[320px] overflow-hidden">
                  <ThemeImage
                    src={card.image}
                    alt={card.title}
                    fill
                    className="object-cover object-top"
                  />
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </SectionContainer>
    </section>
  );
}
