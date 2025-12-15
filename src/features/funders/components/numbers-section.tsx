import { Badge } from "@/components/ui/badge";
import { SectionContainer } from "@/src/components/shared/section-container";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { cn } from "@/utilities/tailwind";

export interface Statistic {
  number: string;
  title: string;
  description: string;
}

const statistics: Statistic[] = [
  {
    number: "30+",
    title: "Ecosystems supported",
    description:
      "From Optimism to Celo, we've helped leading ecosystems run high-impact funding programs",
  },
  {
    number: "4k",
    title: "Projects tracked",
    description: "Builders using Karma to share progress, milestones, and impact",
  },
  {
    number: "50k",
    title: "Onchain attestations",
    description: "Verified milestones, endorsements, and evaluations across programs",
  },
  {
    number: "4x faster",
    title: "Program Launch Time",
    description:
      "Ecosystems go from idea to live funding in under 48 hours with our modular infrastructure",
  },
];

export function NumbersSection() {
  return (
    <section className={cn(marketingLayoutTheme.padding, "")}>
      <SectionContainer>
        <div className={cn("flex flex-col xl:flex-row gap-8 lg:gap-16 items-start w-full")}>
          {/* Left Column - Text Content */}
          <div
            className={cn(
              "flex flex-col gap-6",
              "w-full lg:w-auto lg:max-w-[500px] lg:flex-shrink-0"
            )}
          >
            {/* "The numbers" pill */}
            <Badge
              variant="secondary"
              className={cn(
                "text-secondary-foreground font-medium text-xs",
                "leading-[150%] tracking-[0.015em]",
                "rounded-full py-[3px] px-[8px]",
                "bg-secondary border-0 w-fit"
              )}
            >
              The Numbers
            </Badge>

            {/* Main Heading */}
            <h2 className={cn("text-foreground", "section-title")}>
              Proven expertise in ecosystem funding
            </h2>

            {/* Description */}
            <p
              className={cn(
                "text-muted-foreground font-normal",
                "text-[18px] leading-[28px] tracking-[0%]",
                "lg:text-[20px] lg:leading-[30px]"
              )}
            >
              We've powered some of the largest onchain funding programs, helping ecosystems
              distribute capital transparently, measure outcomes, and grow faster.
            </p>
          </div>

          {/* Right Column - Statistics Grid */}
          <div
            className={cn("grid grid-cols-1 md:grid-cols-2 gap-8", "w-full lg:flex-1 lg:min-w-0")}
          >
            {statistics.map((stat, index) => (
              <div key={index} className="flex flex-col gap-2">
                {/* Number with gradient */}
                {stat.number === "4x faster" ? (
                  <div className="flex items-baseline gap-1">
                    <span
                      className={cn("font-semibold text-[60px] leading-[72px] tracking-[-0.02em]")}
                      style={{
                        backgroundImage: "linear-gradient(180deg, #6A6A6A 5.77%, #D0D0D0 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                      }}
                    >
                      4x
                    </span>
                    <span
                      className={cn("text-lg font-medium leading-[72px]")}
                      style={{
                        backgroundImage: "linear-gradient(180deg, #6A6A6A 5.77%, #D0D0D0 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                      }}
                    >
                      faster
                    </span>
                  </div>
                ) : (
                  <div
                    className={cn("font-semibold text-[60px] leading-[72px] tracking-[-0.02em]")}
                    style={{
                      backgroundImage: "linear-gradient(180deg, #6A6A6A 5.77%, #D0D0D0 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    {stat.number}
                  </div>
                )}

                {/* Title */}
                <h3
                  className={cn(
                    "text-foreground font-medium text-[18px] leading-[28px] tracking-[0%]"
                  )}
                >
                  {stat.title}
                </h3>

                {/* Description */}
                <p
                  className={cn(
                    "text-muted-foreground font-normal text-base leading-[24px] tracking-[0%]"
                  )}
                >
                  {stat.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </SectionContainer>
    </section>
  );
}
