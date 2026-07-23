"use client";

import dynamic from "next/dynamic";
import { memo } from "react";
import { Link } from "@/src/components/navigation/Link";
import { NON_PROFITS_PAGES, PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import type { DashboardModuleKey } from "./module";
import { SoftIcon } from "./SoftIcon";
import { BTN_BASE, BTN_OUTLINE, BTN_SM, THUMB_BASE } from "./soft-classes";

const ProjectDialog = dynamic(
  () => import("@/components/Dialogs/ProjectDialog/index").then((mod) => mod.ProjectDialog),
  { ssr: false }
);

interface GettingStartedCard {
  key: string;
  /**
   * The role module this card introduces. When the user already has that
   * module, the card is redundant and is filtered out of the secondary row.
   */
  moduleKey?: DashboardModuleKey;
  icon: string;
  title: string;
  body: string;
  cta: { label: string; icon: string } & ({ href: string } | { dialog: "project" });
}

const CARDS: GettingStartedCard[] = [
  {
    key: "project",
    moduleKey: "projects",
    icon: "rocket",
    title: "Create a project",
    body: "Set up a project profile to track grants and share milestone progress with funders.",
    cta: { label: "Create project", icon: "plus", dialog: "project" },
  },
  {
    key: "funding",
    moduleKey: "applications",
    icon: "bank",
    title: "Apply for funding",
    body: "Browse open funding programs across communities and submit your first application.",
    cta: { label: "Explore programs", icon: "search", href: PAGES.REGISTRY.ROOT },
  },
  {
    key: "communities",
    moduleKey: "communities",
    icon: "users",
    title: "Explore communities",
    body: "Discover grant communities on Karma and the projects they fund.",
    cta: { label: "Browse communities", icon: "arrow", href: PAGES.COMMUNITIES },
  },
  {
    key: "funders",
    moduleKey: "advisor",
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

interface GettingStartedViewProps {
  /**
   * Role modules the user already has. Cards that introduce one of these are
   * filtered out so the secondary row only surfaces starting points the user
   * hasn't set up yet. Omit for the first-run (no-modules) state.
   */
  activeModuleKeys?: string[];
  /**
   * `"full"` — the first-run overview (user has no role modules).
   * `"secondary"` — a follow-on row beneath the user's existing modules.
   */
  variant?: "full" | "secondary";
}

/**
 * Getting-started cards introducing what the user can do on Karma. Rendered
 * either as the first-run overview (`variant="full"`, when the user matches no
 * role module) or as a secondary row beneath a user's existing modules
 * (`variant="secondary"`), filtered to the starting points they haven't set up.
 */
export function GettingStartedView({
  activeModuleKeys,
  variant = "full",
}: GettingStartedViewProps = {}) {
  const active = new Set(activeModuleKeys ?? []);
  const cards = CARDS.filter((card) => !card.moduleKey || !active.has(card.moduleKey));

  if (cards.length === 0) return null;

  const isSecondary = variant === "secondary";
  const heading = isSecondary ? "Explore more on Karma" : "Get started with Karma";
  const subtitle = isSecondary
    ? "Other ways to make the most of your dashboard."
    : "Pick a starting point — your dashboard fills in as you go.";

  return (
    <section
      className={cn(
        "flex flex-col gap-4",
        // As a follow-on row, set it apart from the modules above with a divider
        // and generous breathing room so the two sections read as distinct.
        isSecondary && "mt-6 border-t border-sf-line pt-8"
      )}
    >
      <div className="flex flex-col gap-[3px]">
        <h2 className="m-0 text-2xl font-bold tracking-[-0.02em] text-sf-heading">{heading}</h2>
        <p className="m-0 text-[13.5px] text-sf-muted">{subtitle}</p>
      </div>
      <div
        className={cn(
          "grid grid-cols-1 gap-[14px]",
          // Only split into two columns when there's more than one card, so a
          // lone leftover card (all others filtered out) spans the full width
          // instead of sitting in a half-row with a large empty gap.
          cards.length > 1 && "min-[640px]:grid-cols-2"
        )}
      >
        {cards.map((card) => (
          <Card key={card.key} card={card} />
        ))}
      </div>
    </section>
  );
}
