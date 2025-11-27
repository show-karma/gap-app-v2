"use client";

import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuList,
    NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
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
import { useAuth } from "@/hooks/useAuth";
import { NavbarAuthButtons } from "./navbar-auth-buttons";
import { NavbarUserMenu } from "./navbar-user-menu";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { Logo } from "../shared/logo";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PAGES } from "@/utilities/pages";
import { useCommunitiesStore } from "@/store/communities";
import { useReviewerPrograms } from "@/hooks/usePermissions";
import { useStaff } from "@/hooks/useStaff";
import { useOwnerStore } from "@/store";
import { useRegistryStore } from "@/store/registry";

const menuStyles = {
    button: 'px-1 font-medium text-muted-foreground flex flex-row gap-1 hover:bg-transparent hover:text-foreground data-[state=open]:bg-transparent data-[state=open]:text-foreground shadow-none h-auto',
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
    const { authenticated: isLoggedIn } = useAuth();
    const { communities } = useCommunitiesStore();
    const { programs: reviewerPrograms } = useReviewerPrograms();
    const { isStaff } = useStaff();
    const isOwner = useOwnerStore((state) => state.isOwner);
    const { isPoolManager, isRegistryAdmin } = useRegistryStore();

    const hasReviewerRole = reviewerPrograms && reviewerPrograms.length > 0;
    const isCommunityAdmin = communities.length !== 0;
    const hasAdminAccess = isStaff || isOwner || isCommunityAdmin;
    const isRegistryAllowed = (isRegistryAdmin || isPoolManager) && isLoggedIn;

    return (
        <div className="hidden lg:flex items-center flex-1 lg:justify-between gap-8">
            <div className="flex flex-row items-center gap-3 flex-shrink-0">
                <Logo />
                {!isLoggedIn ? (
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
                ) : (
                    <div className="flex flex-row items-center gap-2">
                        <Button variant="secondary" size="sm" asChild>
                            <Link href={PAGES.MY_PROJECTS}>My projects</Link>
                        </Button>
                        {hasReviewerRole && (
                            <Button variant="secondary" size="sm" asChild>
                                <Link href={PAGES.MY_REVIEWS}>Review</Link>
                            </Button>
                        )}
                        {hasAdminAccess && (
                            <Button variant="secondary" size="sm" asChild>
                                <Link href={PAGES.ADMIN.LIST}>Admin</Link>
                            </Button>
                        )}
                        {isRegistryAllowed && (
                            <Button variant="secondary" size="sm" asChild>
                                <Link href={PAGES.REGISTRY.MANAGE_PROGRAMS}>Manage Programs</Link>
                            </Button>
                        )}
                    </div>
                )}
            </div>

            <div className="flex flex-1 justify-center flex-row items-center gap-3">
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
                                            <div className="flex flex-row items-center w-full justify-between gap-4 py-2">
                                                {socialMediaLinks.map((social) => {
                                                    const IconComponent = social.icon;
                                                    return (
                                                        <ExternalLink
                                                            key={social.name}
                                                            href={social.href}
                                                            className={cn(menuStyles.itemText, "flex items-center justify-center rounded-full transition-colors")}
                                                            aria-label={social.name}
                                                        >
                                                    <IconComponent className="w-5 h-5" />
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

