import { Fragment, useContext } from "react";
import Image from "next/image";
import Link from "next/link";
import { Popover, Transition } from "@headlessui/react";
import { MagnifyingGlassIcon } from "@heroicons/react/20/solid";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { MoonIcon, PlusIcon, SunIcon } from "@heroicons/react/24/solid";
import ThemeContext from "@/components/Providers/ThemeContext";
import { ProjectDialog } from "../ProjectDialog";
import { useAccount } from "wagmi";

const links = [
  {
    name: "Analytics",
    href: "/analytics",
  },
  {
    name: "All Gardeners",
    href: "/all-gardeners",
  },
  {
    name: "All Prop House Winners",
    href: "/all-prop-house-winners",
  },
  {
    name: "All Droposal Minters",
    href: "/all-droposal-minters",
  },
  {
    name: "All OE Minters",
    href: "/all-oe-minters",
  },
  {
    name: "Roadmap",
    href: "/roadmap",
  },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export default function Header() {
  const { currentTheme, changeCurrentTheme } = useContext(ThemeContext);
  const { isConnected } = useAccount();
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
              <div className="relative flex justify-between lg:gap-8 xl:grid xl:grid-cols-12">
                <div className="flex py-2 lg:inset-y-0 lg:left-0 lg:col-span-3 lg:static">
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
                <div className="hidden lg:block min-w-0 flex-1 md:px-8 lg:px-0 xl:col-span-4">
                  <div className="flex items-center px-6 py-4 md:mx-auto md:max-w-3xl lg:mx-0 lg:max-w-none xl:px-0">
                    <div className="w-full"></div>
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

                <div className="hidden lg:flex lg:items-center lg:justify-end lg:gap-x-3 xl:col-span-5">
                  {isConnected && (
                    <button className="rounded-md bg-white dark:bg-black px-3 py-2 text-sm font-semibold text-gray-900 dark:text-zinc-100 shadow-sm hover:bg-gray-50 dark:hover:bg-primary-900 border border-gray-200 dark:border-zinc-900">
                      My Projects
                    </button>
                  )}

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
                                  className="rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
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
                                  className="rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                                >
                                  Wrong network
                                </button>
                              );
                            }

                            return (
                              <button
                                onClick={openAccountModal}
                                className="rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                              >
                                {account.displayName}
                              </button>
                            );
                          })()}
                        </div>
                      );
                    }}
                  </ConnectButton.Custom>
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
                </div>
              </div>
            </div>

            <Popover.Panel as="nav" className="lg:hidden" aria-label="Global">
              <div className="mx-auto mt-6 max-w-3xl px-4 sm:px-6">
                <form className="space-y-3">
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
                </form>

                <div className="mt-8 px-3 space-y-5">
                  {links.map((link) => (
                    <Link
                      key={link.name}
                      href={link.href}
                      className="block text-base font-bold text-gray-900 dark:text-white hover:underline"
                    >
                      {link.name}
                    </Link>
                  ))}
                </div>

                <div className="mt-8">
                  <button className="block w-full rounded-md bg-primary-50 dark:bg-primary-900/50 px-3 py-2 text-sm font-semibold text-primary-600 dark:text-zinc-100 shadow-sm hover:bg-primary-100 dark:hover:bg-primary-900 border border-primary-200 dark:border-primary-900">
                    Link Wallets
                  </button>
                </div>
              </div>
            </Popover.Panel>
          </>
        )}
      </Popover>
    </>
  );
}
