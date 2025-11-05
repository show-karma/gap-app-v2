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
import { PhoneCall, ChevronRight, CircleHelp, LogOutIcon, ToggleLeft, ToggleRight, FolderKanban, ShieldCheck, CheckCircle2 } from "lucide-react";
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

    const isCommunityAdmin = communities.length !== 0;
    const hasReviewerRole = reviewerPrograms && reviewerPrograms.length > 0;
    const hasAdminAccess = isStaff || isOwner || isCommunityAdmin;

    return (
        <div className="xl:hidden flex flex-row items-center gap-4 w-full justify-between">
            <Logo />
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
                        <div className="mb-4">
                            <NavbarSearch />
                        </div>


                        {/* For Builders Section */}
                        <div className="border-b border-border pb-4">
                            <MenuSection title="For Builders" variant="mobile" />
                            <ForBuildersContent variant="mobile" onClose={() => setMobileMenuOpen(false)} />
                        </div>

                        {/* For Funders Section */}
                        <div className="border-b border-border pb-4">
                            <MenuSection title="For Funders" variant="mobile" />
                            <ForFundersContent variant="mobile" onClose={() => setMobileMenuOpen(false)} />
                        </div>

                        {/* Explore Section */}
                        <div className="border-b border-border pb-4">
                            <MenuSection title="Explore" variant="mobile" className="mb-4" />
                            <ExploreContent variant="mobile" onClose={() => setMobileMenuOpen(false)} />
                        </div>

                        {/* Resources Section - Only when NOT logged in */}
                        {!isLoggedIn && (
                            <div className="border-b border-border pb-4">
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
                            <div className="pt-2">
                                <button
                                    className="w-full flex items-center justify-between py-3 rounded-md hover:bg-accent text-left"
                                    onClick={() => {
                                        openProfileModal();
                                        setMobileMenuOpen(false);
                                    }}
                                >
                                    <div className="flex items-center gap-3">
                                        <EthereumAddressToENSAvatar
                                            address={account?.address}
                                            className="h-6 w-6 min-h-6 min-w-6 max-h-6 max-w-6 rounded-full"
                                        />
                                        <span className={menuStyles.itemText}>My profile</span>
                                    </div>
                                    <ChevronRight className={menuStyles.itemIcon} />
                                </button>
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
                                <hr className="h-[1px] w-full border-border" />
                                <Link
                                    href={PAGES.MY_PROJECTS}
                                    className="w-full flex items-center gap-3 py-3 rounded-md hover:bg-accent text-left"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <FolderKanban className={menuStyles.itemIcon} />
                                    <span className={menuStyles.itemText}>My projects</span>
                                </Link>
                                {hasReviewerRole && (
                                    <Link
                                        href={PAGES.MY_REVIEWS}
                                        className="w-full flex items-center gap-3 py-3 rounded-md hover:bg-accent text-left"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        <CheckCircle2 className={menuStyles.itemIcon} />
                                        <span className={menuStyles.itemText}>Review</span>
                                    </Link>
                                )}
                                {hasAdminAccess && (
                                    <Link
                                        href={PAGES.ADMIN.LIST}
                                        className="w-full flex items-center gap-3 py-3 rounded-md hover:bg-accent text-left"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        <ShieldCheck className={menuStyles.itemIcon} />
                                        <span className={menuStyles.itemText}>Admin</span>
                                    </Link>
                                )}
                                <ExternalLink
                                    href={SOCIALS.DOCS}
                                    className="w-full flex items-center gap-3 py-3 rounded-md hover:bg-accent text-left"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <CircleHelp className={menuStyles.itemIcon} />
                                    <span className={menuStyles.itemText}>Help & Docs</span>
                                </ExternalLink>
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
                        ) : (
                            <div className="pt-2 flex flex-col gap-2">
                                <Button
                                    variant="outline"
                                    className="w-full bg-secondary border-none rounded px-3 py-2 text-sm font-medium text-secondary-foreground hover:text-muted-foreground transition-colors"
                                    size="lg"
                                    onClick={() => {
                                        login();
                                        setMobileMenuOpen(false);
                                    }}
                                >
                                    Sign in
                                </Button>
                                <Button
                                    variant="outline"
                                    size="lg"
                                    className="w-full border-border text-foreground hover:bg-accent shadow-sm"
                                    asChild
                                >
                                    <ExternalLink href={SOCIALS.PARTNER_FORM}>
                                        <PhoneCall className="w-4 h-4" />
                                        Contact sales
                                    </ExternalLink>
                                </Button>
                            </div>
                        )}
                    </div>
                </DrawerContent>
            </Drawer>
        </div>
    );
}

