"use client";

import { ArrowUpRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { cn } from "@/utilities/tailwind";

const menuStyles = {
  itemIcon: "text-muted-foreground w-4 h-4",
  itemText: "text-foreground text-sm font-medium",
  itemDescription: "text-muted-foreground text-sm font-normal",
};

interface MenuItemClientProps {
  href: string;
  icon: LucideIcon;
  title: string;
  description?: string;
  external?: boolean;
  showArrow?: boolean;
  onClick?: () => void;
  variant?: "desktop" | "mobile";
  openModal?: boolean;
  anchor?: string;
}

export function MenuItemClient({
  href,
  icon: Icon,
  title,
  description,
  external,
  showArrow,
  onClick,
  variant = "desktop",
  openModal,
  anchor,
}: MenuItemClientProps) {
  const router = useRouter();

  const content = (
    <>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={menuStyles.itemIcon} />
        <span className={menuStyles.itemText}>{title}</span>
        {showArrow && <ArrowUpRight className={cn(menuStyles.itemIcon, "ml-auto")} />}
      </div>
      {description && <p className={menuStyles.itemDescription}>{description}</p>}
    </>
  );

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick();
    }

    if (openModal) {
      e.preventDefault();
      const modalButton = document.getElementById("new-project-button");
      if (modalButton) {
        modalButton.click();
      } else {
        // If button doesn't exist, navigate to MY_PROJECTS where it should exist
        router.push(href);
        // Try to click the button after navigation
        setTimeout(() => {
          const button = document.getElementById("new-project-button");
          if (button) {
            button.click();
          }
        }, 500);
      }
      return;
    }

    if (anchor) {
      e.preventDefault();

      // Check if we're already on the target page
      const currentPath = window.location.pathname;
      if (currentPath === href) {
        // Already on the page, just scroll
        setTimeout(() => {
          const element = document.getElementById(anchor);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 50);
      } else {
        // Navigate first, then scroll
        router.push(`${href}#${anchor}`);
        // Wait for navigation and DOM update
        setTimeout(() => {
          const element = document.getElementById(anchor);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 300);
      }
      return;
    }
  };

  // If openModal is true, render as button instead of Link to prevent navigation
  if (openModal) {
    if (variant === "mobile") {
      return (
        <button
          type="button"
          className="flex flex-col px-0 py-3 rounded-md hover:bg-accent w-full text-left"
          onClick={handleClick}
        >
          {content}
        </button>
      );
    }

    return (
      <button
        type="button"
        className="w-full flex flex-col items-start rounded-md cursor-pointer px-2 py-1.5 hover:bg-accent bg-transparent border-none text-left"
        onClick={handleClick}
      >
        {content}
      </button>
    );
  }

  if (variant === "mobile") {
    if (external) {
      return (
        <ExternalLink
          href={anchor ? `${href}#${anchor}` : href}
          className="flex flex-col px-0 py-3 rounded-md hover:bg-accent"
          onClick={handleClick}
        >
          {content}
        </ExternalLink>
      );
    }
    return (
      <Link
        href={anchor ? `${href}#${anchor}` : href}
        className="flex flex-col px-0 py-3 rounded-md hover:bg-accent"
        onClick={handleClick}
      >
        {content}
      </Link>
    );
  }

  if (external) {
    return (
      <ExternalLink
        href={anchor ? `${href}#${anchor}` : href}
        onClick={handleClick}
        className="block"
      >
        <div className="flex flex-col items-start rounded-md cursor-pointer px-2 py-1.5 hover:bg-accent">
          {content}
        </div>
      </ExternalLink>
    );
  }

  return (
    <Link href={anchor ? `${href}#${anchor}` : href} onClick={handleClick} className="block">
      <div className="flex flex-col items-start rounded-md cursor-pointer px-2 py-1.5 hover:bg-accent">
        {content}
      </div>
    </Link>
  );
}
