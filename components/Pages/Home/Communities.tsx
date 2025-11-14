import { ChevronRightIcon } from "@heroicons/react/24/solid"
import Image from "next/image"
import Link from "next/link"
import { ImageTheme } from "@/components/Utilities/ImageTheme"
import { chosenCommunities } from "@/utilities/chosenCommunities"
import { PAGES } from "@/utilities/pages"

export const Communities = () => {
  return (
    <div className="mb-8 mt-[80px] flex w-full flex-col items-center justify-center gap-10">
      <div className="flex flex-col gap-2 items-center justify-center w-full">
        <div className="flex flex-row gap-2 items-center justify-center bg-primary-200 rounded-full w-fit h-[40px] px-4 mx-auto">
          <Image width={24} height={24} src="/icons/impact.png" alt="Rocket icon" />
          <p className="text-primary-700 text-xs sm:text-base font-medium">
            Trusted by the top web3 ecosystems
          </p>
        </div>

        <h1 className="text-4xl sm:text-[72px] font-bold text-black dark:text-white">
          Communities on Karma
        </h1>
        <p className="text-black dark:text-white text-sm sm:text-lg max-w-4xl text-center">
          Explore the ecosystem of DAOs, protocols, and organizations growing their communities
          through transparent funding, accountability, and impact measurement.
        </p>
      </div>

      <div className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {chosenCommunities()
          .slice(0, 10)
          .map((community) => (
            <Link
              key={community.uid}
              href={PAGES.COMMUNITY.ALL_GRANTS(community.slug || community.uid)}
              className="group flex h-[70px] sm:h-[120px] w-full items-center justify-between overflow-hidden rounded-2xl border border-slate-300 bg-white transition-all duration-200 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900"
            >
              <div className="flex flex-row items-center w-full">
                <div className="h-[70px] w-[70px] sm:h-[120px] sm:w-[120px] flex-shrink-0 overflow-hidden bg-[#1F2D3D] dark:bg-zinc-800">
                  <ImageTheme
                    alt={community.name}
                    lightSrc={community.imageURL.light}
                    darkSrc={community.imageURL.dark}
                    className="h-full w-full object-cover"
                  />
                </div>

                <p className="ml-4 line-clamp-1 text-lg font-medium text-black dark:text-zinc-200">
                  {community.name}
                </p>
              </div>

              <div className="pr-3">
                <ChevronRightIcon className="h-5 w-5 text-slate-400 transition-colors group-hover:text-slate-600 dark:text-zinc-500 dark:group-hover:text-zinc-300" />
              </div>
            </Link>
          ))}
      </div>

      <Link
        href={PAGES.COMMUNITIES}
        className="bg-black text-white font-bold rounded-sm px-7 py-5 mt-5 w-fit mx-auto hover:opacity-80 transition-colors text-lg"
      >
        Explore All Communities
      </Link>
    </div>
  )
}
