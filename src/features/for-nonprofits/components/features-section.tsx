import { Badge } from "@/components/ui/badge";
import { SectionContainer } from "@/src/components/shared/section-container";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { cn } from "@/utilities/tailwind";

interface Feature {
  label: string;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    label: "Your profile",
    title: "One place to keep your story current",
    description:
      "Submit updates, post milestones, and keep your profile fresh so funders always see the real you.",
  },
  {
    label: "Discovery",
    title: "Get found by foundations searching right now",
    description:
      "Karma is where active foundations look for grantees. A complete profile puts you in the room.",
  },
  {
    label: "Funding requests",
    title: "Post what you need, not just who you are",
    description:
      "Tell funders about a specific gap or initiative. Donors can match directly to that need.",
  },
  {
    label: "Track record",
    title: "Show your impact, not just your potential",
    description:
      "Past grants, completed milestones, and outcomes build credibility with every new funder you meet.",
  },
];

export function FeaturesSection() {
  return (
    <section className={cn(marketingLayoutTheme.padding, "flex flex-col items-start w-full")}>
      <SectionContainer className="flex flex-col items-start gap-12">
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
            What you get
          </Badge>

          <h2 className={cn("section-title", "text-left", "w-full")}>
            <span className="text-foreground">Be seen, get funded,</span>
            <br />
            <span className="text-muted-foreground">show what funding produced</span>
          </h2>

          <p
            className={cn(
              "text-muted-foreground font-normal text-left",
              "text-[18px] md:text-[20px] leading-[30px]",
              "w-full"
            )}
          >
            Karma turns your nonprofit&apos;s story into a living record that funders can search,
            verify, and trust.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          {features.map((feature) => (
            <div
              key={feature.label}
              className={cn("flex flex-col gap-3 p-8 md:p-10", "bg-secondary rounded-2xl")}
            >
              <span className="text-muted-foreground font-medium text-xs leading-[150%] tracking-[0.015em] uppercase">
                {feature.label}
              </span>
              <h3 className="text-foreground font-semibold text-[20px] leading-[120%] tracking-[-0.02em]">
                {feature.title}
              </h3>
              <p className="text-muted-foreground font-medium text-sm leading-[20px]">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </SectionContainer>
    </section>
  );
}
