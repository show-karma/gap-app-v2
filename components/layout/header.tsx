"use client";
/* eslint-disable @next/next/no-img-element */
import { useAuth } from "@/hooks/useAuth";
import { useAdminCommunities } from "@/hooks/useAdminCommunities";
import { useContractOwner } from "@/hooks/useContractOwner";
import { useAuthStore } from "@/store/auth";
import { useCommunitiesStore } from "@/store/communities";
import { useMobileStore } from "@/store/mobile";
import { useOwnerStore } from "@/store/owner";
import { useRegistryStore } from "@/store/registry";
import { PAGES } from "@/config/pages";
import { SOCIALS } from "@/config/socials";
import {
  Bars3Icon,
  UserCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { MoonIcon, SunIcon } from "@heroicons/react/24/solid";
import * as Popover from "@radix-ui/react-popover";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { OnboardingDialog } from "../Dialogs/OnboardingDialog";
import EthereumAddressToENSAvatar from "../EthereumAddressToENSAvatar";
import { DiscordIcon, LogOutIcon, TelegramIcon, TwitterIcon } from "../Icons";
import { Searchbar } from "../Searchbar";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "@/components/ui/external-link";
import { ParagraphIcon } from "../Icons/Paragraph";
import { useContributorProfileModalStore } from "@/store/modals/contributorProfile";
import { useContributorProfile } from "@/hooks/useContributorProfile";

const ProjectDialog = dynamic(
  () =>
    import("@/components/Dialogs/ProjectDialog/index").then(
      (mod) => mod.ProjectDialog
    ),
  { ssr: false }
);

const buttonStyle: HTMLButtonElement["className"] =
  "rounded-md bg-white w-max dark:bg-black px-0 py-2 text-sm font-semibold text-gray-900 dark:text-zinc-100 hover:bg-transparent dark:hover:bg-opacity-75 dark:border-zinc-900";

const UserMenu: React.FC<{
  account: { address: string; displayName: string };
  disconnect: () => void;
}> = ({ account, disconnect }) => {
  const { openModal } = useContributorProfileModalStore();
  const contributorProfileQuery = useContributorProfile(account.address);
  const hasContributorProfile = !!contributorProfileQuery.profile;
  
  return (
    <Popover.Root>
      <Popover.Trigger className="flex cursor-pointer items-center justify-center gap-2 text-center rounded-md bg-white dark:bg-black px-0 hover:bg-transparent dark:hover:bg-opacity-75 dark:border-zinc-900">
        <div className="flex items-center justify-center gap-2">
          <EthereumAddressToENSAvatar
            address={account.address}
            className="h-7 w-7 rounded-full"
          />
          <p className="text-sm font-medium text-gray-900 dark:text-zinc-100">
            {account.displayName}
          </p>
        </div>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-50 rounded-md bg-white p-2 shadow-lg dark:bg-zinc-800"
          sideOffset={5}
        >
          <div className="flex flex-col gap-1">
            {hasContributorProfile && (
              <button
                onClick={() => openModal()}
                className="flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-zinc-700"
              >
                <UserCircleIcon className="h-4 w-4" />
                Profile
              </button>
            )}
            <button
              onClick={disconnect}
              className="flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-zinc-700"
            >
              <LogOutIcon className="h-4 w-4" />
              Disconnect
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

export default function Header() {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const { theme, setTheme } = useTheme();
  const { disconnect } = useAuth();
  const { isOwner: isProjectOwner } = useOwnerStore();
  const { isMobileMenuOpen: isOpen, setIsMobileMenuOpen: setIsOpen } = useMobileStore();
  const [mounted, setMounted] = useState(false);
  const contractOwnerQuery = useContractOwner();
  const ownershipError = contractOwnerQuery.error;
  const { communities: allCommunities } = useCommunitiesStore();
  const { isAuth: isAuthenticated } = useAuthStore();
  const { data: adminCommunities } = useAdminCommunities();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDisconnect = () => {
    disconnect();
  };

  if (!mounted) {
    return null;
  }

  return (
    <header className="bg-white dark:bg-zinc-900">
      <nav className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8">
        <div className="flex lg:flex-1">
          <Link href="/" className="-m-1.5 p-1.5">
            <span className="sr-only">Karma GAP</span>
            <Image
              className="h-8 w-auto"
              src="/logos/karma-gap-logo.svg"
              alt="Karma GAP"
              width={100}
              height={32}
            />
          </Link>
        </div>
        <div className="flex lg:hidden">
          <button
            type="button"
            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700"
            onClick={() => setIsOpen(true)}
          >
            <span className="sr-only">Open main menu</span>
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
        <div className="hidden lg:flex lg:gap-x-12">
          <Searchbar />
        </div>
        <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:gap-x-6">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="text-sm font-semibold leading-6 text-gray-900 dark:text-zinc-100"
          >
            {theme === "dark" ? (
              <SunIcon className="h-6 w-6" />
            ) : (
              <MoonIcon className="h-6 w-6" />
            )}
          </button>
          {isConnected ? (
            <>
              {isProjectOwner && !ownershipError && (
                <ProjectDialog
                  buttonElement={{
                    text: "Create Project",
                    styleClass: buttonStyle,
                  }}
                />
              )}
              <UserMenu
                account={{
                  address: address!,
                  displayName: address!.slice(0, 6) + "..." + address!.slice(-4),
                }}
                disconnect={handleDisconnect}
              />
            </>
          ) : (
            <ConnectButton />
          )}
        </div>
      </nav>
      
      {/* Mobile menu */}
      {isOpen && (
        <div className="lg:hidden">
          <div className="fixed inset-0 z-10" />
          <div className="fixed inset-y-0 right-0 z-10 w-full overflow-y-auto bg-white px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
            <div className="flex items-center justify-between">
              <Link href="/" className="-m-1.5 p-1.5">
                <span className="sr-only">Karma GAP</span>
                <Image
                  className="h-8 w-auto"
                  src="/logos/karma-gap-logo.svg"
                  alt="Karma GAP"
                  width={100}
                  height={32}
                />
              </Link>
              <button
                type="button"
                className="-m-2.5 rounded-md p-2.5 text-gray-700"
                onClick={() => setIsOpen(false)}
              >
                <span className="sr-only">Close menu</span>
                <XMarkIcon className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-6 flow-root">
              <div className="-my-6 divide-y divide-gray-500/10">
                <div className="space-y-2 py-6">
                  <Searchbar />
                </div>
                <div className="py-6">
                  {isConnected ? (
                    <>
                      {isProjectOwner && !ownershipError && (
                        <ProjectDialog
                          buttonElement={{
                            text: "Create Project",
                            styleClass: "w-full",
                          }}
                        />
                      )}
                      <button
                        onClick={handleDisconnect}
                        className="mt-6 w-full rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500"
                      >
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <ConnectButton />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {isAuthenticated && <OnboardingDialog />}
    </header>
  );
}