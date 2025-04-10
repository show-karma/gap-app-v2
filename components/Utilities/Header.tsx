"use client";
/* eslint-disable @next/next/no-img-element */

import { useCommunitiesStore } from "@/store/communities";
import { useMobileStore } from "@/store/mobile";
import { useOwnerStore } from "@/store/owner";
import { useRegistryStore } from "@/store/registry";
import { useSigner } from "@/utilities/eas-wagmi-utils";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { PAGES } from "@/utilities/pages";
import { getContractOwner } from "@/utilities/sdk/getContractOwner";
import { SOCIALS } from "@/utilities/socials";
import { config } from "@/utilities/wagmi/config";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { MoonIcon, SunIcon } from "@heroicons/react/24/solid";
import * as Popover from "@radix-ui/react-popover";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { watchAccount } from "@wagmi/core";
import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Chain } from "viem";

import { OnboardingDialog } from "../Dialogs/OnboardingDialog";
import EthereumAddressToENSAvatar from "../EthereumAddressToENSAvatar";
import { DiscordIcon, LogOutIcon, TelegramIcon, TwitterIcon } from "../Icons";
import { Searchbar } from "../Searchbar";
import { Button } from "./Button";
import { errorManager } from "./errorManager";
import { ExternalLink } from "./ExternalLink";
import { ParagraphIcon } from "../Icons/Paragraph";
import { useSetActiveWallet } from "@privy-io/wagmi";
import { useWalletInteraction } from "@/hooks/useWalletInteraction";
import { appNetwork } from "@/utilities/network";

const ProjectDialog = dynamic(
  () =>
    import("@/components/Dialogs/ProjectDialog/index").then(
      (mod) => mod.ProjectDialog
    ),
  { ssr: false }
);

const buttonStyle: HTMLButtonElement["className"] =
  "rounded-md bg-white w-max dark:bg-black px-0 py-2 text-sm font-semibold text-gray-900 dark:text-zinc-100 hover:bg-transparent dark:hover:bg-opacity-75 dark:border-zinc-900";

const PrivyConnectButton = () => {
  const { login, authenticated, user, logout } = usePrivy();

  if (authenticated && user) {
    return (
      <div className="flex items-center gap-2">
        <Popover.Root>
          <Popover.Trigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 bg-gray-500 dark:bg-zinc-900 hover:opacity-80 rounded-full p-0 text-sm "
            >
              <span className="ml-3 text-white font-semibold hidden sm:inline truncate max-w-[100px]">
                {user.wallet?.address?.slice(0, 6)}...
                {user.wallet?.address?.slice(-4)}
              </span>
              <div className="relative w-10 h-10 rounded-full overflow-hidden">
                {user.wallet?.address ? (
                  <EthereumAddressToENSAvatar
                    address={user.wallet?.address}
                    className="h-10 w-10"
                  />
                ) : null}
              </div>
            </button>
          </Popover.Trigger>
          <Popover.Content
            align="end"
            className="z-50 mt-2 w-60 origin-top-right rounded-md bg-white dark:bg-black py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
          >
            <div className="p-2">
              <button
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-900"
                onClick={() => logout()}
              >
                <LogOutIcon className="h-4 w-4" />
                <span>Disconnect</span>
              </button>
            </div>
          </Popover.Content>
        </Popover.Root>
      </div>
    );
  }

  return (
    <Button className="!rounded-full" onClick={() => login()}>
      Connect Wallet
    </Button>
  );
};

export default function Header() {
  const { theme: currentTheme, setTheme: changeCurrentTheme } = useTheme();
  const { isConnected, address, chain } = useWalletInteraction();
  const { communities, setCommunities, setIsLoading } = useCommunitiesStore();

  const signer = useSigner();

  const isCommunityAdmin = communities.length !== 0;

  const getCommunities = async () => {
    if (!address || !isConnected) {
      setCommunities([]);
      return;
    }
    setIsLoading(true);
    try {
      const communitiesOf = await gapIndexerApi
        .adminOf(address)
        .catch(() => undefined);

      if (communitiesOf?.data && communitiesOf?.data.length !== 0) {
        setCommunities(communitiesOf.data);
      } else {
        setCommunities([]);
      }
    } catch (e) {
      errorManager(`Error fetching communities of user ${address} is admin`, e);
      setCommunities([]);
    } finally {
      setIsLoading(false);
    }
  };

  const { isOwner } = useOwnerStore();
  const setIsOwner = useOwnerStore((state) => state.setIsOwner);
  const setIsOwnerLoading = useOwnerStore((state) => state.setIsOwnerLoading);

  useEffect(() => {
    if (!signer || !isConnected) {
      setIsOwnerLoading(false);
      setIsOwner(false);
      return;
    }
    const setupOwner = async () => {
      setIsOwnerLoading(true);
      if (!chain) {
        setIsOwnerLoading(false);
        setIsOwner(false);
        return;
      }
      const newChain = appNetwork[0];
      await getContractOwner(signer as any, chain || newChain)
        .then((owner) => {
          setIsOwner(owner?.toLowerCase() === address?.toLowerCase());
        })
        .finally(() => {
          setIsOwnerLoading(false);
        });
    };
    setupOwner();
  }, [signer, isConnected]);

  useEffect(() => {
    if (!isConnected) return;
    getCommunities();
  }, [isConnected]);

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

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  const { setActiveWallet } = useSetActiveWallet();
  const { wallets } = useWallets();

  // useEffect(() => {
  //   const unwatch = watchAccount?.(config, {
  //     onChange: async (account, prevAccount) => {
  //       if (!account) {
  //         errorManager("User changed to empty account instance", account, {
  //           account,
  //           prevAccount,
  //         });
  //       }
  //       if (account.address && account.address !== prevAccount.address) {
  //         // softDisconnect(account.address);
  //         const newActiveWallet = wallets.find(
  //           (wallet) => wallet.address === account.address
  //         );
  //         if (newActiveWallet) {
  //           await setActiveWallet(newActiveWallet);
  //         }
  //       }
  //     },
  //   });
  //   return () => unwatch();
  // }, []);

  // useEffect(() => {
  //   if (isConnected && isReady && !isAuth) {
  //     authenticate();
  //   }
  // }, [isConnected, isReady, isAuth]);

  const { isMobileMenuOpen, setIsMobileMenuOpen } = useMobileStore();

  const pathname = usePathname();
  const isFundingMap = pathname.includes("funding-map");
  const { isPoolManager, isRegistryAdmin } = useRegistryStore();
  const isRegistryAllowed = (isRegistryAdmin || isPoolManager) && isConnected;

  return (
    <>
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
              <button
                className="relative inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-rose-500"
                // onClick={() => toggleTheme()}
                onClick={() =>
                  changeCurrentTheme(
                    currentTheme === "light" ? "dark" : "light"
                  )
                }
              >
                {currentTheme === "dark" ? (
                  <SunIcon className="h-6 w-6 text-gray-500 dark:text-zinc-200" />
                ) : (
                  <MoonIcon className="h-6 w-6 text-gray-500 dark:text-zinc-200" />
                )}
              </button>
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
                          <ExternalLink href={"https://docs.gap.karmahq.xyz/"}>
                            <button className="rounded-md bg-white w-full dark:bg-black px-3 py-2 text-sm font-semibold text-gray-900 dark:text-zinc-100  hover:bg-gray-50 dark:hover:bg-primary-900 border border-gray-200 dark:border-zinc-900">
                              Docs
                            </button>
                          </ExternalLink>
                          {isReady ? (
                            <>
                              {isFundingMap ? (
                                isRegistryAllowed ? (
                                  <Link href={PAGES.REGISTRY.MANAGE_PROGRAMS}>
                                    <button className="rounded-md bg-white w-full dark:bg-black px-3 py-2 text-sm font-semibold text-gray-900 dark:text-zinc-100  hover:bg-gray-50 dark:hover:bg-primary-900 border border-gray-200 dark:border-zinc-900">
                                      Manage Programs
                                    </button>
                                  </Link>
                                ) : null
                              ) : (
                                <>
                                  {isConnected && (
                                    <Link href={PAGES.MY_PROJECTS}>
                                      <button className="rounded-md bg-white w-full dark:bg-black px-3 py-2 text-sm font-semibold text-gray-900 dark:text-zinc-100  hover:bg-gray-50 dark:hover:bg-primary-900 border border-gray-200 dark:border-zinc-900">
                                        My Projects
                                      </button>
                                    </Link>
                                  )}
                                  {isCommunityAdmin && isConnected ? (
                                    <Link href={PAGES.ADMIN.LIST}>
                                      <button className="rounded-md w-full bg-white dark:bg-black px-3 py-2 text-sm font-semibold text-gray-900 dark:text-zinc-100  hover:bg-gray-50 dark:hover:bg-primary-900 border border-gray-200 dark:border-zinc-900">
                                        Admin
                                      </button>
                                    </Link>
                                  ) : null}

                                  {isConnected && <ProjectDialog />}
                                </>
                              )}

                              <PrivyConnectButton />
                            </>
                          ) : null}
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
              {/* <div className="rounded-none h-10 w-[1px] bg-zinc-300 mx-2" /> */}
              {isReady ? (
                <>
                  <Link href={PAGES.REGISTRY.ROOT}>
                    <button className={buttonStyle}>Get Funding</button>
                  </Link>
                  <ExternalLink href={"https://docs.gap.karmahq.xyz/"}>
                    <button className={buttonStyle}>Docs</button>
                  </ExternalLink>
                  {isFundingMap ? (
                    isRegistryAllowed ? (
                      <Link href={PAGES.REGISTRY.MANAGE_PROGRAMS}>
                        <button className={buttonStyle}>Manage Programs</button>
                      </Link>
                    ) : null
                  ) : (
                    <>
                      {isCommunityAdmin && isConnected ? (
                        <Link href={PAGES.ADMIN.LIST}>
                          <button className={buttonStyle}>Admin</button>
                        </Link>
                      ) : null}
                      {isConnected && (
                        <Link href={PAGES.MY_PROJECTS}>
                          <button className={buttonStyle}>My Projects</button>
                        </Link>
                      )}

                      {/* Rainbowkit custom connect button start */}
                      {isConnected && <ProjectDialog />}
                    </>
                  )}

                  <PrivyConnectButton />
                </>
              ) : null}
              {/* Rainbowkit custom connect button end */}
              {/* Color mode toggle start */}
              <button
                className="px-3 py-2.5 rounded-md bg-white dark:bg-zinc-900 text-sm font-semibold text-gray-900 dark:text-white  ring-1 ring-inset ring-gray-300 dark:ring-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 focus:outline-primary-600"
                onClick={() =>
                  changeCurrentTheme(
                    currentTheme === "light" ? "dark" : "light"
                  )
                }
              >
                {currentTheme === "dark" ? (
                  <SunIcon className="h-4 w-4 text-gray-500 dark:text-zinc-200" />
                ) : (
                  <MoonIcon className="h-4 w-4 text-gray-500 dark:text-zinc-200" />
                )}
              </button>
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
      </>
      <OnboardingDialog />
    </>
  );
}
