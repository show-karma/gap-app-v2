/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import Link from "next/link";
import { Popover } from "@headlessui/react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ConnectorData, useAccount } from "wagmi";
import { useOwnerStore } from "@/store/owner";
import { useCommunitiesStore } from "@/store/communities";
import { ExternalLink } from "./ExternalLink";
import { blo } from "blo";
import { Hex } from "viem";
import { Button } from "./Button";
import { useTheme } from "next-themes";
import { Searchbar } from "../Searchbar";
import dynamic from "next/dynamic";
import { useAuth } from "@/hooks/useAuth";
import { useSigner } from "@/utilities/eas-wagmi-utils";
import { getCommunitiesOf, getContractOwner } from "@/utilities/sdk";
import { karmaLinks } from "@/utilities/karma";
import { PAGES } from "@/utilities/pages";
import { useAuthStore } from "@/store/auth";
import { OnboardingDialog } from "../OnboardingDialog";
import { ColorModeToggle } from "./ColorModeToggle";
import { SocialList } from "./Socials";
import { MobilePopOverButton } from "./MobilePopoverButton";
import { KarmaGap } from "./KarmaGapLogo";

const ProjectDialog = dynamic(
  () => import("@/components/ProjectDialog").then((mod) => mod.ProjectDialog),
  { ssr: false }
);

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

const buttonStyle: HTMLButtonElement["className"] =
  " rounded-md bg-white w-max dark:bg-black px-3 py-2 text-sm font-semibold text-gray-900 dark:text-zinc-100 hover:bg-transparent dark:hover:bg-opacity-75 dark:border-zinc-900";

export default function Header() {
  const { theme: currentTheme, setTheme: changeCurrentTheme } = useTheme();
  const { isConnected, address } = useAccount();
  const { isAuth, isAuthenticating } = useAuthStore();
  const { communities, setCommunities, setIsLoading } = useCommunitiesStore();
  const signer = useSigner();

  const isCommunityAdmin = communities.length !== 0;

  const getCommunities = async () => {
    if (!address || !isAuth) {
      setCommunities([]);
      return;
    }

    setIsLoading(true);
    const communitiesOf = await getCommunitiesOf(address);

    if (communitiesOf && communitiesOf.length !== 0) {
      setCommunities(communitiesOf);
    } else {
      setCommunities([]);
    }
    setIsLoading(false);
  };

  const isOwner = useOwnerStore((state) => state.isOwner);
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
      await getContractOwner(signer as any)
        .then((owner) => {
          setIsOwner(owner.toLowerCase() === address?.toLowerCase());
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

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  const { authenticate, disconnect, softDisconnect } = useAuth();
  const { connector: activeConnector } = useAccount();

  useEffect(() => {
    const handleConnectorUpdate = ({ account, chain }: ConnectorData) => {
      if (account) {
        console.log("account", account);
        softDisconnect(account);
      } else if (chain) {
        console.log("new chain", chain);
      }
    };

    if (activeConnector) {
      activeConnector.on("change", handleConnectorUpdate);
    }

    return () => activeConnector?.off("change", handleConnectorUpdate) as any;
  }, [activeConnector]);

  useEffect(() => {
    if (isConnected && isReady && !isAuth) {
      authenticate();
    }
  }, [isConnected, isReady, isAuth]);

  return (
    <>
      <Popover
        as="header"
        className={({ open }) =>
          classNames(
            open ? "fixed inset-0 z-40 overflow-y-auto" : "",
            "bg-white dark:bg-black lg:static lg:overflow-y-visible"
          )
        }
      >
        {({ open }) => (
          <>
            <div className="px-4 sm:px-6 lg:px-12  border-b border-b-[#DFE1E6]">
              <div className="relative flex lg:gap-8 justify-between items-center flex-row">
                <KarmaGap />

                <div className="flex items-center md:absolute md:inset-y-0 md:right-0 lg:hidden">
                  {/* Color mode toggle start */}
                  <ColorModeToggle
                    currentTheme={currentTheme}
                    onClick={() =>
                      changeCurrentTheme(
                        currentTheme === "light" ? "dark" : "light"
                      )
                    }
                  />
                  {/* Color mode toggle end */}

                  {/* Mobile menu button */}
                  <MobilePopOverButton open={open} />
                </div>

                <div className="hidden lg:flex">
                  <Searchbar />
                </div>
                <div className="hidden lg:flex lg:items-center lg:justify-end lg:gap-x-3 py-3">
                  <ExternalLink href={karmaLinks.githubSDK}>
                    <button className={buttonStyle}>SDK Docs</button>
                  </ExternalLink>
                  <div className="rounded-none h-10 w-[1px] bg-zinc-300 mx-2" />
                  {isReady ? (
                    <>
                      {(isCommunityAdmin || isOwner) &&
                      isConnected &&
                      isAuth ? (
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
                      <ConnectButton.Custom>
                        {({
                          account,
                          chain,
                          openAccountModal,
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
                                if (!connected || !isAuth) {
                                  return (
                                    <button
                                      onClick={() => {
                                        if (isAuthenticating) return;
                                        if (
                                          !isAuth &&
                                          connected &&
                                          !isAuthenticating
                                        ) {
                                          authenticate();
                                          return;
                                        }
                                        openConnectModal?.();
                                      }}
                                      type="button"
                                      className="rounded-md border border-brand-blue dark:bg-zinc-900 dark:text-blue-500 bg-white px-3 py-2 text-sm font-semibold text-brand-blue hover:bg-opacity-75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                                    >
                                      Login / Register
                                    </button>
                                  );
                                }

                                return (
                                  <Button
                                    onClick={async () => {
                                      disconnect();
                                    }}
                                    className="flex w-max items-center flex-row gap-2 rounded-full bg-gray-500 p-0 pl-3 text-sm font-semibold text-white hover:bg-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                                  >
                                    {account.displayName}
                                    <img
                                      src={blo(account.address as Hex)}
                                      alt="avatar"
                                      className="h-10 w-10 rounded-full"
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
                  <ColorModeToggle
                    currentTheme={currentTheme}
                    onClick={() =>
                      changeCurrentTheme(
                        currentTheme === "light" ? "dark" : "light"
                      )
                    }
                  />
                  {/* Color mode toggle end */}
                  <SocialList />
                </div>
              </div>
            </div>

            <Popover.Panel as="nav" className="lg:hidden" aria-label="Global">
              <div className="mx-auto mt-6 max-w-3xl px-4 sm:px-6">
                <div className=" px-3">
                  <Searchbar />
                </div>
                <div className="mt-8 px-3 flex flex-col gap-4">
                  <ExternalLink href={karmaLinks.githubSDK}>
                    <button className="rounded-md bg-white w-full dark:bg-black px-3 py-2 text-sm font-semibold text-gray-900 dark:text-zinc-100  hover:bg-gray-50 dark:hover:bg-primary-900 border border-gray-200 dark:border-zinc-900">
                      SDK Docs
                    </button>
                  </ExternalLink>
                  {isReady ? (
                    <>
                      {isConnected && isAuth && (
                        <Link href={PAGES.MY_PROJECTS}>
                          <button className="rounded-md bg-white w-full dark:bg-black px-3 py-2 text-sm font-semibold text-gray-900 dark:text-zinc-100  hover:bg-gray-50 dark:hover:bg-primary-900 border border-gray-200 dark:border-zinc-900">
                            My Projects
                          </button>
                        </Link>
                      )}
                      {(isCommunityAdmin || isOwner) &&
                      isConnected &&
                      isAuth ? (
                        <Link href={PAGES.ADMIN.LIST}>
                          <button className="rounded-md w-full bg-white dark:bg-black px-3 py-2 text-sm font-semibold text-gray-900 dark:text-zinc-100  hover:bg-gray-50 dark:hover:bg-primary-900 border border-gray-200 dark:border-zinc-900">
                            Admin
                          </button>
                        </Link>
                      ) : null}

                      {isConnected && isAuth && <ProjectDialog />}
                      <ConnectButton.Custom>
                        {({
                          account,
                          chain,
                          openAccountModal,
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
                                      className="rounded-md border max-lg:w-full max-lg:justify-center border-brand-blue dark:bg-zinc-900 dark:text-blue-500 bg-white px-3 py-2 text-sm font-semibold text-brand-blue  hover:bg-opacity-75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                                    >
                                      Login / Register
                                    </button>
                                  );
                                }

                                return (
                                  <Button
                                    onClick={async () => {
                                      disconnect();
                                    }}
                                    className="flex w-full py-1 justify-center items-center flex-row gap-2 rounded-full bg-gray-500 text-sm font-semibold text-white  hover:bg-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                                  >
                                    {account.displayName}
                                    <img
                                      src={blo(account.address as Hex)}
                                      alt="avatar"
                                      className="h-8 w-8 rounded-full"
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
                <SocialList />
              </div>
            </Popover.Panel>
          </>
        )}
      </Popover>
      <OnboardingDialog />
    </>
  );
}
