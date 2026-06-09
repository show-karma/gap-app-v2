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
    label: "Share your URL",
    title: "Drop a link. We build the profile.",
    description:
      "Karma indexes your website, pulls together your work, impact, and team, and publishes a live funder-facing profile in minutes. If anything is missing, we email you to fill the gap.",
  },
  {
    label: "AI-run reporting, free",
    title: "Impact reports funders can actually find",
    description:
      "Our agents draft milestone updates and board-ready reports from the work you're already doing. Funders see your impact in real time instead of waiting for a quarterly PDF. Free for you.",
  },
  {
    label: "AI-run social, free",
    title: "Updates posted where funders watch",
    description:
      "Agents write and post your updates in your voice on the channels funders actually browse. Your wins stay visible, not buried in a doc nobody opens.",
  },
  {
    label: "Find funders, free",
    title: "Natural-language funder search",
    description:
      'Search Karma\'s funder map in plain English: "foundations funding bilingual education in the Bay Area." Free tool, no signup, results in seconds.',
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
            <span className="text-foreground">A live profile, ongoing reporting,</span>
            <br />
            <span className="text-muted-foreground">and funders who can find you.</span>
          </h2>

          <p
            className={cn(
              "text-muted-foreground font-normal text-left",
              "text-[18px] md:text-[20px] leading-[30px]",
              "w-full"
            )}
          >
            Share your website and Karma does the work. AI agents keep your funder-facing record
            current so you spend your time on the mission, not on paperwork.
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
