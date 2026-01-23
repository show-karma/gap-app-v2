"use client";

import {
  CheckCircle2,
  CircleHelp,
  CircleUser,
  Copy,
  FolderKanban,
  Heart,
  LogOutIcon,
  Settings,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import EthereumAddressToENSAvatar from "@/components/EthereumAddressToENSAvatar";
import EthereumAddressToENSName from "@/components/EthereumAddressToENSName";
import { DiscordIcon, TelegramIcon, TwitterIcon } from "@/components/Icons";
import { ParagraphIcon } from "@/components/Icons/Paragraph";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { useAuth } from "@/hooks/useAuth";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { useContributorProfile } from "@/hooks/useContributorProfile";
import { useReviewerPrograms } from "@/hooks/usePermissions";
import { useStaff } from "@/hooks/useStaff";
import { useOwnerStore } from "@/store";
import { useCommunitiesStore } from "@/store/communities";
import { useContributorProfileModalStore } from "@/store/modals/contributorProfile";
import { useRegistryStore } from "@/store/registry";
import { PAGES } from "@/utilities/pages";
import { SOCIALS } from "@/utilities/socials";
import { cn } from "@/utilities/tailwind";
import { MenuSection } from "./menu-components";
import { NavbarUserSkeleton } from "./navbar-user-skeleton";

const menuStyles = {
  itemIcon: "text-muted-foreground w-4 h-4",
  itemText: "text-foreground text-sm font-medium",
};

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

const _formatAddress = (addr: string) => {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

const _formatAddressLong = (addr: string) => {
  return `${addr.slice(0, 10)}...${addr.slice(-6)}`;
};

export function NavbarUserMenu() {
  const { authenticated: isLoggedIn, logout, address, ready } = useAuth();
  const { theme: currentTheme, setTheme: changeCurrentTheme } = useTheme();
  const toggleTheme = () => {
    changeCurrentTheme(currentTheme === "light" ? "dark" : "light");
  };

  const { profile } = useContributorProfile(address);

  const { openModal: openProfileModal } = useContributorProfileModalStore();
  const [, copyToClipboard] = useCopyToClipboard();

  // Check admin and reviewer permissions
  const { communities } = useCommunitiesStore();
  const { programs: reviewerPrograms } = useReviewerPrograms();
  const { isStaff, isLoading: isStaffLoading } = useStaff();
  const isOwner = useOwnerStore((state) => state.isOwner);
  const { isPoolManager, isRegistryAdmin } = useRegistryStore();

  const isCommunityAdmin = communities.length !== 0;
  const hasReviewerRole = reviewerPrograms && reviewerPrograms.length > 0;
  const hasAdminAccess = !isStaffLoading && (isStaff || isOwner || isCommunityAdmin);
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
        <ExternalLink
          href={SOCIALS.DOCS}
          className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full"
          aria-label="Docs"
        >
          <CircleHelp className="w-5 h-5" />
        </ExternalLink>
        <Menubar className="border-0 bg-transparent shadow-none p-0 h-auto">
          <MenubarMenu>
            <MenubarTrigger className="cursor-pointer p-0 rounded-full data-[state=open]:opacity-90">
              <div className="flex items-center rounded-full border border-border p-1">
                <EthereumAddressToENSAvatar
                  address={address}
                  className="h-8 w-8 min-h-8 min-w-8 max-h-8 max-w-8 rounded-full"
                />
                {profile?.data?.name ? (
                  <span className="text-sm text-muted-foreground hidden xl:inline px-2">
                    {profile?.data?.name}
                  </span>
                ) : (
                  <EthereumAddressToENSName
                    address={address}
                    className="text-sm text-muted-foreground hidden xl:inline px-2"
                  />
                )}
              </div>
            </MenubarTrigger>
            <MenubarContent align="end" className="flex flex-col gap-4 px-4 py-4 w-max">
              <div className="flex flex-col w-full">
                <MenubarItem
                  className="w-full cursor-pointer"
                  onClick={() => {
                    if (address) {
                      copyToClipboard(address, "Wallet address copied to clipboard");
                    }
                  }}
                >
                  <div className="flex flex-row items-center gap-2 justify-between w-full">
                    {address ? (
                      <>
                        <span className="text-sm break-all max-w-40 text-muted-foreground font-medium">
                          {address}
                        </span>
                        <Copy className={menuStyles.itemIcon} />
                      </>
                    ) : (
                      <span className={menuStyles.itemText}>No wallet connected</span>
                    )}
                  </div>
                </MenubarItem>
              </div>
              <hr className="h-[1px] w-full border-border" />
              <div className="flex flex-col w-full">
                <MenubarItem
                  className="w-full cursor-pointer"
                  onClick={() =>
                    openProfileModal({
                      isGlobal: true,
                    })
                  }
                >
                  <div className="flex items-center w-full flex-row gap-2 justify-between">
                    <div className="flex items-center flex-row gap-2">
                      <CircleUser className={menuStyles.itemIcon} />
                      <span className={menuStyles.itemText}>Edit profile</span>
                    </div>
                  </div>
                </MenubarItem>
                <MenubarItem onClick={toggleTheme} className="w-full">
                  <span className="flex items-center gap-2 w-full">
                    {currentTheme === "light" ? (
                      <ToggleLeft className={menuStyles.itemIcon} />
                    ) : (
                      <ToggleRight className={menuStyles.itemIcon} />
                    )}
                    <span className={menuStyles.itemText}>
                      {currentTheme === "light" ? "Dark mode" : "Light mode"}
                    </span>
                  </span>
                </MenubarItem>
              </div>
              <hr className="h-[1px] w-full border-border" />
              <div className="flex flex-col w-full">
                <MenubarItem asChild className="w-full cursor-pointer">
                  <Link href={PAGES.MY_PROJECTS} className="flex items-center gap-2 w-full">
                    <FolderKanban className={menuStyles.itemIcon} />
                    <span className={menuStyles.itemText}>My projects</span>
                  </Link>
                </MenubarItem>
                <MenubarItem asChild className="w-full cursor-pointer">
                  <Link href="/donations" className="flex items-center gap-2 w-full">
                    <Heart className={menuStyles.itemIcon} />
                    <span className={menuStyles.itemText}>My donations</span>
                  </Link>
                </MenubarItem>
                {hasReviewerRole && (
                  <MenubarItem asChild className="w-full cursor-pointer">
                    <Link href={PAGES.MY_REVIEWS} className="flex items-center gap-2 w-full">
                      <CheckCircle2 className={menuStyles.itemIcon} />
                      <span className={menuStyles.itemText}>Review</span>
                    </Link>
                  </MenubarItem>
                )}
                {hasAdminAccess && (
                  <MenubarItem asChild className="w-full cursor-pointer">
                    <Link href={PAGES.ADMIN.LIST} className="flex items-center gap-2 w-full">
                      <ShieldCheck className={menuStyles.itemIcon} />
                      <span className={menuStyles.itemText}>Admin</span>
                    </Link>
                  </MenubarItem>
                )}
                {isRegistryAllowed && (
                  <MenubarItem asChild className="w-full cursor-pointer">
                    <Link
                      href={PAGES.REGISTRY.MANAGE_PROGRAMS}
                      className="flex items-center gap-2 w-full"
                    >
                      <Settings className={menuStyles.itemIcon} />
                      <span className={menuStyles.itemText}>Manage Programs</span>
                    </Link>
                  </MenubarItem>
                )}
              </div>
              <hr className="h-[1px] w-full border-border" />
              <div className="flex flex-col w-full">
                <MenuSection title="Follow" variant="desktop" />
                <div className="flex flex-row items-center w-full justify-between gap-2">
                  {socialMediaLinks.map((social) => {
                    const IconComponent = social.icon;
                    return (
                      <ExternalLink
                        key={social.name}
                        href={social.href}
                        className={cn(
                          menuStyles.itemText,
                          "flex items-center justify-center rounded-full transition-colors p-2"
                        )}
                        aria-label={social.name}
                      >
                        <IconComponent className="w-5 h-5" />
                      </ExternalLink>
                    );
                  })}
                </div>
              </div>
              <hr className="h-[1px] w-full border-border" />
              <MenubarItem onClick={logout} className="cursor-pointer">
                <div className="flex items-center gap-2">
                  <LogOutIcon className={menuStyles.itemIcon} />
                  <span className={menuStyles.itemText}>Log out</span>
                </div>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      </div>
    </div>
  );
}
