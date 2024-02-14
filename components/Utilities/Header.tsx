/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Popover } from "@headlessui/react";
import { MagnifyingGlassIcon } from "@heroicons/react/20/solid";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { MoonIcon, SunIcon } from "@heroicons/react/24/solid";
import { ProjectDialog } from "../ProjectDialog";
import { useAccount } from "wagmi";
import {
  PAGES,
  getCommunitiesOf,
  getContractOwner,
  karmaLinks,
  useSigner,
} from "@/utilities";
import { useRouter } from "next/router";
import { Community } from "@show-karma/karma-gap-sdk";
import { useOwnerStore } from "@/store/owner";
import { ExternalLink } from "./ExternalLink";
import { SOCIALS } from "@/utilities/socials";
import { DiscordIcon, MirrorIcon, TelegramIcon, TwitterIcon } from "../Icons";
import { blo } from "blo";
import { Hex } from "viem";
import { Button } from "./Button";
import { useTheme } from "next-themes";
import { Searchbar } from "../Searchbar";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export default function Header() {
  const { theme: currentTheme, setTheme: changeCurrentTheme } = useTheme();
  const { isConnected, address } = useAccount();
  const [communitiesToAdmin, setCommunitiesToAdmin] = useState<Community[]>([]);
  const signer = useSigner();

  const isCommunityAdmin = communitiesToAdmin.length !== 0;

  const getCommunities = async () => {
    if (!address) return;

    const communitiesOf = await getCommunitiesOf(address);

    if (communitiesOf && communitiesOf.length !== 0) {
      setCommunitiesToAdmin(communitiesOf);
    } else {
      setCommunitiesToAdmin([]);
    }
  };

  const isOwner = useOwnerStore((state) => state.isOwner);
  const setIsOwner = useOwnerStore((state) => state.setIsOwner);

  useEffect(() => {
    if (!signer || !address) {
      setIsOwner(false);
      return;
    }
    const setupOwner = async () => {
      await getContractOwner(signer as any).then((owner) => {
        setIsOwner(owner.toLowerCase() === address?.toLowerCase());
      });
    };
    setupOwner();
  }, [signer, address]);

  useEffect(() => {
    getCommunities();
  }, [address]);

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

  return (
    <>
      <Popover
        as="header"
        className={({ open }) =>
          classNames(
            open ? "fixed inset-0 z-40 overflow-y-auto" : "",
            "bg-white dark:bg-black shadow-md lg:static lg:overflow-y-visible"
          )
        }
      >
        {({ open }) => (
          <>
            <div className="px-4 sm:px-6 lg:px-8">
              <div className="relative flex lg:gap-8 flex-row justify-between items-center">
                <div className="flex py-2 lg:inset-y-0 lg:left-0 lg:static">
                  <Link className="flex-shrink-0" href="/">
                    <Image
                      className="block w-full h-auto"
                      src="/logo/karma-gap-logo.svg"
                      alt="Gap"
                      width={228}
                      height={52}
                      priority={true}
                    />
                  </Link>
                </div>
                {/* <div className="hidden lg:block min-w-0 flex-1 md:px-8 lg:px-0 lg:gap-x-3 ">
                  <div className="flex justify-center items-center px-6 py-4 w-full md:mx-auto md:max-w-3xl lg:mx-0 lg:max-w-none xl:px-0">
                    <div className="flex flex-row justify-center w-full max-w-full">
                      <form className="">
                        <label htmlFor="userAddress" className="sr-only">
                          Search
                        </label>
                        <div className="flex w-full">
                          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <MagnifyingGlassIcon
                              className="h-5 w-5 text-gray-400"
                              aria-hidden="true"
                            />
                          </div>
                          <input
                            id="search"
                            name="search"
                            autoComplete="off"
                            required
                            className="block w-full max-w-[360px] rounded-xl border-0 bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 py-1.5 pl-4 pr-3 ring-1 ring-inset ring-gray-300 dark:ring-zinc-800 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 dark:focus:ring-primary-600 sm:text-sm sm:leading-6 autofill:!bg-yellow-200"
                            placeholder="Search projects..."
                            type="text"
                          />
                        </div>
                      </form>
                    </div>
                  </div>
                </div> */}
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
                  <Popover.Button className="ml-2 relative inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:bg-white dark:focus:bg-black focus:outline-none focus:ring-2 focus:ring-inset focus:ring-rose-500">
                    <span className="absolute -inset-0.5" />
                    <span className="sr-only">Open menu</span>
                    {open ? (
                      <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                    ) : (
                      <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                    )}
                  </Popover.Button>
                </div>

                <Searchbar />
                <div className="hidden lg:flex lg:items-center lg:justify-end lg:gap-x-3">
                  <ExternalLink href={karmaLinks.githubSDK}>
                    <button className="rounded-md bg-white w-max dark:bg-black px-3 py-2 text-sm font-semibold text-gray-900 dark:text-zinc-100 shadow-sm hover:bg-gray-50 dark:hover:bg-primary-900 border border-gray-200 dark:border-zinc-900">
                      SDK Docs
                    </button>
                  </ExternalLink>
                  {isReady ? (
                    <>
                      {isConnected && (
                        <Link href={PAGES.MY_PROJECTS}>
                          <button className="rounded-md bg-white w-max dark:bg-black px-3 py-2 text-sm font-semibold text-gray-900 dark:text-zinc-100 shadow-sm hover:bg-gray-50 dark:hover:bg-primary-900 border border-gray-200 dark:border-zinc-900">
                            My Projects
                          </button>
                        </Link>
                      )}
                      {(isCommunityAdmin || isOwner) && isConnected ? (
                        <Link href={PAGES.ADMIN.LIST}>
                          <button className="rounded-md w-max bg-white dark:bg-black px-3 py-2 text-sm font-semibold text-gray-900 dark:text-zinc-100 shadow-sm hover:bg-gray-50 dark:hover:bg-primary-900 border border-gray-200 dark:border-zinc-900">
                            Admin
                          </button>
                        </Link>
                      ) : null}

                      {/* Rainbowkit custom connect button start */}
                      {isConnected && <ProjectDialog />}
                      <ConnectButton.Custom>
                        {({
                          account,
                          chain,
                          openAccountModal,
                          openChainModal,
                          openConnectModal,
                          authenticationStatus,
                          mounted,
                        }) => {
                          // Note: If your app doesn't use authentication, you
                          // can remove all 'authenticationStatus' checks
                          const ready =
                            mounted && authenticationStatus !== "loading";
                          const connected =
                            ready &&
                            account &&
                            chain &&
                            (!authenticationStatus ||
                              authenticationStatus === "authenticated");

                          return (
                            <div
                              {...(!ready && {
                                "aria-hidden": true,
                                style: {
                                  opacity: 0,
                                  pointerEvents: "none",
                                  userSelect: "none",
                                },
                              })}
                            >
                              {(() => {
                                if (!connected) {
                                  return (
                                    <button
                                      onClick={openConnectModal}
                                      type="button"
                                      className="rounded-md border border-primary-600 dark:bg-zinc-900 dark:text-blue-500 bg-white px-3 py-2 text-sm font-semibold text-primary-600 shadow-sm hover:bg-primary-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                                    >
                                      Login
                                    </button>
                                  );
                                }

                                if (chain.unsupported) {
                                  return (
                                    <button
                                      onClick={openChainModal}
                                      type="button"
                                      className="rounded-md w-max bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                                    >
                                      Wrong network
                                    </button>
                                  );
                                }

                                return (
                                  <Button
                                    onClick={openAccountModal}
                                    className="flex w-max items-center flex-row gap-2 rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                                  >
                                    {account.displayName}
                                    <img
                                      src={blo(account.address as Hex)}
                                      alt="avatar"
                                      className="h-6 w-6 rounded-full"
                                    />
                                  </Button>
                                );
                              })()}
                            </div>
                          );
                        }}
                      </ConnectButton.Custom>
                    </>
                  ) : null}
                  {/* Rainbowkit custom connect button end */}
                  {/* Color mode toggle start */}
                  <button
                    className="px-3 py-2.5 rounded-md bg-white dark:bg-zinc-900 text-sm font-semibold text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 focus:outline-primary-600"
                    // onClick={() => toggleTheme()}
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
            </div>

            <Popover.Panel as="nav" className="lg:hidden" aria-label="Global">
              <div className="mx-auto mt-6 max-w-3xl px-4 sm:px-6">
                {/* <form className="space-y-3">
                  <label htmlFor="userAddress" className="sr-only">
                    Search
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <MagnifyingGlassIcon
                        className="h-5 w-5 text-gray-400"
                        aria-hidden="true"
                      />
                    </div>
                    <input
                      id="search"
                      name="userAddress"
                      className="block w-full rounded-lg border-0 bg-white dark:bg-zinc-900 py-1.5 pl-10 pr-3 ring-1 ring-inset ring-gray-300 dark:ring-zinc-800 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-rose-500 sm:text-sm sm:leading-6"
                      placeholder="Look up a Nouner..."
                      type="text"
                    />
                  </div>
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center rounded-md border border-transparent bg-rose-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-rose-700"
                  >
                    Search
                  </button>
                </form> */}

                <div className="mt-8 px-3 flex flex-col gap-4">
                  <ExternalLink href={karmaLinks.githubSDK}>
                    <button className="rounded-md bg-white w-full dark:bg-black px-3 py-2 text-sm font-semibold text-gray-900 dark:text-zinc-100 shadow-sm hover:bg-gray-50 dark:hover:bg-primary-900 border border-gray-200 dark:border-zinc-900">
                      SDK Docs
                    </button>
                  </ExternalLink>
                  {isReady ? (
                    <>
                      {isConnected && (
                        <Link href={PAGES.MY_PROJECTS}>
                          <button className="rounded-md bg-white w-full dark:bg-black px-3 py-2 text-sm font-semibold text-gray-900 dark:text-zinc-100 shadow-sm hover:bg-gray-50 dark:hover:bg-primary-900 border border-gray-200 dark:border-zinc-900">
                            My Projects
                          </button>
                        </Link>
                      )}
                      {(isCommunityAdmin || isOwner) && isConnected ? (
                        <Link href={PAGES.ADMIN.LIST}>
                          <button className="rounded-md w-full bg-white dark:bg-black px-3 py-2 text-sm font-semibold text-gray-900 dark:text-zinc-100 shadow-sm hover:bg-gray-50 dark:hover:bg-primary-900 border border-gray-200 dark:border-zinc-900">
                            Admin
                          </button>
                        </Link>
                      ) : null}

                      {isConnected && <ProjectDialog />}
                      <ConnectButton.Custom>
                        {({
                          account,
                          chain,
                          openAccountModal,
                          openChainModal,
                          openConnectModal,
                          authenticationStatus,
                          mounted,
                        }) => {
                          // Note: If your app doesn't use authentication, you
                          // can remove all 'authenticationStatus' checks
                          const ready =
                            mounted && authenticationStatus !== "loading";
                          const connected =
                            ready &&
                            account &&
                            chain &&
                            (!authenticationStatus ||
                              authenticationStatus === "authenticated");

                          return (
                            <div
                              {...(!ready && {
                                "aria-hidden": true,
                                style: {
                                  opacity: 0,
                                  pointerEvents: "none",
                                  userSelect: "none",
                                },
                              })}
                            >
                              {(() => {
                                if (!connected) {
                                  return (
                                    <button
                                      onClick={openConnectModal}
                                      type="button"
                                      className="rounded-md border max-lg:w-full max-lg:justify-center border-primary-600 dark:bg-zinc-900 dark:text-blue-500 bg-white px-3 py-2 text-sm font-semibold text-primary-600 shadow-sm hover:bg-primary-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                                    >
                                      Login
                                    </button>
                                  );
                                }

                                if (chain.unsupported) {
                                  return (
                                    <button
                                      onClick={openChainModal}
                                      type="button"
                                      className="rounded-md w-max max-lg:w-full max-lg:justify-center bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                                    >
                                      Wrong network
                                    </button>
                                  );
                                }

                                return (
                                  <Button
                                    onClick={openAccountModal}
                                    className="max-lg:w-full max-lg:justify-center flex w-max items-center flex-row gap-2 rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                                  >
                                    {account.displayName}
                                    <img
                                      src={blo(account.address as Hex)}
                                      alt="avatar"
                                      className="h-6 w-6 rounded-full"
                                    />
                                  </Button>
                                );
                              })()}
                            </div>
                          );
                        }}
                      </ConnectButton.Custom>
                    </>
                  ) : null}
                </div>
                <div className="flex h-[40px] flex-row items-center justify-center gap-2 border-t border-t-[#dcdfea] mt-4 pt-4">
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
            </Popover.Panel>
          </>
        )}
      </Popover>
    </>
  );
}
