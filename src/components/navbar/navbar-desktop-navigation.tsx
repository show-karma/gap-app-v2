"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { DiscordIcon, TelegramIcon, TwitterIcon } from "@/components/Icons";
import { ParagraphIcon } from "@/components/Icons/Paragraph";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PAGES } from "@/utilities/pages";
import { SOCIALS } from "@/utilities/socials";
import { cn } from "@/utilities/tailwind";
import { Logo } from "../shared/logo";
import {
  ExploreContent,
  ForBuildersContent,
  ForFundersContent,
  MenuSection,
  ResourcesContent,
} from "./menu-components";
import { NavbarAuthButtons } from "./navbar-auth-buttons";
import { useNavbarPermissions } from "./navbar-permissions-context";
import { NavbarSearch } from "./navbar-search";
import { NavbarUserMenu } from "./navbar-user-menu";

const menuStyles = {
  trigger:
    "group inline-flex h-auto py-2 px-1 w-max items-center justify-center rounded-md bg-transparent text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-transparent focus:bg-transparent focus:text-foreground focus:outline-none data-[state=open]:text-foreground data-[state=open]:bg-transparent",
  itemText: "text-foreground text-sm font-medium",
};

function NavDropdownTrigger({ children }: { children: React.ReactNode }) {
  return (
    <DropdownMenuTrigger className={menuStyles.trigger}>
      {children}
      <ChevronDown
        className="relative top-[1px] ml-0.5 h-3 w-3 transition duration-300 group-data-[state=open]:rotate-180"
        aria-hidden="true"
      />
    </DropdownMenuTrigger>
  );
}

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

export function NavbarDesktopNavigation() {
  // Use centralized permissions context to avoid duplicate API calls
  const { isLoggedIn, hasReviewerRole, hasAdminAccess, isRegistryAllowed } = useNavbarPermissions();

  return (
    <div className="hidden lg:flex items-center flex-1 lg:justify-between gap-8">
      <div className="flex flex-row items-center gap-3 flex-shrink-0">
        <Logo />
        {!isLoggedIn ? (
          <div className="flex items-center gap-1">
            {/* For Builders Dropdown */}
            <DropdownMenu>
              <NavDropdownTrigger>For Builders</NavDropdownTrigger>
              <DropdownMenuContent align="start" className="p-0">
                <div className="min-w-[500px] p-4">
                  <ForBuildersContent variant="desktop" />
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* For Funders Dropdown */}
            <DropdownMenu>
              <NavDropdownTrigger>For Funders</NavDropdownTrigger>
              <DropdownMenuContent align="start" className="p-0">
                <div className="min-w-[500px] p-4">
                  <ForFundersContent variant="desktop" />
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <div className="flex flex-row items-center ml-2 gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={PAGES.MY_PROJECTS}>My projects</Link>
            </Button>
            {hasReviewerRole && (
              <Button variant="outline" size="sm" asChild>
                <Link href={PAGES.MY_REVIEWS}>Review</Link>
              </Button>
            )}
            {hasAdminAccess && (
              <Button variant="outline" size="sm" asChild>
                <Link href={PAGES.ADMIN.LIST}>Admin</Link>
              </Button>
            )}
            {isRegistryAllowed && (
              <Button variant="outline" size="sm" asChild>
                <Link href={PAGES.REGISTRY.MANAGE_PROGRAMS}>Manage Programs</Link>
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-1 justify-center flex-row items-center gap-3">
        {/* Search */}
        <NavbarSearch />
        {/* Explore Dropdown */}
        <DropdownMenu>
          <NavDropdownTrigger>Explore</NavDropdownTrigger>
          <DropdownMenuContent align="center" className="p-0">
            <ExploreContent variant="desktop" />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {!isLoggedIn ? (
        <div className="flex flex-row items-center gap-4">
          {/* Resources Dropdown */}
          <DropdownMenu>
            <NavDropdownTrigger>Resources</NavDropdownTrigger>
            <DropdownMenuContent align="end" className="p-0">
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
                          className={cn(
                            menuStyles.itemText,
                            "flex items-center justify-center rounded-full transition-colors"
                          )}
                          aria-label={social.name}
                        >
                          <IconComponent className="w-5 h-5" />
                        </ExternalLink>
                      );
                    })}
                  </div>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Auth Buttons */}
          <NavbarAuthButtons />
        </div>
      ) : null}

      {/* Right Side - Social Media & User Profile (Only when logged in) */}
      {isLoggedIn && <NavbarUserMenu />}
    </div>
  );
}
