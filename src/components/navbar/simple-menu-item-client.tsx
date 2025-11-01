"use client";

import Link from "next/link";
import { cn } from "@/utilities/tailwind";
import { LucideIcon, ArrowUpRight } from "lucide-react";
import { ExternalLink } from "@/components/Utilities/ExternalLink";

const menuStyles = {
    itemIcon: 'text-muted-foreground w-4 h-4',
    itemText: 'text-foreground text-sm font-medium',
};

interface SimpleMenuItemClientProps {
    href: string;
    icon: LucideIcon;
    title: string;
    external?: boolean;
    showArrow?: boolean;
    onClick?: () => void;
    variant?: 'desktop' | 'mobile';
}

export function SimpleMenuItemClient({
    href,
    icon: Icon,
    title,
    external,
    showArrow,
    onClick,
    variant = 'desktop'
}: SimpleMenuItemClientProps) {
    const content = (
        <div className="flex items-center flex-row gap-2">
            <Icon className={menuStyles.itemIcon} />
            <span className={menuStyles.itemText}>{title}</span>
            {showArrow && <ArrowUpRight className={cn(menuStyles.itemIcon, 'ml-auto')} />}
        </div>
    );

    if (variant === 'mobile') {
        if (external) {
            return (
                <ExternalLink
                    href={href}
                    className="flex items-center gap-2 px-0 py-1 rounded-md hover:bg-accent"
                    onClick={onClick}
                >
                    {content}
                </ExternalLink>
            );
        }
        return (
            <Link
                href={href}
                className="flex items-center gap-2 px-0 py-1 rounded-md hover:bg-accent"
                onClick={onClick}
            >
                {content}
            </Link>
        );
    }

    if (external) {
        return (
            <ExternalLink href={href} onClick={onClick} className="block">
                <div className="flex items-center flex-row gap-2 px-2 py-1.5 rounded-md hover:bg-accent">
                    {content}
                </div>
            </ExternalLink>
        );
    }

    return (
        <Link href={href} onClick={onClick} className="block">
            <div className="flex items-center flex-row gap-2 px-2 py-1.5 rounded-md hover:bg-accent">
                {content}
            </div>
        </Link>
    );
}

