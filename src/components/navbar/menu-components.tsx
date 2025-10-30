import Link from "next/link";
import Image from "next/image";
import { MenubarItem } from "@/components/ui/menubar";
import { cn } from "@/utilities/tailwind";
import { LucideIcon, ArrowUpRight } from "lucide-react";
import {
    forBuildersItems,
    forFundersItems,
    exploreItems,
    resourcesItems
} from "./menu-items";

const menuStyles = {
    itemIcon: 'text-general-muted-foreground dark:text-zinc-200 w-4 h-4',
    itemText: 'text-black dark:text-white text-sm font-medium',
    itemDescription: 'text-general-muted-foreground dark:text-zinc-200 text-sm font-normal',
};

interface MenuItemProps {
    href: string;
    icon: LucideIcon;
    title: string;
    description?: string;
    external?: boolean;
    showArrow?: boolean;
    onClick?: () => void;
    variant?: 'desktop' | 'mobile';
}

export function MenuItem({
    href,
    icon: Icon,
    title,
    description,
    external,
    showArrow,
    onClick,
    variant = 'desktop'
}: MenuItemProps) {
    const content = (
        <>
            <div className="flex items-center gap-2 mb-1">
                <Icon className={menuStyles.itemIcon} />
                <span className={menuStyles.itemText}>{title}</span>
                {showArrow && <ArrowUpRight className={cn(menuStyles.itemIcon, 'ml-auto')} />}
            </div>
            {description && (
                <p className={menuStyles.itemDescription}>{description}</p>
            )}
        </>
    );

    if (variant === 'mobile') {
        return (
            <Link
                href={href}
                className="flex flex-col px-0 py-3 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
                onClick={onClick}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
                {content}
            </Link>
        );
    }

    return (
        <Link href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
            <MenubarItem className="flex flex-col items-start rounded-md cursor-pointer p-1">
                {content}
            </MenubarItem>
        </Link>
    );
}

interface SimpleMenuItemProps {
    href: string;
    icon: LucideIcon;
    title: string;
    external?: boolean;
    showArrow?: boolean;
    onClick?: () => void;
    variant?: 'desktop' | 'mobile';
}

export function SimpleMenuItem({
    href,
    icon: Icon,
    title,
    external,
    showArrow,
    onClick,
    variant = 'desktop'
}: SimpleMenuItemProps) {
    const content = (
        <div className="flex items-center flex-row gap-2">
            <Icon className={menuStyles.itemIcon} />
            <span className={menuStyles.itemText}>{title}</span>
            {showArrow && <ArrowUpRight className={cn(menuStyles.itemIcon, 'ml-auto')} />}
        </div>
    );

    if (variant === 'mobile') {
        return (
            <Link
                href={href}
                className="flex items-center gap-2 px-0 py-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
                onClick={onClick}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
                {content}
            </Link>
        );
    }

    return (
        <Link href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
            <MenubarItem className="p-0 cursor-pointer">
                {content}
            </MenubarItem>
        </Link>
    );
}

interface MenuSectionProps {
    title: string;
    variant?: 'desktop' | 'mobile';
    className?: string;
}

export function MenuSection({ title, variant = 'desktop', className }: MenuSectionProps) {
    if (variant === 'mobile') {
        return (
            <h3 className={cn(menuStyles.itemDescription, className)}>
                {title}
            </h3>
        );
    }

    return (
        <p className={cn(menuStyles.itemDescription, className)}>{title}</p>
    );
}

// For Builders Section
interface ForBuildersContentProps {
    variant?: 'desktop' | 'mobile';
    onClose?: () => void;
}

export function ForBuildersContent({ variant = 'desktop', onClose }: ForBuildersContentProps) {
    if (variant === 'mobile') {
        return (
            <>
                {forBuildersItems.map((item) => (
                    <MenuItem
                        key={item.href}
                        {...item}
                        variant="mobile"
                        onClick={onClose}
                    />
                ))}
            </>
        );
    }

    return (
        <div className="flex flex-row justify-between items-center gap-4">
            <div className="flex flex-col gap-2 items-start justify-start">
                {forBuildersItems.map((item) => (
                    <MenuItem key={item.href} {...item} variant="desktop" />
                ))}
            </div>
            <Image
                src="/images/homepage/nav-builder.png"
                alt="For Builders"
                width={170}
                height={132}
            />
        </div>
    );
}

// For Funders Section
interface ForFundersContentProps {
    variant?: 'desktop' | 'mobile';
    onClose?: () => void;
}

export function ForFundersContent({ variant = 'desktop', onClose }: ForFundersContentProps) {
    if (variant === 'mobile') {
        return (
            <>
                <MenuItem
                    {...forFundersItems.main}
                    variant="mobile"
                    onClick={onClose}
                />
                {forFundersItems.secondary.map((item) => (
                    <MenuItem
                        key={item.href}
                        {...item}
                        variant="mobile"
                        onClick={onClose}
                    />
                ))}
            </>
        );
    }

    return (
        <div className="flex flex-row justify-between items-center gap-4">
            <div className="flex flex-col gap-2">
                <MenuItem {...forFundersItems.main} variant="desktop" />
                <hr className="my-4 border-zinc-200 dark:border-zinc-700" />
                <div className="flex flex-col gap-2">
                    {forFundersItems.secondary.map((item) => (
                        <MenuItem key={item.href} {...item} variant="desktop" />
                    ))}
                </div>
            </div>
            <Image
                src='/images/homepage/nav-funder.png'
                className="w-auto h-auto object-cover"
                alt="For Funders"
                width={132}
                height={170}
            />
        </div>
    );
}

// Explore Section
interface ExploreContentProps {
    variant?: 'desktop' | 'mobile';
    onClose?: () => void;
}

export function ExploreContent({ variant = 'desktop', onClose }: ExploreContentProps) {
    if (variant === 'mobile') {
        return (
            <div className="flex flex-col gap-2">
                <MenuSection title="Projects" variant="mobile" />
                {exploreItems.projects.map((item) => (
                    <SimpleMenuItem
                        key={item.title}
                        {...item}
                        variant="mobile"
                        onClick={onClose}
                    />
                ))}
                <MenuSection title="Communities" variant="mobile" className="mt-2" />
                {exploreItems.communities.map((item) => (
                    <SimpleMenuItem
                        key={item.href}
                        {...item}
                        variant="mobile"
                        onClick={onClose}
                    />
                ))}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 px-4 py-2">
            <div className="flex flex-col gap-2">
                <MenuSection title="Projects" variant="desktop" />
                {exploreItems.projects.map((item) => (
                    <SimpleMenuItem key={item.title} {...item} variant="desktop" />
                ))}
            </div>
            <hr className="h-[1px] w-full border-zinc-200 dark:border-zinc-700" />
            <div className="flex flex-col gap-2">
                <MenuSection title="Communities" variant="desktop" />
                {exploreItems.communities.map((item) => (
                    <SimpleMenuItem key={item.href} {...item} variant="desktop" />
                ))}
            </div>
        </div>
    );
}

// Resources Section
interface ResourcesContentProps {
    variant?: 'desktop' | 'mobile';
    onClose?: () => void;
}

export function ResourcesContent({ variant = 'desktop', onClose }: ResourcesContentProps) {
    if (variant === 'mobile') {
        return (
            <>
                {resourcesItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        target="_blank"
                        className="flex items-center justify-between px-0 py-3 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        onClick={onClose}
                    >
                        <div className="flex items-center gap-2">
                            <item.icon className={menuStyles.itemIcon} />
                            <span className={menuStyles.itemText}>{item.title}</span>
                        </div>
                        <ArrowUpRight className={menuStyles.itemIcon} />
                    </Link>
                ))}
            </>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            {resourcesItems.map((item) => (
                <SimpleMenuItem
                    key={item.href}
                    {...item}
                    variant="desktop"
                />
            ))}
        </div>
    );
}

