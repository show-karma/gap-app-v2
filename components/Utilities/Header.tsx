"use client";
/* eslint-disable @next/next/no-img-element */
import { useAdminCommunities } from "@/hooks/useAdminCommunities";
import { useContractOwner } from "@/hooks/useContractOwner";
import { useAuth } from "@/hooks/useAuth";
import { useCommunitiesStore } from "@/store/communities";
import { useMobileStore } from "@/store/mobile";
import { useRegistryStore } from "@/store/registry";
import { PAGES } from "@/utilities/pages";
import { SOCIALS } from "@/utilities/socials";
import {
  Bars3Icon,
  UserCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

import * as Popover from "@radix-ui/react-popover";
import { ConnectButton } from "./ConnectButton";
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
import { ExternalLink } from "./ExternalLink";
import { ParagraphIcon } from "../Icons/Paragraph";
import { useContributorProfileModalStore } from "@/store/modals/contributorProfile";
import { useContributorProfile } from "@/hooks/useContributorProfile";
import ThemeButton from "./ThemeButton";
import { useReviewerPrograms } from "@/hooks/usePermissions";

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
}> = ({ account }) => {
  const { disconnect } = useAuth();
  const { openModal } = useContributorProfileModalStore();
  const { profile } = useContributorProfile(account?.address as `0x${string}`);

  const firstName = profile?.data?.name?.split(" ")[0] || "";

  const displayName = firstName || profile?.data?.name || account?.displayName;

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <div className="flex cursor-pointer w-max items-center flex-row gap-2 rounded-full bg-gray-500 p-0 pl-3 text-sm font-semibold text-white hover:bg-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600">
          <span className="truncate max-w-36 w-full">{displayName}</span>
          <EthereumAddressToENSAvatar
            address={account?.address}
            className="h-10 w-10 min-h-10 min-w-10 max-h-10 max-w-10 rounded-full"
          />
        </div>
      </Popover.Trigger>
      <Popover.Content
        className="z-50 w-48 rounded-md bg-white p-1 shadow-lg dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
        sideOffset={5}
        align="end"
      >
        <div className="py-1">
          <button
            onClick={() => openModal({ isGlobal: true })}
            className="focus-visible:outline-none flex w-full items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-700"
          >
            <UserCircleIcon className="mr-2 h-4 w-4" />
            My Profile
          </button>
          <button
            onClick={async () => {
              disconnect();
            }}
            className="focus-visible:outline-none flex w-full items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-700"
          >
            <LogOutIcon className="mr-2 h-4 w-4" />
            Logout
          </button>
        </div>
      </Popover.Content>
    </Popover.Root>
  );
};
const UserMenuMobile: React.FC<{
  account: { address: string; displayName: string };
}> = ({ account }) => {
  const { disconnect } = useAuth();
  const { openModal } = useContributorProfileModalStore();
  const { profile } = useContributorProfile(account?.address as `0x${string}`);

  const firstName = profile?.data?.name?.split(" ")[0] || "";

  const displayName = firstName || profile?.data?.name || account.displayName;

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <div className="cursor-pointer flex w-full py-1 justify-center items-center flex-row gap-2 rounded-md bg-gray-500 text-sm font-semibold text-white  hover:bg-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600">
          {displayName}

          <EthereumAddressToENSAvatar
            address={account?.address}
            className="h-10 w-10 min-h-10 min-w-10 max-h-10 max-w-10 rounded-full"
          />
        </div>
      </Popover.Trigger>
      <Popover.Content
        className="z-50 w-48 rounded-md bg-white p-1 shadow-lg dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
        sideOffset={5}
        align="center"
      >
        <div className="py-1">
          <button
            onClick={() => openModal({ isGlobal: true })}
            className="flex w-full items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-700"
          >
            <UserCircleIcon className="mr-2 h-4 w-4" />
            My Profile
          </button>
          <button
            onClick={async () => {
              disconnect();
            }}
            className="flex w-full items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-700"
          >
            <LogOutIcon className="mr-2 h-4 w-4" />
            Logout
          </button>
        </div>
      </Popover.Content>
    </Popover.Root>
  );
};
export default function Header() {
  const { theme: currentTheme, setTheme: changeCurrentTheme } = useTheme();
  const { isConnected, address, chain } = useAccount();
  const { authenticated: isAuth } = useAuth();
  const { communities } = useCommunitiesStore();

  // Use React Query hooks for data fetching
  useAdminCommunities(address);
  useContractOwner(address, chain);

  const isCommunityAdmin = communities.length !== 0;

  const socials = [
    {
      name: "twitter",
      icon: <TwitterIcon className="h-6 w-6 object-contain" />,
      href: SOCIALS.TWITTER,
    },

    {
      name: "telegram",
      icon: <TelegramIcon className="h-6 w-6 object-contain" />,
      href: SOCIALS.TELEGRAM,
    },
    {
      name: "discord",
      icon: <DiscordIcon className="h-6 w-6 object-contain" />,
      href: SOCIALS.DISCORD,
    },
    {
      name: "paragraph",
      icon: <ParagraphIcon className="h-6 w-6 object-contain" />,
      href: SOCIALS.PARAGRAPH,
    },
  ];



  const { isMobileMenuOpen, setIsMobileMenuOpen } = useMobileStore();

  const pathname = usePathname();
  const isFundingMap = pathname.includes("funding-map");
  const { isPoolManager, isRegistryAdmin } = useRegistryStore();
  const isRegistryAllowed =
    address && (isRegistryAdmin || isPoolManager) && isAuth;

  // Check if user has reviewer role
  const { programs: reviewerPrograms } = useReviewerPrograms();
  const hasReviewerRole = reviewerPrograms && reviewerPrograms.length > 0;

  return (
    <>
      <header className="px-4 sm:px-6 lg:px-12  border-b border-b-[#DFE1E6]">
        <div className="relative flex lg:gap-8 justify-between items-center flex-row">
          <div className="flex flex-row gap-16 items-center justify-between">
            <div className="flex py-4 lg:inset-y-0 lg:left-0 lg:static">
              <Link
                className="flex-shrink-0 max-w-[180px] max-h-[40px]"
                href="/"
              >
                <Image
                  className="block w-full h-auto dark:hidden"
                  src="/logo/karma-gap-logo.svg"
                  alt="Gap"
                  width={180}
                  height={40}
                  priority={true}
                />
                <Image
                  className="hidden w-full h-auto dark:block"
                  src="/logo/karma-gap-logo-white.svg"
                  alt="Gap"
                  width={180}
                  height={40}
                  priority={true}
                />
              </Link>
            </div>
            <div className="hidden min-w-min lg:flex w-[400px] max-xl:w-[180px]">
              <Searchbar />
            </div>
          </div>

          <div className="flex items-center md:absolute md:inset-y-0 md:right-0 lg:hidden">
            {/* Color mode toggle start */}
            <ThemeButton />
            {/* Color mode toggle end */}
            {/* Mobile menu button */}
            <Popover.Root>
              <Popover.Trigger asChild>
                <button
                  className="ml-2 relative inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:bg-white dark:focus:bg-black focus:outline-none focus:ring-2 focus:ring-inset focus:ring-rose-500"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                  <span className="absolute -inset-0.5" />
                  <span className="sr-only">Open menu</span>
                  {isMobileMenuOpen ? (
                    <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                  ) : (
                    <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                  )}
                </button>
              </Popover.Trigger>

              {isMobileMenuOpen && (
                <div className="fixed inset-0 z-[999] bg-black bg-opacity-50">
                  <div className="fixed inset-y-0 right-0 z-[1000] w-full bg-white dark:bg-black overflow-y-auto">
                    <div className="relative flex justify-between items-center px-4 py-4 border-b border-gray-200">
                      <div className="flex-1">
                        <Link
                          href="/"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <Image
                            className="block h-8 w-auto dark:hidden"
                            src="/logo/karma-gap-logo.svg"
                            alt="Gap"
                            width={180}
                            height={40}
                            priority={true}
                          />
                          <Image
                            className="hidden h-8 w-auto dark:block"
                            src="/logo/karma-gap-logo-white.svg"
                            alt="Gap"
                            width={180}
                            height={40}
                            priority={true}
                          />
                        </Link>
                      </div>
                      <button
                        className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                      </button>
                    </div>
                    <div className="mx-auto max-w-full px-4 sm:px-6 pt-4">
                      <div className="px-3 relative z-[1001]">
                        <Searchbar />
                      </div>
                      <div className="mt-8 px-3 flex flex-col gap-4">
                        <Link href={PAGES.REGISTRY.ROOT}>
                          <button className="rounded-md bg-white w-full dark:bg-black px-3 py-2 text-sm font-semibold text-gray-900 dark:text-zinc-100  hover:bg-gray-50 dark:hover:bg-primary-900 border border-gray-200 dark:border-zinc-900">
                            Get Funding
                          </button>
                        </Link>
                        <ExternalLink href={"https://docs.karmahq.xyz/"}>
                          <button className="rounded-md bg-white w-full dark:bg-black px-3 py-2 text-sm font-semibold text-gray-900 dark:text-zinc-100  hover:bg-gray-50 dark:hover:bg-primary-900 border border-gray-200 dark:border-zinc-900">
                            Docs
                          </button>
                        </ExternalLink>
                        <div className="flex flex-col gap-4">
                          {isFundingMap ? (
                            isRegistryAllowed ? (
                              <Link href={PAGES.REGISTRY.MANAGE_PROGRAMS}>
                                <button className="rounded-md bg-white w-full dark:bg-black px-3 py-2 text-sm font-semibold text-gray-900 dark:text-zinc-100  hover:bg-gray-50 dark:hover:bg-primary-900 border border-gray-200 dark:border-zinc-900">
                                  Manage Programs
                                </button>
                              </Link>
                            ) : null
                          ) : isAuth ? (
                            <div className="flex flex-col gap-4">
                              <Link href={PAGES.MY_PROJECTS}>
                                <button className="rounded-md bg-white w-full dark:bg-black px-3 py-2 text-sm font-semibold text-gray-900 dark:text-zinc-100  hover:bg-gray-50 dark:hover:bg-primary-900 border border-gray-200 dark:border-zinc-900">
                                  My Projects
                                </button>
                              </Link>
                              {isCommunityAdmin ? (
                                <Link href={PAGES.ADMIN.LIST}>
                                  <button className="rounded-md w-full bg-white dark:bg-black px-3 py-2 text-sm font-semibold text-gray-900 dark:text-zinc-100  hover:bg-gray-50 dark:hover:bg-primary-900 border border-gray-200 dark:border-zinc-900">
                                    Admin
                                  </button>
                                </Link>
                              ) : null}
                              {hasReviewerRole ? (
                                <Link href={PAGES.MY_REVIEWS}>
                                  <button className="rounded-md w-full bg-white dark:bg-black px-3 py-2 text-sm font-semibold text-gray-900 dark:text-zinc-100  hover:bg-gray-50 dark:hover:bg-primary-900 border border-gray-200 dark:border-zinc-900">
                                    Review
                                  </button>
                                </Link>
                              ) : null}


                              <ProjectDialog />
                            </div>
                          ) : null}

                          <ConnectButton.Custom>
                            {({
                              account,
                              login,
                            }) => {

                              return (
                                <div>
                                  {(() => {
                                    if (!isAuth || !account) {
                                      return (
                                        <button
                                          onClick={login}
                                          type="button"
                                          className="rounded-md border max-lg:w-full max-lg:justify-center border-brand-blue dark:bg-zinc-900 dark:text-blue-500 bg-white px-3 py-2 text-sm font-semibold text-brand-blue  hover:bg-opacity-75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                                        >
                                          Login / Register
                                        </button>
                                      );
                                    }

                                    return (
                                      <UserMenuMobile
                                        account={account as any}
                                      />
                                    );
                                  })()}
                                </div>
                              );
                            }}
                          </ConnectButton.Custom>
                        </div>
                      </div>
                      <div className="w-full flex flex-col  border-t border-t-[#dcdfea] mt-4 pt-4  items-center justify-center">
                        <div className="flex h-[40px] flex-row items-center justify-center gap-2">
                          {socials.map((social) => {
                            return (
                              <ExternalLink
                                key={social.name}
                                href={social.href}
                                className="text-black dark:text-white transition-all duration-500 ease-in-out"
                              >
                                <div className="flex h-6 w-6 items-center justify-center ">
                                  {social.icon}
                                </div>
                              </ExternalLink>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Popover.Root>
          </div>

          <div className="hidden lg:flex lg:items-center lg:justify-end lg:gap-3 xl:gap-5 2xl:gap-6 py-3">
            <div className="flex flex-row gap-4">
              <Link href={PAGES.REGISTRY.ROOT}>
                <button className={buttonStyle}>Get Funding</button>
              </Link>
              <ExternalLink href={"https://docs.karmahq.xyz/"}>
                <button className={buttonStyle}>Docs</button>
              </ExternalLink>
              {isFundingMap ? (
                isRegistryAllowed ? (
                  <Link href={PAGES.REGISTRY.MANAGE_PROGRAMS}>
                    <button className={buttonStyle}>Manage Programs</button>
                  </Link>
                ) : null
              ) : isAuth ? (
                <div className="flex flex-row gap-4">
                  {isCommunityAdmin ? (
                    <Link href={PAGES.ADMIN.LIST}>
                      <button className={buttonStyle}>Admin</button>
                    </Link>
                  ) : null}
                  {hasReviewerRole ? (
                    <Link href={PAGES.MY_REVIEWS}>
                      <button className={buttonStyle}>Review</button>
                    </Link>
                  ) : null}
                  <Link href={PAGES.MY_PROJECTS}>
                    <button className={buttonStyle}>My Projects</button>
                  </Link>
                  <ProjectDialog />
                </div>
              ) : null}

              <ConnectButton.Custom>
                {({
                  account,
                  login
                }) => {

                  return (
                    <div>
                      {(() => {

                        if (!isAuth || !account) {
                          return (
                            <button
                              onClick={login}
                              type="button"
                              className="rounded-md border border-brand-blue dark:bg-zinc-900 dark:text-blue-500 bg-white px-3 py-2 text-sm font-semibold text-brand-blue hover:bg-opacity-75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                            >
                              Login / Register
                            </button>
                          );
                        }

                        return <UserMenu account={account as any} />;
                      })()}
                    </div>
                  );
                }}
              </ConnectButton.Custom>
            </div>
            {/* Color mode toggle start */}
            <ThemeButton />
            {/* Color mode toggle end */}
            <div className="flex h-[40px] flex-row items-center gap-2 border-l border-l-[#dcdfea] pl-4">
              {socials.map((social) => {
                return (
                  <ExternalLink
                    key={social.name}
                    href={social.href}
                    className="text-black dark:text-white transition-all duration-500 ease-in-out"
                  >
                    <div className="flex h-6 w-6 items-center justify-center ">
                      {social.icon}
                    </div>
                  </ExternalLink>
                );
              })}
            </div>
          </div>
        </div>
      </header>
      <OnboardingDialog />
    </>
  );
}
