"use client";

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
import { useAuth } from "@/hooks/useAuth";
import { NavbarAuthButtons } from "./navbar-auth-buttons";
import { NavbarUserMenu } from "./navbar-user-menu";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { Logo } from "../shared/logo";

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

    return (
        <div className="hidden xl:flex items-center flex-1 lg:justify-between gap-8">
            <div className="flex flex-row items-center gap-3 flex-shrink-0">
                <Logo />
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

