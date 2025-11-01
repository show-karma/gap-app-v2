"use client";

import Link from "next/link";
import { Logo } from "../shared/logo";
import { Newsletter } from "./newsletter";
import { TwitterIcon, DiscordIcon, TelegramIcon } from "@/components/Icons";
import { ParagraphIcon } from "@/components/Icons/Paragraph";
import { SOCIALS } from "@/utilities/socials";
import { PAGES } from "@/utilities/pages";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { karmaLinks } from "@/utilities/karma/karma";
import { cn } from "@/utilities/tailwind";
import { homepageTheme } from "@/src/helper/theme";

const navigationLinks = [
    { label: "For Builders", href: PAGES.HOME },
    { label: "For Funders", href: PAGES.FUNDERS },
    { label: "Blog", href: SOCIALS.PARAGRAPH },
    { label: "Support", href: SOCIALS.DOCS },
    { label: "SDK Docs", href: karmaLinks.githubSDK },
];

const socialMediaLinks = [
    {
        name: "Twitter",
        href: SOCIALS.TWITTER,
        icon: TwitterIcon,
    },
    {
        name: "Telegram",
        href: SOCIALS.TELEGRAM,
        icon: TelegramIcon,
    },
    {
        name: "Discord",
        href: SOCIALS.DISCORD,
        icon: DiscordIcon,
    },
    {
        name: "Paragraph",
        href: SOCIALS.PARAGRAPH,
        icon: ParagraphIcon,
    },
];

const legalLinks = [
    { label: "Terms", href: PAGES.TERMS_AND_CONDITIONS },
    { label: "Privacy", href: PAGES.PRIVACY_POLICY },
];

export function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className={cn("w-full bg-background flex flex-col items-center justify-center")}>
            <div className={cn(homepageTheme.padding, "w-full max-w-[1920px] flex flex-col")}>
                {/* Main Footer Content */}
                <div className="w-full py-12">
                    <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between lg:gap-12">
                        {/* Left Section - Logo, Navigation, Social */}
                        <div className="flex flex-col gap-6">
                            <Logo />

                            {/* Navigation Links */}
                            <nav className="flex flex-col md:flex-row md:flex-wrap gap-x-6 gap-y-2">
                                {navigationLinks.map((link) => {
                                    const isExternal = link.href.startsWith("http");
                                    const LinkComponent = isExternal ? ExternalLink : Link;
                                    const linkProps = isExternal
                                        ? { href: link.href }
                                        : { href: link.href };

                                    return (
                                        <LinkComponent
                                            key={link.label}
                                            {...linkProps}
                                            className={cn(
                                                "font-semibold text-base leading-6 text-muted-foreground",
                                                "hover:text-foreground transition-colors"
                                            )}
                                        >
                                            {link.label}
                                        </LinkComponent>
                                    );
                                })}
                            </nav>

                            {/* Social Media Icons */}
                            <div className="flex flex-row items-center gap-4">
                                {socialMediaLinks.map((social) => {
                                    const IconComponent = social.icon;
                                    return (
                                        <ExternalLink
                                            key={social.name}
                                            href={social.href}
                                            className="text-foreground transition-colors"
                                            aria-label={social.name}
                                        >
                                            <IconComponent className="w-8 h-8" />
                                        </ExternalLink>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Right Section - Newsletter */}
                        <div className="hidden lg:block lg:flex-shrink-0">
                            <Newsletter />
                        </div>
                    </div>
                </div>
            </div>
            <hr className="w-full h-[1px] bg-border" />
            <div className={cn(homepageTheme.padding, "w-full pt-0 pb-4 max-w-[1920px] flex flex-col")}>

                {/* Bottom Section - Copyright and Legal Links */}
                <div className="w-full py-6">
                    <div className="flex flex-col gap-4 sm:flex-row md:flex-row-reverse sm:items-center sm:justify-between">
                        {/* Legal Links */}
                        <div className="flex flex-wrap gap-x-6 gap-y-2">
                            {legalLinks.map((link) => {
                                const isExternal = link.href.startsWith("http");
                                const LinkComponent = isExternal ? ExternalLink : Link;
                                const linkProps = { href: link.href };

                                return (
                                    <LinkComponent
                                        key={link.label}
                                        {...linkProps}
                                        className={cn(
                                            "font-normal text-base leading-6 text-muted-foreground",
                                            "hover:text-foreground transition-colors"
                                        )}
                                    >
                                        {link.label}
                                    </LinkComponent>
                                );
                            })}
                        </div>

                        {/* Copyright */}
                        <p className="font-normal text-base leading-6 text-muted-foreground">
                            © {currentYear} Karma. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
}

