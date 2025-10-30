"use client";

import { cn } from "@/utilities/tailwind";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/solid";
import Image from "next/image";
import Link from "next/link";
import { homepageTheme } from "../../helper/theme";
import { Button } from "@/components/ui/button";
import {
    Menubar,
    MenubarContent,
    MenubarItem,
    MenubarMenu,
    MenubarTrigger,
} from "@/components/ui/menubar";
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer";
import { useState } from "react";
import { TwitterIcon, DiscordIcon, TelegramIcon } from "@/components/Icons";
import { FarcasterIcon } from "@/components/Icons/Farcaster";
import { SOCIALS } from "@/utilities/socials";
import { ChevronDown, ChevronRight, CircleHelp, CircleUser, LogOutIcon, PhoneCall, ToggleLeft, ToggleRight } from "lucide-react";
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
import { useContributorProfile } from "@/hooks/useContributorProfile";
import EthereumAddressToENSAvatar from "@/components/EthereumAddressToENSAvatar";
import { PAGES } from "@/utilities/pages";


// Social media links with proper icons
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

const menuStyles = {
    button: 'font-medium text-muted-foreground flex flex-row gap-1 px-1',
    item: '',
    itemIcon: 'text-muted-foreground w-4 h-4',
    itemText: 'text-foreground text-sm font-medium',
    itemDescription: 'text-muted-foreground text-sm font-normal',
    image: '',
}

// Format address for display
const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

export function Navbar() {
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
    const { profile } = useContributorProfile(account?.address as `0x${string}`);

    const firstName = profile?.data?.name?.split(" ")[0] || "";

    const displayName = firstName || profile?.data?.name || account?.displayName;
    return (
        <nav
            className={cn(
                homepageTheme.padding,
                "flex justify-between bg-background w-full flex-row py-5 gap-8 max-w-[1920px] min-w-min items-center border-b border-border"
            )}
        >
            {/* Logo */}
            <Link className="flex-shrink-0 max-w-[96px] max-h-[40px]" href="/">
                <Image
                    className="block w-full h-auto dark:hidden"
                    src="/logo/karma-logo-light.svg"
                    alt="Gap"
                    width={96}
                    height={32}
                    priority={true}
                    quality={100}
                />
                <Image
                    className="hidden w-full h-auto dark:block"
                    src="/logo/karma-logo-dark.svg"
                    alt="Gap"
                    width={96}
                    height={32}
                    priority={true}
                />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-2 flex-1 lg:justify-between">
                {isLoggedIn ?
                    <Link href={PAGES.MY_PROJECTS}>
                        <Button variant="outline" className="bg-background rounded-lg shadow-sm border px-3 py-1 text-sm font-medium text-foreground hover:text-muted-foreground transition-colors border-border">
                            My projects
                        </Button>
                    </Link>

                    : <Menubar className="border-0 bg-transparent shadow-none p-0 h-auto space-x-1">
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
                    </Menubar>}


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
                                    <div className="flex flex-col gap-4 px-4 py-2">
                                        <ResourcesContent variant="desktop" />
                                        <hr className="h-[1px] w-full border-border" />
                                        <div className="flex flex-col items-start justify-start gap-2">
                                            <MenuSection title="Follow" variant="desktop" />
                                            <div className="flex flex-row items-center w-full justify-between gap-2">
                                                {socialMediaLinks.map((social) => {
                                                    const IconComponent = social.icon;
                                                    return (
                                                        <Link
                                                            key={social.name}
                                                            href={social.href}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className={cn(menuStyles.itemText, "flex items-center justify-center rounded-full transition-colors")}
                                                            aria-label={social.name}
                                                        >
                                                            <IconComponent className="w-6 h-6" />
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </MenubarContent>
                            </MenubarMenu>
                        </Menubar>

                        {/* Auth Buttons - Always visible between Resources and Social/Avatar */}
                        {!isLoggedIn && (
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="outline"
                                    className="bg-secondary border-none rounded px-3 py-1 text-sm font-medium text-secondary-foreground hover:text-muted-foreground transition-colors"
                                    onClick={login}
                                >
                                    Sign in
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-border text-foreground hover:bg-accent shadow-sm"
                                    asChild
                                >
                                    <Link href="https://cal.com/karmahq" target="_blank">
                                        <PhoneCall className="w-4 h-4" />
                                        Contact sales
                                    </Link>
                                </Button>
                            </div>
                        )}
                    </div>
                ) : null}
                {/* Right Side - Social Media & User Profile (Only when logged in) */}
                <div className="hidden lg:flex items-center gap-3">
                    {isLoggedIn && (
                        <div className="flex flex-row items-center gap-2">
                            <Link href={SOCIALS.DOCS}>
                                <Button variant="outline" className="cursor-pointer px-3 py-1 bg-secondary rounded-xl border-none">
                                    <CircleHelp className="w-4 h-4" />
                                </Button>
                            </Link>
                            <Menubar className="border-0 bg-transparent shadow-none p-0 h-auto">
                                <MenubarMenu>
                                    <MenubarTrigger className="cursor-pointer p-0 bg-secondary rounded-full data-[state=open]:opacity-90">
                                        <div className="flex items-center gap-0 p-0">
                                            <span className="truncate max-w-36 w-full text-foreground px-3 py-1.5 font-medium text-sm">{displayName}</span>
                                            <EthereumAddressToENSAvatar
                                                address={account?.address}
                                                className="h-8 w-8 min-h-8 min-w-8 max-h-8 max-w-8 rounded-full"
                                            />
                                        </div>
                                    </MenubarTrigger>
                                    <MenubarContent align="end" className="flex flex-col gap-4 px-4 py-4">
                                        <div className="flex flex-col items-start justify-start gap-2 p-0">
                                            <MenubarItem className="p-0 w-full" onClick={() => openProfileModal()}>
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
                                            <MenubarItem onClick={toggleTheme} className="p-0">
                                                <span className="flex items-center gap-2">
                                                    {currentTheme === "light" ? <ToggleLeft className={menuStyles.itemIcon} /> : <ToggleRight className={menuStyles.itemIcon} />}
                                                    <span className={menuStyles.itemText}>
                                                        {currentTheme === "light" ? "Dark mode" : "Light mode"}
                                                    </span>
                                                </span>
                                            </MenubarItem>
                                        </div>
                                        <hr className="h-[1px] w-full border-border" />
                                        <div className="flex flex-col items-start justify-start gap-2 px-0 p-0">
                                            <MenuSection title="Follow" variant="desktop" />
                                            <div className="flex flex-row items-center w-full justify-between gap-2">
                                                {socialMediaLinks.map((social) => {
                                                    const IconComponent = social.icon;
                                                    return (
                                                        <Link
                                                            key={social.name}
                                                            href={social.href}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className={cn(menuStyles.itemText, "flex items-center justify-center rounded-full transition-colors")}
                                                            aria-label={social.name}
                                                        >
                                                            <IconComponent className="w-6 h-6" />
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <hr className="h-[1px] w-full border-border" />
                                        <MenubarItem onClick={logout} className="p-0">
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
                    )}
                </div>
            </div>


            {/* Mobile Menu Button */}
            <div className="lg:hidden">
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

                            {/* My Projects Button - Only when logged in */}
                            {isLoggedIn && (
                                <div className="border-b border-border pb-4">
                                    <Link
                                        href={PAGES.MY_PROJECTS}
                                        className="w-full"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        <Button variant="outline" className="w-full bg-background rounded-lg shadow-sm border px-3 py-2 text-sm font-medium text-foreground hover:text-muted-foreground transition-colors border-border">
                                            My projects
                                        </Button>
                                    </Link>
                                </div>
                            )}

                            {/* For Builders Section - Only when NOT logged in */}
                            {!isLoggedIn && (
                                <div className="border-b border-border pb-4">
                                    <MenuSection title="For Builders" variant="mobile" />
                                    <ForBuildersContent variant="mobile" onClose={() => setMobileMenuOpen(false)} />
                                </div>
                            )}

                            {/* For Funders Section - Only when NOT logged in */}
                            {!isLoggedIn && (
                                <div className="border-b border-border pb-4">
                                    <MenuSection title="For Funders" variant="mobile" />
                                    <ForFundersContent variant="mobile" onClose={() => setMobileMenuOpen(false)} />
                                </div>
                            )}

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
                                                    <Link
                                                        key={social.name}
                                                        href={social.href}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="w-10 h-10 flex items-center justify-center rounded-full transition-colors"
                                                        aria-label={social.name}
                                                    >
                                                        <IconComponent className="w-8 h-8 text-muted-foreground" />
                                                    </Link>
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
                                        className="w-full flex items-center justify-between p-3 rounded-md hover:bg-accent text-left"
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
                                        className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-accent text-left"
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
                                    <Link
                                        href={SOCIALS.DOCS}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-accent text-left"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        <CircleHelp className={menuStyles.itemIcon} />
                                        <span className={menuStyles.itemText}>Help & Docs</span>
                                    </Link>
                                    <button
                                        className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-accent text-left mt-4"
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
                                                    <Link
                                                        key={social.name}
                                                        href={social.href}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="w-10 h-10 flex items-center justify-center rounded-full transition-colors"
                                                        aria-label={social.name}
                                                    >
                                                        <IconComponent className="w-8 h-8 text-muted-foreground" />
                                                    </Link>
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
                                        <Link href="https://cal.com/karmahq" target="_blank">
                                            <PhoneCall className="w-4 h-4" />
                                            Contact sales
                                        </Link>
                                    </Button>
                                </div>
                            )}
                        </div>
                    </DrawerContent>
                </Drawer>
            </div>
        </nav>
    );
}
