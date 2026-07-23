import {
  BanknoteArrowDown,
  BellDot,
  Bot,
  GalleryThumbnails,
  Github,
  GoalIcon,
  LayoutGrid,
  LayoutList,
  LifeBuoy,
  type LucideIcon,
  PhoneCall,
  Radio,
  ScrollText,
  UserPlus,
} from "lucide-react";
import { karmaLinks } from "@/utilities/karma/karma";
import { NON_PROFITS_PAGES, PAGES } from "@/utilities/pages";
import { SOCIALS } from "@/utilities/socials";

export interface MenuItem {
  href: string;
  icon: LucideIcon;
  title: string;
  description?: string;
  external?: boolean;
  showArrow?: boolean;
  openModal?: boolean;
  anchor?: string;
}

export interface ForFundersItems {
  main: MenuItem;
  secondary: MenuItem[];
}

export interface ExploreItems {
  projects: MenuItem[];
  communities: MenuItem[];
}

export const forProjectsItems: MenuItem[] = [
  {
    href: PAGES.FOR_PROJECTS,
    icon: UserPlus,
    title: "Create project",
    description: "Get started and create your project",
  },
  {
    href: PAGES.PROJECTS_EXPLORER,
    icon: LayoutGrid,
    title: "Explore projects",
    description: "Discover funded projects and their progress",
  },
  {
    href: PAGES.REGISTRY.ROOT,
    icon: BanknoteArrowDown,
    title: "Find funding",
    description: "Explore live funding opportunities",
  },
];

export const forNonprofitsItems: MenuItem[] = [
  {
    href: PAGES.NONPROFITS,
    icon: UserPlus,
    title: "Create profile",
    description: "Share your website. Karma builds the funder-facing profile.",
  },
  {
    href: NON_PROFITS_PAGES.HOME,
    icon: BanknoteArrowDown,
    title: "Find funders",
    description: "Search foundations and donors aligned to your cause.",
  },
];

export const forFundersItems: ForFundersItems = {
  main: {
    href: PAGES.FOUNDATIONS,
    icon: GoalIcon,
    title: "Launch a program",
    description: "Setup and start funding in 2 days",
  },
  secondary: [
    {
      href: PAGES.HOME,
      icon: GalleryThumbnails,
      title: "Case studies",
      anchor: "case-studies",
    },
    {
      href: SOCIALS.PARTNER_FORM,
      icon: PhoneCall,
      title: "Schedule demo",
      external: true,
    },
  ],
};

export const exploreItems: ExploreItems = {
  projects: [
    {
      href: PAGES.PROJECTS_EXPLORER,
      icon: LayoutGrid,
      title: "All projects",
    },
    {
      href: `${PAGES.PROJECTS_EXPLORER}?raisingFunds=true`,
      icon: BanknoteArrowDown,
      title: "Raising Funds",
    },
    {
      href: `${PAGES.PROJECTS_EXPLORER}?sortBy=noOfGrantMilestones&sortOrder=desc`,
      icon: BellDot,
      title: "Most Active",
    },
  ],
  communities: [
    {
      href: PAGES.COMMUNITIES,
      icon: LayoutList,
      title: "All communities",
    },
    {
      href: PAGES.REGISTRY.ROOT,
      icon: Radio,
      title: "Funding Map",
    },
  ],
};

export const resourcesItems: MenuItem[] = [
  {
    href: SOCIALS.DOCS,
    icon: LifeBuoy,
    title: "Docs",
    external: true,
    showArrow: true,
  },
  {
    href: SOCIALS.PARAGRAPH,
    icon: ScrollText,
    title: "Blog",
    external: true,
    showArrow: true,
  },
  {
    href: karmaLinks.skills,
    icon: Github,
    title: "Skills",
    external: true,
    showArrow: true,
  },
  {
    href: PAGES.FOR_AGENTS,
    icon: Bot,
    title: "For AI Agents",
    description: "Connect Karma to Claude, Cursor, and Codex via MCP",
  },
];
