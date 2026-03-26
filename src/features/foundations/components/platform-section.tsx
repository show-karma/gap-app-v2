import { Badge } from "@/components/ui/badge";
import { SectionContainer } from "@/src/components/shared/section-container";
import { ThemeImage } from "@/src/components/ui/theme-image";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { cn } from "@/utilities/tailwind";

interface PlatformFeature {
  subtitle: string;
  title: string;
  description: string;
  highlights: string[];
  image: string;
}

const features: PlatformFeature[] = [
  {
    subtitle: "Structured Intake",
    title: "Professional applications in minutes",
    description:
      "Launch a branded application portal with custom questions, eligibility criteria, and automatic validation. Applicants get a professional experience. You get structured, comparable data.",
    highlights: [
      "Custom application forms with conditional logic",
      "Automatic eligibility screening",
      "Branded applicant portal",
    ],
    image: "/images/homepage/foundation-benefit-04.png",
  },
  {
    subtitle: "AI-Powered Review",
    title: "Cut review time by 70%",
    description:
      "AI pre-scores every application against your criteria, flags risks, and surfaces the strongest proposals. Your team focuses on final decisions, not reading hundreds of pages.",
    highlights: [
      "Automated scoring against your rubric",
      "Risk and quality flags",
      "Side-by-side comparison views",
    ],
    image: "/images/homepage/foundation-benefit-02.png",
  },
  {
    subtitle: "Milestone Tracking",
    title: "Accountability that runs itself",
    description:
      "Grantees submit milestone updates with proof of work. You see progress in real time without chasing emails. Set automatic check-ins and reminders on a schedule.",
    highlights: [
      "Milestone-based progress tracking",
      "Automated grantee reminders",
      "Proof-of-work submissions",
    ],
    image: "/images/homepage/foundation-benefit-01.png",
  },
  {
    subtitle: "Portfolio Dashboard",
    title: "Every funded project in one place",
    description:
      "A live, always-current view of your entire portfolio. See which projects are on track, which need attention, and generate board-ready reports instantly.",
    highlights: [
      "Real-time project status overview",
      "Exportable board reports",
      "Historical grant cycle data",
    ],
    image: "/images/homepage/foundation-benefit-03.png",
  },
];

export function PlatformSection() {
  return (
    <section className={cn(marketingLayoutTheme.padding, "flex flex-col items-start w-full")}>
      <SectionContainer className="flex flex-col items-start gap-16">
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
            <span className="text-foreground">Structured control</span>
            <br />
            <span className="text-muted-foreground">over your entire grant lifecycle</span>
          </h2>

          <p
            className={cn(
              "text-muted-foreground font-normal text-left",
              "text-[20px] leading-[30px] tracking-[0%]",
              "w-full"
            )}
          >
            From intake to impact measurement, every step is structured, visible, and under your
            control.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          {features.map((feature, index) => (
            <div
              key={index}
              className={cn(
                "flex flex-col justify-between gap-3",
                "bg-secondary rounded-2xl",
                "h-[540px]"
              )}
            >
              {/* Text Content */}
              <div className="flex flex-col gap-3 p-10">
                <span className="text-muted-foreground font-medium text-xs leading-[150%] tracking-[0.015em]">
                  {feature.subtitle}
                </span>

                <h3 className="text-foreground font-semibold text-[20px] leading-[120%] tracking-[-0.02em]">
                  {feature.title}
                </h3>

                <p className="text-muted-foreground font-medium text-sm leading-[20px]">
                  {feature.description}
                </p>

                <ul className="flex flex-col gap-2 mt-1">
                  {feature.highlights.map((highlight, hIndex) => (
                    <li key={hIndex} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-foreground flex-shrink-0 mt-1.5" />
                      <span className="text-foreground font-normal text-sm leading-[150%]">
                        {highlight}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Image */}
              <div className="relative w-full h-[320px] overflow-hidden">
                <ThemeImage
                  src={feature.image}
                  alt={feature.title}
                  fill
                  className="object-cover object-top"
                />
              </div>
            </div>
          ))}
        </div>
      </SectionContainer>
    </section>
  );
}
