"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import * as Popover from "@radix-ui/react-popover";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { MoonIcon, SunIcon } from "@heroicons/react/24/solid";
import { useOwnerStore } from "@/store/owner";
import { useCommunitiesStore } from "@/store/communities";
import { ExternalLink } from "./ExternalLink";
import { SOCIALS } from "@/utilities/socials";
import { DiscordIcon, MirrorIcon, TelegramIcon, TwitterIcon } from "../Icons";
import { blo } from "blo";
import { Chain, Hex } from "viem";
import { Button } from "./Button";
import { useTheme } from "next-themes";
import { Searchbar } from "../Searchbar";
import dynamic from "next/dynamic";
import { useAuth } from "@/hooks/useAuth";
import { useSigner } from "@/utilities/eas-wagmi-utils";
import { PAGES } from "@/utilities/pages";
import { useAuthStore } from "@/store/auth";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { getContractOwner } from "@/utilities/sdk/getContractOwner";
import { OnboardingDialog } from "../Dialogs/OnboardingDialog";
import { useMobileStore } from "@/store/mobile";
import { config } from "@/utilities/wagmi/config";
import { watchAccount } from "@wagmi/core";
import { usePathname } from "next/navigation";
import { useRegistryStore } from "@/store/registry";
import EthereumAddressToENSAvatar from "../EthereumAddressToENSAvatar";
import { errorManager } from "./errorManager";
import { useChainId } from "wagmi";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import LoginWithPrivy from "../LoginWithPrivy";
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

export default function Header() {
  const { communities, setCommunities, setIsLoading } = useCommunitiesStore();
  const { theme: currentTheme, setTheme: changeCurrentTheme } = useTheme();
  const { isAuth, isAuthenticating } = useAuthStore();

  const {
    user,
    ready,
    authenticated,
    logout
  } = usePrivy();
  const chainId = useChainId();
  const { wallets } = useWallets();
  const isConnected = ready && authenticated && wallets.length !== 0;
  const chain = appNetwork.find((c) => c.id === chainId);
  const address = authenticated && user && wallets[0]?.address as `0x${string}`;


  const signer = useSigner();

  const isCommunityAdmin = communities.length !== 0;

  const getCommunities = async () => {
    if (!address || !isAuth) {
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

  const setIsOwner = useOwnerStore((state) => state.setIsOwner);
  const setIsOwnerLoading = useOwnerStore((state) => state.setIsOwnerLoading);



  useEffect(() => {

    if (!signer || !address || !isAuth) {
      setIsOwnerLoading(false);
      setIsOwner(false);
      return;
    }
    const setupOwner = async () => {
      setIsOwnerLoading(true);
      if (!chainId) {
        setIsOwner(false);
        return;
      }
      await getContractOwner(signer as any, chain as Chain)
        .then((owner) => {
          setIsOwner(owner?.toLowerCase() === address?.toLowerCase());
        })
        .finally(() => {
          setIsOwnerLoading(false);
        });
    };
    setupOwner();
  }, [signer, address, isAuth]);

  useEffect(() => {
    getCommunities();
  }, [address, isAuth]);

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
      name: "mirror",
      icon: <MirrorIcon className="h-6 w-6 object-contain" />,
      href: SOCIALS.MIRROR,
    },
  ];

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  const { authenticate, disconnect, softDisconnect } = useAuth();

  useEffect(() => {
    const unwatch = watchAccount?.(config, {
      onChange: (account, prevAccount) => {
        if (account.address && account.address !== prevAccount.address) {
          softDisconnect(account.address);
        }
      },
    });
    return () => unwatch();
  }, []);

  useEffect(() => {
    if (isConnected && isReady && !isAuth) {
      authenticate();
    }
  }, [isConnected, isReady, isAuth]);

  const { isMobileMenuOpen, setIsMobileMenuOpen } = useMobileStore();

  const pathname = usePathname();
  const isFundingMap = pathname.includes("funding-map");
  const { isPoolManager, isRegistryAdmin } = useRegistryStore();
  const isRegistryAllowed =
    address && (isRegistryAdmin || isPoolManager) && isAuth;

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
              <Popover.Root
                open={isMobileMenuOpen}
                onOpenChange={setIsMobileMenuOpen}
              >
                <Popover.Trigger className="ml-2 relative inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:bg-white dark:focus:bg-black focus:outline-none focus:ring-2 focus:ring-inset focus:ring-rose-500">
                  <span className="absolute -inset-0.5" />
                  <span className="sr-only">Open menu</span>
                  {isMobileMenuOpen ? (
                    <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                  ) : (
                    <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                  )}
                </Popover.Trigger>
                <Popover.Content
                  sideOffset={5}
                  className="lg:hidden PopoverContent inset-0 w-screen h-screen bg-white dark:bg-black z-40 overflow-y-auto max-w-full"
                >
                  <div className="mx-auto max-w-full mt-2 px-4 sm:px-6 border-t border-t-gray-200 pt-6">
                    <div className="px-3">
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
                              {isConnected && isAuth && (
                                <Link href={PAGES.MY_PROJECTS}>
                                  <button className="rounded-md bg-white w-full dark:bg-black px-3 py-2 text-sm font-semibold text-gray-900 dark:text-zinc-100  hover:bg-gray-50 dark:hover:bg-primary-900 border border-gray-200 dark:border-zinc-900">
                                    My Projects
                                  </button>
                                </Link>
                              )}
                              {isCommunityAdmin && isConnected && isAuth ? (
                                <Link href={PAGES.ADMIN.LIST}>
                                  <button className="rounded-md w-full bg-white dark:bg-black px-3 py-2 text-sm font-semibold text-gray-900 dark:text-zinc-100  hover:bg-gray-50 dark:hover:bg-primary-900 border border-gray-200 dark:border-zinc-900">
                                    Admin
                                  </button>
                                </Link>
                              ) : null}

                              {isConnected && isAuth && <ProjectDialog />}
                            </>
                          )}

                          <LoginWithPrivy />
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
                </Popover.Content>
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
                      {isCommunityAdmin && isConnected && isAuth ? (
                        <Link href={PAGES.ADMIN.LIST}>
                          <button className={buttonStyle}>Admin</button>
                        </Link>
                      ) : null}
                      {isConnected && isAuth && (
                        <Link href={PAGES.MY_PROJECTS}>
                          <button className={buttonStyle}>My Projects</button>
                        </Link>
                      )}

                      {/* Rainbowkit custom connect button start */}
                      {isConnected && isAuth && <ProjectDialog />}
                    </>
                  )}

                  <LoginWithPrivy />

                </>
              ) : null}

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
