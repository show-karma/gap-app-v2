"use client";

import { cn } from "@/utilities/tailwind";
import {
    Menubar,
    MenubarContent,
    MenubarItem,
    MenubarMenu,
    MenubarTrigger,
} from "@/components/ui/menubar";
import { ChevronRight, CircleHelp, CircleUser, LogOutIcon, PhoneCall, ToggleLeft, ToggleRight, Wallet, FolderKanban, ShieldCheck, CheckCircle2, Settings, Heart } from "lucide-react";
import { SOCIALS } from "@/utilities/socials";
import { TwitterIcon, DiscordIcon, TelegramIcon } from "@/components/Icons";
import { ParagraphIcon } from "@/components/Icons/Paragraph";
import { MenuSection } from "./menu-components";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import EthereumAddressToENSAvatar from "@/components/EthereumAddressToENSAvatar";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "next-themes";
import { useContributorProfileModalStore } from "@/store/modals/contributorProfile";
import { useContributorProfile } from "@/hooks/useContributorProfile";
import { Button } from "@/components/ui/button";
import { NavbarUserSkeleton } from "./navbar-user-skeleton";
import Link from "next/link";
import { PAGES } from "@/utilities/pages";
import { useCommunitiesStore } from "@/store/communities";
import { useReviewerPrograms } from "@/hooks/usePermissions";
import { useStaff } from "@/hooks/useStaff";
import { useOwnerStore } from "@/store";
import { useRegistryStore } from "@/store/registry";

const menuStyles = {
    itemIcon: 'text-muted-foreground w-4 h-4',
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

const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

export function NavbarUserMenu() {
    const { authenticated: isLoggedIn, logout, address, ready } = useAuth();
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

    if (!ready) {
        return <NavbarUserSkeleton />;
    }

    if (!isLoggedIn) {
        return null;
    }

    return (
        <div className="hidden lg:flex items-center gap-3">
            <div className="flex flex-row items-center gap-2">
                <ExternalLink href={SOCIALS.DOCS}>
                    <Button variant="outline" className="cursor-pointer px-3 py-0 h-8 bg-secondary rounded-xl border-none">
                        <CircleHelp className="w-4 h-4" />
                    </Button>
                </ExternalLink>
                <Menubar className="border-0 bg-transparent shadow-none p-0 h-auto">
                    <MenubarMenu>
                        <MenubarTrigger className="cursor-pointer p-0 rounded-full data-[state=open]:opacity-90">
                            <div className="flex items-center gap-0 p-0">
                                <EthereumAddressToENSAvatar
                                    address={account?.address}
                                    className="h-8 w-8 min-h-8 min-w-8 max-h-8 max-w-8 rounded-full"
                                />
                            </div>
                        </MenubarTrigger>
                        <MenubarContent align="end" className="flex flex-col gap-4 py-3">
                            <div className="flex flex-col items-start justify-start gap-2">
                                <MenubarItem className="w-full">
                                    <div className="flex flex-row items-center gap-2">
                                        <Wallet className={menuStyles.itemIcon} />
                                        {address ? <span className={menuStyles.itemText}>{formatAddress(address)}</span> : <span className={menuStyles.itemText}>No wallet connected</span>}
                                    </div>
                                </MenubarItem>
                                <MenubarItem
                                    className="w-full"
                                    onClick={() => openProfileModal({
                                        isGlobal: true
                                    })}
                                >
                                    <div className="flex items-center w-full flex-row gap-2 justify-between">
                                        <div className="flex items-center flex-row gap-2">
                                            <CircleUser className={menuStyles.itemIcon} />
                                            <span className={menuStyles.itemText}>
                                                My profile
                                            </span>
                                        </div>
                                        <ChevronRight className={menuStyles.itemIcon} />
                                    </div>
                                </MenubarItem>
                                <MenubarItem onClick={toggleTheme} className="w-full">
                                    <span className="flex items-center gap-2 w-full">
                                        {currentTheme === "light" ? <ToggleLeft className={menuStyles.itemIcon} /> : <ToggleRight className={menuStyles.itemIcon} />}
                                        <span className={menuStyles.itemText}>
                                            {currentTheme === "light" ? "Dark mode" : "Light mode"}
                                        </span>
                                    </span>
                                </MenubarItem>
                            </div>
                            <hr className="h-[1px] w-full border-border" />
                            <div className="flex flex-col items-start justify-start gap-2">
                                <MenubarItem asChild className="w-full">
                                    <Link href={PAGES.MY_PROJECTS} className="flex items-center gap-2 w-full">
                                        <FolderKanban className={menuStyles.itemIcon} />
                                        <span className={menuStyles.itemText}>My projects</span>
                                    </Link>
                                </MenubarItem>
                                <MenubarItem asChild className="w-full">
                                    <Link href="/donations" className="flex items-center gap-2 w-full">
                                        <Heart className={menuStyles.itemIcon} />
                                        <span className={menuStyles.itemText}>My donations</span>
                                    </Link>
                                </MenubarItem>
                                {hasReviewerRole && (
                                    <MenubarItem asChild className="w-full">
                                        <Link href={PAGES.MY_REVIEWS} className="flex items-center gap-2 w-full">
                                            <CheckCircle2 className={menuStyles.itemIcon} />
                                            <span className={menuStyles.itemText}>Review</span>
                                        </Link>
                                    </MenubarItem>
                                )}
                                {hasAdminAccess && (
                                    <MenubarItem asChild className="w-full">
                                        <Link href={PAGES.ADMIN.LIST} className="flex items-center gap-2 w-full">
                                            <ShieldCheck className={menuStyles.itemIcon} />
                                            <span className={menuStyles.itemText}>Admin</span>
                                        </Link>
                                    </MenubarItem>
                                )}
                                {isRegistryAllowed && (
                                    <MenubarItem asChild className="w-full">
                                        <Link href={PAGES.REGISTRY.MANAGE_PROGRAMS} className="flex items-center gap-2 w-full">
                                            <Settings className={menuStyles.itemIcon} />
                                            <span className={menuStyles.itemText}>Manage Programs</span>
                                        </Link>
                                    </MenubarItem>
                                )}
                            </div>
                            <hr className="h-[1px] w-full border-border" />
                            <div className="flex flex-col items-start justify-start gap-2 px-2">
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
                            <hr className="h-[1px] w-full border-border" />
                            <MenubarItem onClick={logout}>
                                <div className="flex items-center gap-2">
                                    <LogOutIcon className={menuStyles.itemIcon} />
                                    <span className={menuStyles.itemText}>
                                        Log out
                                    </span>
                                </div>
                            </MenubarItem>
                        </MenubarContent>
                    </MenubarMenu>
                </Menubar>
            </div>
        </div>
    );
}

