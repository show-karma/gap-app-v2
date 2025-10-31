"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
    Menubar,
    MenubarContent,
    MenubarMenu,
    MenubarTrigger,
} from "@/components/ui/menubar";
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

const menuStyles = {
    button: 'font-medium text-muted-foreground flex flex-row gap-1',
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
        <div className="hidden lg:flex items-center gap-2 flex-1 lg:justify-between">
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
                <Menubar className="border-0 bg-transparent shadow-none p-0 h-auto space-x-1">
                    {/* For Builders Dropdown */}
                    <MenubarMenu>
                        <MenubarTrigger className={menuStyles.button}>
                            For Builders
                            <ChevronDown className="w-4 h-4" />
                        </MenubarTrigger>
                        <MenubarContent className="min-w-[500px] p-4">
                            <ForBuildersContent variant="desktop" />
                        </MenubarContent>
                    </MenubarMenu>

                    {/* For Funders Dropdown */}
                    <MenubarMenu>
                        <MenubarTrigger className={menuStyles.button}>
                            For Funders
                            <ChevronDown className="w-4 h-4" />
                        </MenubarTrigger>
                        <MenubarContent className="min-w-[500px] p-4">
                            <ForFundersContent variant="desktop" />
                        </MenubarContent>
                    </MenubarMenu>
                </Menubar>
            )}

            <div className="flex flex-row items-center gap-4">
                {/* Search */}
                <NavbarSearch />
                <Menubar className="border-0 bg-transparent shadow-none p-0 h-auto space-x-1">
                    {/* Explore Dropdown */}
                    <MenubarMenu>
                        <MenubarTrigger className={menuStyles.button}>
                            Explore
                            <ChevronDown className="w-4 h-4" />
                        </MenubarTrigger>
                        <MenubarContent>
                            <ExploreContent variant="desktop" />
                        </MenubarContent>
                    </MenubarMenu>
                </Menubar>
            </div>

            {!isLoggedIn ? (
                <div className="flex flex-row items-center gap-4">
                    <Menubar className="border-0 bg-transparent shadow-none p-0 h-auto space-x-1">
                        {/* Resources Dropdown */}
                        <MenubarMenu>
                            <MenubarTrigger className={menuStyles.button}>
                                Resources
                                <ChevronDown className="w-4 h-4" />
                            </MenubarTrigger>
                            <MenubarContent>
                                <div className="flex flex-col gap-4 px-2 py-2">
                                    <ResourcesContent variant="desktop" />
                                    <hr className="h-[1px] w-full border-border" />
                                    <div className="flex flex-col items-start justify-start gap-2">
                                        <MenuSection title="Follow" variant="desktop" />
                                        <div className="flex flex-row items-center w-full justify-between gap-2">
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
                            </MenubarContent>
                        </MenubarMenu>
                    </Menubar>

                    {/* Auth Buttons */}
                    <NavbarAuthButtons />
                </div>
            ) : null}

            {/* Right Side - Social Media & User Profile (Only when logged in) */}
            {isLoggedIn && <NavbarUserMenu />}
        </div>
    );
}

