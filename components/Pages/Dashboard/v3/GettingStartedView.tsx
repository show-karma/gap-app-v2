"use client";

import dynamic from "next/dynamic";
import { memo } from "react";
import { Link } from "@/src/components/navigation/Link";
import { NON_PROFITS_PAGES, PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import { SoftIcon } from "./SoftIcon";
import { BTN_BASE, BTN_OUTLINE, BTN_SM, THUMB_BASE } from "./soft-classes";

const ProjectDialog = dynamic(
  () => import("@/components/Dialogs/ProjectDialog/index").then((mod) => mod.ProjectDialog),
  { ssr: false }
);

interface GettingStartedCard {
  key: string;
  icon: string;
  title: string;
  body: string;
  cta: { label: string; icon: string } & ({ href: string } | { dialog: "project" });
}

const CARDS: GettingStartedCard[] = [
  {
    key: "project",
    icon: "rocket",
    title: "Create a project",
    body: "Set up a project profile to track grants and share milestone progress with funders.",
    cta: { label: "Create project", icon: "plus", dialog: "project" },
  },
  {
    key: "funding",
    icon: "bank",
    title: "Apply for funding",
    body: "Browse open funding programs across communities and submit your first application.",
    cta: { label: "Explore programs", icon: "search", href: PAGES.REGISTRY.ROOT },
  },
  {
    key: "communities",
    icon: "users",
    title: "Explore communities",
    body: "Discover grant communities on Karma and the projects they fund.",
    cta: { label: "Browse communities", icon: "arrow", href: PAGES.COMMUNITIES },
  },
  {
    key: "review",
    icon: "eye",
    title: "Review applications",
    body: "Community admins can add you as a reviewer to evaluate grant applications and verify milestones.",
    cta: { label: "Browse communities", icon: "arrow", href: PAGES.COMMUNITIES },
  },
  {
    key: "funders",
    icon: "compass",
    title: "Find funders",
    body: "Search foundations and grants aligned to a mission — grounded in IRS 990 filings.",
    cta: { label: "Browse Find Funders", icon: "arrow", href: NON_PROFITS_PAGES.HOME },
  },
];

const Card = memo(function Card({ card }: { card: GettingStartedCard }) {
  const ctaClass = cn(BTN_BASE, BTN_SM, BTN_OUTLINE, "mt-auto self-start");
  return (
    <div className="flex flex-col gap-3 rounded-sf-card bg-sf-card p-5">
      <div className="flex items-center gap-2.5">
        <div className={cn(THUMB_BASE, "h-[34px] w-[34px] rounded-[10px]")}>
          <SoftIcon name={card.icon} className="h-5 w-5" />
        </div>
        <h3 className="m-0 text-[14.5px] font-[650] tracking-[-0.01em] text-sf-heading">
          {card.title}
        </h3>
      </div>
      <p className="my-0.5 text-[12.5px] leading-[1.5] text-sf-muted">{card.body}</p>
      {"dialog" in card.cta ? (
        <ProjectDialog
          buttonElement={{
            text: card.cta.label,
            icon: <SoftIcon name={card.cta.icon} className="h-4 w-4" />,
            iconSide: "left",
            // `!shadow-none` (important) is required: the Button's default variant
            // sets the custom `shadow-primary-button`, which twMerge doesn't treat
            // as a shadow-group conflict, so a plain `shadow-none` wouldn't win.
            styleClass: cn(ctaClass, "!shadow-none"),
          }}
        />
      ) : (
        <Link className={ctaClass} href={card.cta.href}>
          <SoftIcon name={card.cta.icon} className="h-4 w-4" />
          {card.cta.label}
        </Link>
      )}
    </div>
  );
});

/**
 * First-run overview shown when the user matches none of the role modules
 * (no projects, applications, communities, reviews, or funder-research
 * profile): simple cards introducing what they can do on Karma.
 */
export function GettingStartedView() {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-[3px]">
        <h2 className="m-0 text-2xl font-bold tracking-[-0.02em] text-sf-heading">
          Get started with Karma
        </h2>
        <p className="m-0 text-[13.5px] text-sf-muted">
          Pick a starting point — your dashboard fills in as you go.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-[14px] min-[640px]:grid-cols-2">
        {CARDS.map((card) => (
          <Card key={card.key} card={card} />
        ))}
      </div>
    </section>
  );
}
