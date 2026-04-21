"use client";

import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionContainer } from "@/src/components/shared/section-container";
import { CommunityImage } from "@/src/features/funders/components/community-image";
import { CustomerAvatar } from "@/src/features/funders/components/customer-avatar";
import { ScrollReveal } from "@/src/features/home/components/scroll-reveal";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { chosenCommunities } from "@/utilities/chosenCommunities";
import { cn } from "@/utilities/tailwind";

interface TestimonialCard {
  type: "testimonial";
  text: string;
  author: string;
  authorRole: string;
  communitySlug: string;
  avatar?: string;
}

interface CaseStudyCard {
  type: "case-study";
  headline: string;
  description: string;
  communitySlug: string;
  link?: string;
}

type CardType = TestimonialCard | CaseStudyCard;

const cards: CardType[] = [
  {
    type: "testimonial",
    text: "Karma isn't just software, they're a true partner. Their AI-driven evaluations cut review time dramatically. Their platform fits our needs perfectly and their team ships features at lightning speed.",
    author: "Gonna",
    authorRole: "Optimism Grants Council Lead",
    communitySlug: "optimism",
    avatar: "/images/homepage/gonna.png",
  },
  {
    type: "case-study",
    headline: "100+ hours saved on application evaluation",
    description: "AI-powered review reduced evaluation time across hundreds of applications, freeing the grants council to focus on strategy.",
    communitySlug: "optimism",
    link: "https://paragraph.com/@karmahq/optimism-grants-partners-with-karma-for-season-8",
  },
  {
    type: "case-study",
    headline: "400+ projects tracked on one platform in 10 months",
    description:
      "Celo moved from fragmented spreadsheets to a unified registry. 850+ grants and 3,600+ milestones, all visible in one place.",
    communitySlug: "celo",
    link: "https://paragraph.com/@karmahq/scaling-ecosystem-success-celo-case-study",
  },
  {
    type: "testimonial",
    text: "Karma has been a valuable partner in helping us grow and support our developer community. Their tools made it easy to recognize contributor impact and run more transparent, data-driven programs.",
    author: "Sophia Dew",
    authorRole: "Celo Devrel Lead",
    communitySlug: "celo",
    avatar: "/images/homepage/sophia-dew.png",
  },
];

function getCommunityImage(communitySlug: string): string | null {
  const communities = chosenCommunities(true);
  const community = communities.find((c) => c.slug === communitySlug);
  return community ? community.imageURL.light : null;
}

function TestimonialCardComponent({ card }: { card: TestimonialCard }) {
  return (
    <div className={cn("flex flex-col justify-between", "min-h-[317px] h-full w-full", "p-5")}>
      <div className="flex flex-col justify-between h-full max-md:gap-2 gap-8">
        <div className="flex flex-col gap-6">
          <span
            className={cn(
              "text-foreground",
              "font-semibold text-4xl leading-tight tracking-[-0.02em]"
            )}
          >
            {`\u201C`}
          </span>
          <p className={cn("text-foreground font-normal text-sm", "leading-[150%]")}>
            {card.text}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            {card.avatar && <CustomerAvatar src={card.avatar} alt={card.author} />}
            <span className={cn("text-foreground font-bold text-sm", "leading-5")}>
              {card.author}
            </span>
          </div>
          <span className={cn("text-muted-foreground font-medium text-sm", "leading-5")}>
            {card.authorRole}
          </span>
        </div>
      </div>
    </div>
  );
}

function CaseStudyCardComponent({ card }: { card: CaseStudyCard }) {
  const community = chosenCommunities(true).find((c) => c.slug === card.communitySlug);
  const imageUrl = getCommunityImage(card.communitySlug);

  return (
    <div
      className={cn(
        "flex flex-col justify-between",
        "min-h-[317px] h-full w-full",
        "rounded-2xl border border-border bg-background p-8"
      )}
    >
      <div className="flex flex-col gap-3">
        <h3 className={cn("text-foreground font-semibold", "text-2xl leading-tight tracking-tight")}>
          {card.headline}
        </h3>
        <p className={cn("text-muted-foreground font-normal text-sm", "leading-[150%]")}>
          {card.description}
        </p>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap mt-6">
        {community && imageUrl ? (
          <div className="flex items-center gap-2">
            <CommunityImage src={imageUrl} alt={community.name} />
            <span className={cn("text-foreground font-bold text-sm", "leading-5")}>
              {community.name}
            </span>
          </div>
        ) : (
          <div />
        )}

        {card.link ? (
          <ExternalLink href={card.link}>
            <Button
              variant="outline"
              className={cn("border-border text-foreground", "rounded-md font-medium")}
            >
              Read Case Study
            </Button>
          </ExternalLink>
        ) : null}
      </div>
    </div>
  );
}

export function CaseStudiesSection() {
  return (
    <section
      className={cn(marketingLayoutTheme.padding, "flex flex-col items-start w-full")}
      id="case-studies"
    >
      <SectionContainer className="flex flex-col items-start gap-12">
        <ScrollReveal variant="fade-up">
        <div className="flex flex-col items-start gap-4 w-full">
          <Badge
            variant="secondary"
            className={cn(
              "text-secondary-foreground font-medium text-xs",
              "leading-[150%] tracking-[0.015em]",
              "rounded-full py-[3px] px-2",
              "bg-secondary border-0 w-fit"
            )}
          >
            Case Studies
          </Badge>

          <h2 className={cn("section-title", "w-full")}>
            <span className="text-foreground">Organizations trust Karma</span>{" "}
            <br className="hidden md:block" />
            <span className="text-muted-foreground">to run their funding programs</span>
          </h2>
        </div>
        </ScrollReveal>

        <div
          className={cn(
            "grid grid-cols-1 md:grid-cols-6 gap-10 w-full",
            "items-stretch"
          )}
        >
          <ScrollReveal variant="fade-left" className="md:col-span-2">
            <TestimonialCardComponent card={cards[0] as TestimonialCard} />
          </ScrollReveal>
          <ScrollReveal variant="fade-right" delay={150} className="md:col-span-4">
            <CaseStudyCardComponent card={cards[1] as CaseStudyCard} />
          </ScrollReveal>
          <ScrollReveal variant="fade-left" delay={100} className="md:col-span-4">
            <CaseStudyCardComponent card={cards[2] as CaseStudyCard} />
          </ScrollReveal>
          <ScrollReveal variant="fade-right" delay={250} className="md:col-span-2">
            <TestimonialCardComponent card={cards[3] as TestimonialCard} />
          </ScrollReveal>
        </div>
      </SectionContainer>
    </section>
  );
}
