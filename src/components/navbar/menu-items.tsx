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
        description: "Get started and create your project"
    },
    {
        href: "/grants",
        icon: BanknoteArrowDown,
        title: "Find funding",
        description: "Explore live funding opportunities"
    }
];

export const forFundersItems = {
    main: {
        href: "/grants",
        icon: GoalIcon,
        title: "Launch a program",
        description: "Start funding impact in 30 days"
    },
    secondary: [
        {
            href: "/founders#case-studies",
            icon: GalleryThumbnails,
            title: "Case studies"
        },
        {
            href: "https://cal.com/karmahq",
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
            href: PAGES.PROJECTS_EXPLORER,
            icon: Flame,
            title: "Trending"
        },
        {
            href: PAGES.PROJECTS_EXPLORER,
            icon: BellDot,
            title: "Most active"
        }
    ],
    communities: [
        {
            href: PAGES.COMMUNITIES,
            icon: LayoutList,
            title: "All communities"
        },
        {
            href: "/grants",
            icon: Radio,
            title: "Active grants"
        }
    ]
};

export const resourcesItems = [
    {
        href: "/docs",
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

