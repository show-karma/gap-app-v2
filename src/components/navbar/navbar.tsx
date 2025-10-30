"use client";

import { cn } from "@/utilities/tailwind";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/solid";
import Image from "next/image";
import Link from "next/link";
import { homepageTheme } from "../../helper/theme";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { ChevronDown, ChevronRight, CircleUser, LogOutIcon, Moon, PhoneCall } from "lucide-react";
import { ParagraphIcon } from "@/components/Icons/Paragraph";
import {
    ForBuildersContent,
    ForFundersContent,
    ExploreContent,
    ResourcesContent,
    MenuSection
} from "./menu-components";
import { NavbarSearch } from "./navbar-search";

// Temporary constant for auth state
const isLoggedIn = false;

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
    button: 'font-medium text-general-muted-foreground dark:text-zinc-200 flex flex-row gap-1 px-1',
    item: '',
    itemIcon: 'text-general-muted-foreground dark:text-zinc-200 w-4 h-4',
    itemText: 'text-black dark:text-white text-sm font-medium',
    itemDescription: 'text-general-muted-foreground dark:text-zinc-200 text-sm font-normal',
    image: '',
}

export function Navbar() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <nav
            className={cn(
                homepageTheme.padding,
                "flex justify-between w-full flex-row py-5 gap-8 max-w-[1920px] min-w-min items-center border-b border-b-zinc-100 dark:border-b-zinc-800"
            )}
        >
            {/* Logo */}
            <Link className="flex-shrink-0 max-w-[96px] max-h-[40px]" href="/">
                <Image
                    className="block w-full h-auto dark:hidden"
                    src="/logo/karma-gap-logo.svg"
                    alt="Gap"
                    width={96}
                    height={32}
                    priority={true}
                    quality={100}
                />
                <Image
                    className="hidden w-full h-auto dark:block"
                    src="/logo/karma-gap-logo-white.svg"
                    alt="Gap"
                    width={96}
                    height={32}
                    priority={true}
                />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-2 flex-1 lg:justify-between">
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
                                    <hr className="h-[1px] w-full border-zinc-200 dark:border-zinc-700" />
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
                                className="bg-zinc-100 border-none rounded px-3 py-1 dark:bg-zinc-700 text-sm font-medium text-zinc-900 dark:text-white hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                            >
                                Sign in
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 shadow-sm"
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
            </div>

            {/* Right Side - Social Media & User Profile (Only when logged in) */}
            <div className="hidden lg:flex items-center gap-3">
                {isLoggedIn && (
                    <>
                        {/* Social Media Icons */}
                        <div className="flex items-center gap-2">
                            {socialMediaLinks.map((social) => {
                                const IconComponent = social.icon;
                                return (
                                    <Link
                                        key={social.name}
                                        href={social.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                                        aria-label={social.name}
                                    >
                                        <IconComponent className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                                    </Link>
                                );
                            })}
                        </div>

                        {/* User Avatar Dropdown */}
                        <Menubar className="border-0 bg-transparent shadow-none p-0 h-auto">
                            <MenubarMenu>
                                <MenubarTrigger className="cursor-pointer p-0 hover:bg-transparent data-[state=open]:bg-transparent">
                                    <Avatar className="w-10 h-10">
                                        <AvatarImage src="https://github.com/shadcn.png" alt="User" />
                                        <AvatarFallback>U</AvatarFallback>
                                    </Avatar>
                                </MenubarTrigger>
                                <MenubarContent align="end">
                                    <Link href="/profile">
                                        <MenubarItem>
                                            <div className="flex items-center flex-row gap-2 justify-between">
                                                <div className="flex flex-row gap-2">
                                                    <CircleUser className={menuStyles.itemIcon} />
                                                    <span className={menuStyles.itemText}>
                                                        My profile
                                                    </span>
                                                </div>
                                                <ChevronRight className={menuStyles.itemIcon} />
                                            </div>
                                        </MenubarItem>
                                    </Link>
                                    <MenubarItem>
                                        <span className="flex items-center gap-2">
                                            <Moon className={menuStyles.itemIcon} />
                                            <span className={menuStyles.itemText}>
                                                Dark mode
                                            </span>
                                        </span>
                                    </MenubarItem>
                                    <MenubarItem>
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
                    </>
                )}
            </div>

            {/* Mobile Menu Button */}
            <div className="lg:hidden">
                <Drawer open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                    <DrawerTrigger asChild>
                        <button
                            className="p-2 text-zinc-700 dark:text-zinc-300"
                            aria-label="Open menu"
                        >
                            <Bars3Icon className="w-6 h-6" />
                        </button>
                    </DrawerTrigger>
                    <DrawerContent>
                        <DrawerHeader className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800">
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
                            <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
                                <MenuSection title="For Builders" variant="mobile" />
                                <ForBuildersContent variant="mobile" onClose={() => setMobileMenuOpen(false)} />
                            </div>

                            {/* For Funders Section */}
                            <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
                                <MenuSection title="For Funders" variant="mobile" />
                                <ForFundersContent variant="mobile" onClose={() => setMobileMenuOpen(false)} />
                            </div>

                            {/* Explore Section */}
                            <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
                                <MenuSection title="Explore" variant="mobile" className="mb-4" />
                                <ExploreContent variant="mobile" onClose={() => setMobileMenuOpen(false)} />
                            </div>

                            {/* Resources Section */}
                            <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
                                <MenuSection title="Resources" variant="mobile" />
                                <ResourcesContent variant="mobile" onClose={() => setMobileMenuOpen(false)} />
                            </div>

                            {/* Social Media */}
                            <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
                                <MenuSection title="Follow Us" variant="mobile" className="mb-6" />
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
                                                <IconComponent className="w-8 h-8 text-zinc-700 dark:text-zinc-300" />
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Mobile Auth */}
                            {isLoggedIn ? (
                                <div className="pt-2">
                                    <Link
                                        href="/profile"
                                        className="flex items-center justify-between p-3 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Avatar className="w-10 h-10">
                                                <AvatarImage src="https://github.com/shadcn.png" alt="User" />
                                                <AvatarFallback>U</AvatarFallback>
                                            </Avatar>
                                            <span className={menuStyles.itemText}>My profile</span>
                                        </div>
                                        <ChevronRight className={menuStyles.itemIcon} />
                                    </Link>
                                    <button className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left">
                                        <Moon className={menuStyles.itemIcon} />
                                        <span className={menuStyles.itemText}>Dark mode</span>
                                    </button>
                                    <button className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left">
                                        <LogOutIcon className={menuStyles.itemIcon} />
                                        <span className={menuStyles.itemText}>Log out</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="pt-2 flex flex-col gap-2">
                                    <Button
                                        variant="outline"
                                        className="w-full bg-zinc-100 border-none rounded px-3 py-2 dark:bg-zinc-700 text-sm font-medium text-zinc-900 dark:text-white"
                                        size="lg"
                                    >
                                        Sign in
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="lg"
                                        className="w-full border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 shadow-sm"
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
