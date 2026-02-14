"use client";

import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/solid";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { DiscordIcon, TelegramIcon, TwitterIcon } from "@/components/Icons";
import { ParagraphIcon } from "@/components/Icons/Paragraph";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PAGES } from "@/utilities/pages";
import { SOCIALS } from "@/utilities/socials";
import { cn } from "@/utilities/tailwind";
import { layoutTheme } from "../../helper/theme";
import { Logo } from "../shared/logo";
import {
  ExploreContent,
  ForBuildersContent,
  ForFundersContent,
  MenuSection,
  ResourcesContent,
} from "./menu-components";
import { NavbarSearch } from "./navbar-search";

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
  { name: "Twitter", href: SOCIALS.TWITTER, icon: TwitterIcon },
  { name: "Telegram", href: SOCIALS.TELEGRAM, icon: TelegramIcon },
  { name: "Discord", href: SOCIALS.DISCORD, icon: DiscordIcon },
  { name: "Paragraph", href: SOCIALS.PARAGRAPH, icon: ParagraphIcon },
];

function DesktopNavigation() {
  return (
    <div className="hidden lg:flex items-center flex-1 lg:justify-between gap-8">
      <div className="flex flex-row items-center gap-3 flex-shrink-0">
        <Logo />
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <NavDropdownTrigger>For Builders</NavDropdownTrigger>
            <DropdownMenuContent align="start" className="p-0">
              <div className="min-w-[500px] p-4">
                <ForBuildersContent variant="desktop" />
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <NavDropdownTrigger>For Funders</NavDropdownTrigger>
            <DropdownMenuContent align="start" className="p-0">
              <div className="min-w-[500px] p-4">
                <ForFundersContent variant="desktop" />
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-1 justify-center flex-row items-center gap-3">
        <NavbarSearch />
        <DropdownMenu>
          <NavDropdownTrigger>Explore</NavDropdownTrigger>
          <DropdownMenuContent align="center" className="p-0">
            <ExploreContent variant="desktop" />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-row items-center gap-4">
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

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" asChild>
            <Link href={PAGES.MY_PROJECTS}>Sign in</Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-border text-foreground hover:bg-accent shadow-sm"
            asChild
          >
            <ExternalLink href={SOCIALS.PARTNER_FORM}>Contact sales</ExternalLink>
          </Button>
        </div>
      </div>
    </div>
  );
}

function MobileMenu() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="lg:hidden flex flex-row items-center gap-3 w-full">
      <Logo />
      <div className="flex flex-row items-center gap-2 ml-auto">
        <Button variant="secondary" size="sm" asChild>
          <Link href={PAGES.MY_PROJECTS}>Sign in</Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-border text-foreground hover:bg-accent shadow-sm"
          asChild
        >
          <ExternalLink href={SOCIALS.PARTNER_FORM}>Contact sales</ExternalLink>
        </Button>
        <Drawer open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <DrawerTrigger asChild>
            <button type="button" className="p-2 text-muted-foreground" aria-label="Open menu">
              <Bars3Icon className="w-6 h-6" />
            </button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader className="flex items-center justify-between border-b border-border">
              <DrawerTitle>Menu</DrawerTitle>
              <DrawerClose asChild>
                <button type="button" className="p-2" aria-label="Close menu">
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </DrawerClose>
            </DrawerHeader>
            <div className="flex flex-col p-4 gap-2 max-h-[70vh] overflow-y-auto">
              <div className="mb-4 w-full">
                <NavbarSearch onSelectItem={() => setMobileMenuOpen(false)} />
              </div>

              <div className="border-b border-border py-3">
                <MenuSection title="For Builders" variant="mobile" />
                <ForBuildersContent variant="mobile" onClose={() => setMobileMenuOpen(false)} />
              </div>

              <div className="border-b border-border py-3">
                <MenuSection title="For Funders" variant="mobile" />
                <ForFundersContent variant="mobile" onClose={() => setMobileMenuOpen(false)} />
              </div>

              <div className="border-b border-border py-5">
                <ExploreContent variant="mobile" onClose={() => setMobileMenuOpen(false)} />
              </div>

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
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
}

export function NavbarPublic() {
  return (
    <nav
      className={cn(
        "flex bg-background w-full items-center justify-center flex-row gap-8 max-w-full min-w-min border-b border-border z-10 fixed top-0 left-0 right-0"
      )}
    >
      <div
        className={cn(
          layoutTheme.padding,
          "flex justify-between w-full flex-row gap-8 py-3 max-w-[1920px] min-w-min items-center"
        )}
      >
        <DesktopNavigation />
        <MobileMenu />
      </div>
    </nav>
  );
}
