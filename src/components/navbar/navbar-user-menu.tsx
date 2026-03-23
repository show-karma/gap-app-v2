"use client";

import {
  CircleUser,
  Copy,
  FolderKanban,
  Heart,
  KeyRound,
  LogOutIcon,
  Settings,
} from "lucide-react";
import Link from "next/link";
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
import { useContributorProfile } from "@/hooks/useContributorProfile";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { useApiKeyManagementModalStore } from "@/store/modals/apiKeyManagement";
import { useContributorProfileModalStore } from "@/store/modals/contributorProfile";
import { PAGES } from "@/utilities/pages";
import { SOCIALS } from "@/utilities/socials";
import { cn } from "@/utilities/tailwind";
import { MenuSection } from "./menu-components";
import { useNavbarPermissions } from "./navbar-permissions-context";
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

/**
 * Extract the user's email from Privy user object.
 * Checks direct email login first, then Google OAuth.
 */
const getUserEmail = (
  user: { email?: { address: string }; google?: { email: string } } | null | undefined
): string | undefined => {
  return user?.email?.address || user?.google?.email || undefined;
};

export function NavbarUserMenu() {
  // Get permission state from context (prevents duplicate hook calls across navbar)
  const { isLoggedIn, address, ready, isRegistryAllowed } = useNavbarPermissions();

  // useAuth only needed for logout function
  const { logout, user } = useAuth();

  const { profile } = useContributorProfile(address);

  const { openModal: openProfileModal } = useContributorProfileModalStore();
  const { openModal: openApiKeyModal } = useApiKeyManagementModalStore();
  const [, copyToClipboard] = useCopyToClipboard();

  if (!ready) {
    return <NavbarUserSkeleton />;
  }

  if (!isLoggedIn) {
    return null;
  }

  return (
    <Menubar className="border-0 bg-transparent shadow-none p-0 h-auto">
      <MenubarMenu>
        <MenubarTrigger className="cursor-pointer p-0 rounded-full data-[state=open]:opacity-90">
          <div className="flex items-center rounded-full border border-border p-1">
            {user?.farcaster?.pfp ? (
              <img
                src={user.farcaster.pfp}
                alt="Farcaster avatar"
                className="h-8 w-8 min-h-8 min-w-8 max-h-8 max-w-8 rounded-full"
              />
            ) : address ? (
              <EthereumAddressToENSAvatar
                address={address}
                className="h-8 w-8 min-h-8 min-w-8 max-h-8 max-w-8 rounded-full"
              />
            ) : (
              <CircleUser className="h-8 w-8 min-h-8 min-w-8 max-h-8 max-w-8 text-muted-foreground" />
            )}
            {profile?.data?.name ? (
              <span className="text-sm text-muted-foreground hidden xl:inline px-2">
                {profile?.data?.name}
              </span>
            ) : user?.farcaster ? (
              <span className="text-sm text-muted-foreground hidden xl:inline px-2">
                {user.farcaster.displayName || user.farcaster.username}
              </span>
            ) : getUserEmail(user) ? (
              <span className="text-sm text-muted-foreground hidden xl:inline px-2">
                {getUserEmail(user)}
              </span>
            ) : address ? (
              <EthereumAddressToENSName
                address={address}
                className="text-sm text-muted-foreground hidden xl:inline px-2"
              />
            ) : null}
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
                {user?.farcaster ? (
                  <span className={menuStyles.itemText}>@{user.farcaster.username}</span>
                ) : getUserEmail(user) ? (
                  <span className={menuStyles.itemText}>{getUserEmail(user)}</span>
                ) : address ? (
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
          </div>
          <hr className="h-[1px] w-full border-border" />
          <div className="flex flex-col w-full">
            <MenubarItem asChild className="w-full cursor-pointer">
              <Link href={PAGES.DASHBOARD} className="flex items-center gap-2 w-full">
                <FolderKanban className={menuStyles.itemIcon} />
                <span className={menuStyles.itemText}>Dashboard</span>
              </Link>
            </MenubarItem>
            <MenubarItem asChild className="w-full cursor-pointer">
              <Link href="/donations" className="flex items-center gap-2 w-full">
                <Heart className={menuStyles.itemIcon} />
                <span className={menuStyles.itemText}>My donations</span>
              </Link>
            </MenubarItem>
            <MenubarItem className="w-full cursor-pointer" onClick={openApiKeyModal}>
              <div className="flex items-center w-full flex-row gap-2">
                <KeyRound className={menuStyles.itemIcon} />
                <span className={menuStyles.itemText}>API Keys</span>
              </div>
            </MenubarItem>
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
  );
}
