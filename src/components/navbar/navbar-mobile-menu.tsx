"use client";

import { useState } from "react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/solid";
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PhoneCall, ChevronRight, CircleHelp, LogOutIcon, ToggleLeft, ToggleRight } from "lucide-react";
import { SOCIALS } from "@/utilities/socials";
import { TwitterIcon, DiscordIcon, TelegramIcon } from "@/components/Icons";
import { ParagraphIcon } from "@/components/Icons/Paragraph";
import {
    ForBuildersContent,
    ForFundersContent,
    ExploreContent,
    ResourcesContent,
    MenuSection
} from "./menu-components";
import { NavbarSearch } from "./navbar-search";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "next-themes";
import { useContributorProfileModalStore } from "@/store/modals/contributorProfile";
import EthereumAddressToENSAvatar from "@/components/EthereumAddressToENSAvatar";
import { PAGES } from "@/utilities/pages";
import { useCommunitiesStore } from "@/store/communities";
import { useReviewerPrograms } from "@/hooks/usePermissions";
import { useStaff } from "@/hooks/useStaff";
import { useOwnerStore } from "@/store";
import { useRegistryStore } from "@/store/registry";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { Logo } from "../shared/logo";

const menuStyles = {
    itemText: 'text-foreground text-sm font-medium',
    itemIcon: 'text-muted-foreground w-4 h-4',
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

const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

export function NavbarMobileMenu() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { authenticated: isLoggedIn, authenticate: login, logout, address } = useAuth();
    const { theme: currentTheme, setTheme: changeCurrentTheme } = useTheme();
    const toggleTheme = () => {
        changeCurrentTheme(currentTheme === "light" ? "dark" : "light");
    }

    const { openModal: openProfileModal } = useContributorProfileModalStore();
    const account = address
        ? {
            address,
            displayName: formatAddress(address),
        }
        : undefined;

    // Check admin and reviewer permissions
    const { communities } = useCommunitiesStore();
    const { programs: reviewerPrograms } = useReviewerPrograms();
    const { isStaff } = useStaff();
    const isOwner = useOwnerStore((state) => state.isOwner);
    const { isPoolManager, isRegistryAdmin } = useRegistryStore();

    const isCommunityAdmin = communities.length !== 0;
    const hasReviewerRole = reviewerPrograms && reviewerPrograms.length > 0;
    const hasAdminAccess = isStaff || isOwner || isCommunityAdmin;
    const isRegistryAllowed = (isRegistryAdmin || isPoolManager) && isLoggedIn;

    const quickActions = [
        {
            label: "My projects",
            href: PAGES.MY_PROJECTS,
            visible: isLoggedIn,
        },
        {
            label: "Review",
            href: PAGES.MY_REVIEWS,
            visible: isLoggedIn && hasReviewerRole,
        },
        {
            label: "Admin",
            href: PAGES.ADMIN.LIST,
            visible: isLoggedIn && hasAdminAccess,
        },
        {
            label: "Manage Programs",
            href: PAGES.REGISTRY.MANAGE_PROGRAMS,
            visible: isRegistryAllowed,
        },
    ].filter((action) => action.visible);

    return (
        <div className="lg:hidden flex flex-row items-center gap-3 w-full">
            <Logo />
            <div className="flex flex-row items-center gap-2 ml-auto">
                {!isLoggedIn ? (
                    <>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => login()}
                        >
                            Sign in
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="border-border text-foreground hover:bg-accent shadow-sm"
                            asChild
                        >
                            <ExternalLink href={SOCIALS.PARTNER_FORM}>
                                Contact sales
                            </ExternalLink>
                        </Button>
                    </>
                ) : (
                    <button
                        className="flex items-center gap-2 rounded-full border border-border p-1"
                        onClick={() => openProfileModal({ isGlobal: true })}
                        aria-label="Open profile"
                    >
                        <EthereumAddressToENSAvatar
                            address={account?.address}
                            className="h-8 w-8 min-h-8 min-w-8 max-h-8 max-w-8 rounded-full"
                        />
                        {address && (
                            <span className="text-sm text-muted-foreground inline px-1">
                                {formatAddress(address)}
                            </span>
                        )}
                    </button>
                )}
                <Drawer open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                    <DrawerTrigger asChild>
                        <button
                            className="p-2 text-muted-foreground"
                            aria-label="Open menu"
                        >
                            <Bars3Icon className="w-6 h-6" />
                        </button>
                    </DrawerTrigger>
                    <DrawerContent>
                        <DrawerHeader className="flex items-center justify-between border-b border-border">
                            <DrawerTitle>Menu</DrawerTitle>
                            <DrawerClose asChild>
                                <button className="p-2" aria-label="Close menu">
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </DrawerClose>
                        </DrawerHeader>
                    <div className="flex flex-col p-4 gap-2 max-h-[70vh] overflow-y-auto">
                        {/* Mobile Search */}
                        <div className="mb-4 w-full">
                            <NavbarSearch />
                        </div>

                        {isLoggedIn && quickActions.length > 0 && (
                            <div className="mb-4 flex flex-col items-start justify-start gap-2">
                                {quickActions.map((action) => (
                                    <Button
                                        key={action.href}
                                        variant="secondary"
                                        asChild
                                    >
                                        <Link
                                            href={action.href}
                                            onClick={() => setMobileMenuOpen(false)}
                                        >
                                            {action.label}
                                        </Link>
                                    </Button>
                                ))}
                            </div>
                        )}

                        {!isLoggedIn && (
                            <>
                                {/* For Builders Section */}
                                <div className="border-b border-border py-3">
                                    <MenuSection title="For Builders" variant="mobile" />
                                    <ForBuildersContent variant="mobile" onClose={() => setMobileMenuOpen(false)} />
                                </div>

                                {/* For Funders Section */}
                                <div className="border-b border-border py-3">
                                    <MenuSection title="For Funders" variant="mobile" />
                                    <ForFundersContent variant="mobile" onClose={() => setMobileMenuOpen(false)} />
                                </div>
                            </>
                        )}

                        {/* Explore Section */}
                        <div className="border-b border-border py-5">
                            <ExploreContent variant="mobile" onClose={() => setMobileMenuOpen(false)} />
                        </div>

                        {/* Resources Section - Only when NOT logged in */}
                        {!isLoggedIn && (
                            <div className="border-b border-border py-3">
                                <MenuSection title="Resources" variant="mobile" />
                                <ResourcesContent variant="mobile" onClose={() => setMobileMenuOpen(false)} />
                                <div className="mt-4 pt-4 border-t border-border">
                                    <MenuSection title="Follow" variant="mobile" className="mb-4" />
                                    <div className="flex items-center gap-2">
                                        {socialMediaLinks.map((social) => {
                                            const IconComponent = social.icon;
                                            return (
                                                <ExternalLink
                                                    key={social.name}
                                                    href={social.href}
                                                    className="w-10 h-10 flex items-center justify-center rounded-full transition-colors"
                                                    aria-label={social.name}
                                                >
                                                    <IconComponent className="w-8 h-8 text-muted-foreground" />
                                                </ExternalLink>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Mobile Auth */}
                        {isLoggedIn ? (
                            <div className="py-3">
                                <button
                                    className="w-full flex items-center gap-3 py-3 rounded-md hover:bg-accent text-left"
                                    onClick={toggleTheme}
                                >
                                    {currentTheme === "light" ? (
                                        <ToggleLeft className={menuStyles.itemIcon} />
                                    ) : (
                                        <ToggleRight className={menuStyles.itemIcon} />
                                    )}
                                    <span className={menuStyles.itemText}>
                                        {currentTheme === "light" ? "Dark mode" : "Light mode"}
                                    </span>
                                </button>
                                <ExternalLink
                                    href={SOCIALS.DOCS}
                                    className="w-full flex items-center gap-3 py-3 rounded-md hover:bg-accent text-left"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <CircleHelp className={menuStyles.itemIcon} />
                                    <span className={menuStyles.itemText}>Docs</span>
                                </ExternalLink>
                                <hr className="h-[1px] w-full border-border" />
                                <button
                                    className="w-full flex items-center gap-3 rounded-md hover:bg-accent text-left mt-4"
                                    onClick={() => {
                                        logout();
                                        setMobileMenuOpen(false);
                                    }}
                                >
                                    <LogOutIcon className={menuStyles.itemIcon} />
                                    <span className={menuStyles.itemText}>Log out</span>
                                </button>
                                <div className="mt-4 pt-4 border-t border-border flex flex-col items-center">
                                    <MenuSection title="Follow" variant="mobile" className="mb-4" />
                                    <div className="flex items-center gap-2">
                                        {socialMediaLinks.map((social) => {
                                            const IconComponent = social.icon;
                                            return (
                                                <ExternalLink
                                                    key={social.name}
                                                    href={social.href}
                                                    className="w-10 h-10 flex items-center justify-center rounded-full transition-colors"
                                                    aria-label={social.name}
                                                >
                                                    <IconComponent className="w-8 h-8 text-muted-foreground" />
                                                </ExternalLink>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>
                    </DrawerContent>
                </Drawer>
            </div>
        </div>
    );
}

