"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuList,
    NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { ChevronDown } from "lucide-react";
import {
    ForBuildersContent,
    ForFundersContent,
    ExploreContent,
    ResourcesContent,
    MenuSection
} from "./menu-components";
import { NavbarSearch } from "./navbar-search";
import { SOCIALS } from "@/utilities/socials";
import { TwitterIcon, DiscordIcon, TelegramIcon } from "@/components/Icons";
import { ParagraphIcon } from "@/components/Icons/Paragraph";
import { cn } from "@/utilities/tailwind";
import { PAGES } from "@/utilities/pages";
import { useAuth } from "@/hooks/useAuth";
import { useCommunitiesStore } from "@/store/communities";
import { useAdminCommunities } from "@/hooks/useAdminCommunities";
import { useReviewerPrograms } from "@/hooks/usePermissions";
import { NavbarAuthButtons } from "./navbar-auth-buttons";
import { NavbarUserMenu } from "./navbar-user-menu";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { Logo } from "../shared/logo";

const menuStyles = {
    button: 'font-medium text-muted-foreground flex flex-row gap-1 bg-transparent hover:bg-transparent hover:text-muted-foreground data-[state=open]:bg-transparent data-[state=open]:text-muted-foreground shadow-none h-auto',
    itemText: 'text-foreground text-sm font-medium',
};

const socialMediaLinks = [
    {
        name: "Twitter",
        href: SOCIALS.TWITTER,
        icon: TwitterIcon
    },
    {
        name: "Telegram",
        href: SOCIALS.TELEGRAM,
        icon: TelegramIcon
    },
    {
        name: "Discord",
        href: SOCIALS.DISCORD,
        icon: DiscordIcon
    },
    {
        name: "Paragraph",
        href: SOCIALS.PARAGRAPH,
        icon: ParagraphIcon
    },
];

export function NavbarDesktopNavigation() {
    const { authenticated: isLoggedIn, address } = useAuth();
    const { communities } = useCommunitiesStore();
    useAdminCommunities(address);
    const { programs: reviewerPrograms } = useReviewerPrograms();

    const isCommunityAdmin = communities.length !== 0;
    const hasReviewerRole = reviewerPrograms && reviewerPrograms.length > 0;

    return (
        <div className="hidden lg:flex items-center flex-1 lg:justify-between">
            <div className="flex flex-row items-center gap-8">
                <Logo />
                {isLoggedIn ? (
                    <div className="flex flex-row items-center gap-2">
                        <Link href={PAGES.MY_PROJECTS}>
                            <Button variant="outline" className="bg-background rounded-lg shadow-sm border px-3 py-1 text-sm font-medium text-foreground hover:text-muted-foreground transition-colors border-border">
                                My projects
                            </Button>
                        </Link>
                        {hasReviewerRole && (
                            <Link href={PAGES.MY_REVIEWS}>
                                <Button variant="outline" className="bg-background rounded-lg shadow-sm border px-3 py-1 text-sm font-medium text-foreground hover:text-muted-foreground transition-colors border-border">
                                    Review
                                </Button>
                            </Link>
                        )}
                        {isCommunityAdmin && (
                            <Link href={PAGES.ADMIN.LIST}>
                                <Button variant="outline" className="bg-background rounded-lg shadow-sm border px-3 py-1 text-sm font-medium text-foreground hover:text-muted-foreground transition-colors border-border">
                                    Admin
                                </Button>
                            </Link>
                        )}
                    </div>
                ) : (
                    <NavigationMenu>
                        <NavigationMenuList>
                            {/* For Builders Dropdown */}
                            <NavigationMenuItem>
                                <NavigationMenuTrigger className={cn(menuStyles.button, "h-auto py-2")}>
                                    For Builders
                                </NavigationMenuTrigger>
                                <NavigationMenuContent>
                                    <div className="min-w-[500px] p-4">
                                        <ForBuildersContent variant="desktop" />
                                    </div>
                                </NavigationMenuContent>
                            </NavigationMenuItem>

                            {/* For Funders Dropdown */}
                            <NavigationMenuItem>
                                <NavigationMenuTrigger className={cn(menuStyles.button, "h-auto py-2")}>
                                    For Funders
                                </NavigationMenuTrigger>
                                <NavigationMenuContent>
                                    <div className="min-w-[500px] p-4">
                                        <ForFundersContent variant="desktop" />
                                    </div>
                                </NavigationMenuContent>
                            </NavigationMenuItem>
                        </NavigationMenuList>
                    </NavigationMenu>
                )}
            </div>

            <div className="flex flex-row items-center gap-4">
                {/* Search */}
                <NavbarSearch />
                <NavigationMenu>
                    <NavigationMenuList>
                        {/* Explore Dropdown */}
                        <NavigationMenuItem>
                            <NavigationMenuTrigger className={cn(menuStyles.button, "h-auto py-2")}>
                                Explore
                            </NavigationMenuTrigger>
                            <NavigationMenuContent>
                                <ExploreContent variant="desktop" />
                            </NavigationMenuContent>
                        </NavigationMenuItem>
                    </NavigationMenuList>
                </NavigationMenu>
            </div>

            {!isLoggedIn ? (
                <div className="flex flex-row items-center gap-4">
                    <NavigationMenu>
                        <NavigationMenuList>
                            {/* Resources Dropdown */}
                            <NavigationMenuItem>
                                <NavigationMenuTrigger className={cn(menuStyles.button, "h-auto py-2")}>
                                    Resources
                                </NavigationMenuTrigger>
                                <NavigationMenuContent>
                                    <div className="flex flex-col gap-4 px-4 py-4 w-max">
                                        <ResourcesContent variant="desktop" />
                                        <hr className="h-[1px] w-full border-border" />
                                        <div className="flex flex-col items-start justify-start w-full">
                                            <MenuSection title="Follow" variant="desktop" />
                                            <div className="flex flex-row items-center w-full justify-between gap-4 mt-2">
                                                {socialMediaLinks.map((social) => {
                                                    const IconComponent = social.icon;
                                                    return (
                                                        <ExternalLink
                                                            key={social.name}
                                                            href={social.href}
                                                            className={cn(menuStyles.itemText, "flex items-center justify-center rounded-full transition-colors")}
                                                            aria-label={social.name}
                                                        >
                                                            <IconComponent className="w-6 h-6" />
                                                        </ExternalLink>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </NavigationMenuContent>
                            </NavigationMenuItem>
                        </NavigationMenuList>
                    </NavigationMenu>

                    {/* Auth Buttons */}
                    <NavbarAuthButtons />
                </div>
            ) : null}

            {/* Right Side - Social Media & User Profile (Only when logged in) */}
            {isLoggedIn && <NavbarUserMenu />}
        </div>
    );
}

