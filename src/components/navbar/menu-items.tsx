import {
    UserPlus,
    BanknoteArrowDown,
    GoalIcon,
    GalleryThumbnails,
    PhoneCall,
    LayoutGrid,
    Flame,
    BellDot,
    LayoutList,
    Radio,
    LifeBuoy,
    ScrollText,
    ArrowUpRight
} from "lucide-react";
import { PAGES } from "@/utilities/pages";
import { SOCIALS } from "@/utilities/socials";

export const forBuildersItems = [
    {
        href: PAGES.MY_PROJECTS,
        icon: UserPlus,
        title: "Create project",
        description: "Get started and create your project",
        openModal: true
    },
    {
        href: PAGES.HOME,
        icon: BanknoteArrowDown,
        title: "Find funding",
        description: "Explore live funding opportunities",
        anchor: "live-funding-opportunities"
    }
];

export const forFundersItems = {
    main: {
        href: PAGES.REGISTRY.ROOT,
        icon: GoalIcon,
        title: "Launch a program",
        description: "Start funding impact in 30 days"
    },
    secondary: [
        {
            href: PAGES.FOUNDERS,
            icon: GalleryThumbnails,
            title: "Case studies",
            anchor: "case-studies"
        },
        {
            href: SOCIALS.PARTNER_FORM,
            icon: PhoneCall,
            title: "Schedule demo",
            external: true
        }
    ]
};

export const exploreItems = {
    projects: [
        {
            href: PAGES.PROJECTS_EXPLORER,
            icon: LayoutGrid,
            title: "All projects"
        },
        {
            href: `${PAGES.PROJECTS_EXPLORER}?sortBy=noOfGrants&sortOrder=desc`,
            icon: Flame,
            title: "Most Grants"
        },
        {
            href: `${PAGES.PROJECTS_EXPLORER}?sortBy=noOfGrantMilestones&sortOrder=desc`,
            icon: BellDot,
            title: "Most Active"
        }
    ],
    communities: [
        {
            href: PAGES.COMMUNITIES,
            icon: LayoutList,
            title: "All communities"
        },
        {
            href: PAGES.REGISTRY.ROOT,
            icon: Radio,
            title: "Latest opportunities"
        }
    ]
};

export const resourcesItems = [
    {
        href: SOCIALS.DOCS,
        icon: LifeBuoy,
        title: "Docs",
        external: true,
        showArrow: true
    },
    {
        href: SOCIALS.PARAGRAPH,
        icon: ScrollText,
        title: "Blog",
        external: true,
        showArrow: true
    }
];

