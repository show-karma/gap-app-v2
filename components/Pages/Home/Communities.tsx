import { Button } from "@/components/Utilities/Button";
import { chosenCommunities } from "@/utilities/chosenCommunities";
import { PAGES } from "@/utilities/pages";
import { PlusIcon } from "@heroicons/react/24/solid";
import Image from "next/image";
import Link from "next/link";

export const Communities = () => {
  // const { communities } = useCommunity();

  // const communitiesNameToShow = [
  //   'optimism',
  //   'gitcoin',
  //   'arbitrum',
  //   'ethereum-foundation',
  // ];

  // const communitiesToShow = communities.filter((community) =>
  //   communitiesNameToShow.includes(
  //     community.details?.slug ||
  //       community.details?.name.toLowerCase() ||
  //       community.uid
  //   )
  // );

  return (
    <div className="mb-8 mt-[80px] flex h-max w-full flex-row justify-center gap-4 max-md:flex-col max-lg:flex-wrap">
      <div className="flex h-max w-max flex-col gap-6 rounded-3xl  bg-[#EAECF0] dark:bg-zinc-400 p-8 max-lg:w-full">
        <div className="h-max w-max rounded-lg border border-black p-2">
          <Image src="/icons/globe.svg" alt="Globe" width={28} height={28} />
        </div>
        <h4 className="text-5xl font-bold leading-[50px] text-gray-900 max-lg:text-3xl">
          Communities using GAP
        </h4>
      </div>
      <div className="flex w-full flex-col items-center justify-center gap-8">
        <div className="grid w-full grid-cols-4 max-md:grid-cols-2">
          {chosenCommunities().map((community) => (
            <Link
              key={community.uid}
              href={PAGES.COMMUNITY.ALL_GRANTS(community.slug || community.uid)}
              className="flex hover:shadow-md h-full max-h-[166px] w-full flex-col items-center justify-center gap-2 rounded-2xl px-4 py-6 transition-all duration-300 ease-in-out "
            >
              <div className="relative h-20 w-20 max-lg:h-10 max-lg:w-10 max-sm:h-6 max-sm:w-6">
                <Image
                  src={community.imageURL.light}
                  alt={community.name}
                  className={"dark:hidden rounded-full object-cover "}
                  layout="fill"
                />
                <Image
                  src={community.imageURL.dark}
                  alt={community.name}
                  className={"hidden dark:block rounded-full object-cover"}
                  layout="fill"
                />
              </div>

              <p className="line-clamp-1 text-center text-xl font-bold text-black dark:text-zinc-400 max-sm:text-base">
                {community.name}
              </p>
            </Link>
          ))}
          <a
            href="https://tally.so/r/wd0jeq"
            target="_blank"
            rel="noreferrer"
            className="flex h-[166px] w-full flex-col items-center justify-center gap-2 rounded-2xl px-4 py-6 transition-all duration-300 ease-in-out"
          >
            <Button className="flex flex-row items-center gap-2 dark:border-slate-600 border border-black bg-white dark:bg-zinc-700 dark:text-white rounded-md p-4 text-sm font-semibold text-black hover:bg-white max-lg:text-xs">
              Add your Community
              <PlusIcon className="h-5 w-5" />
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
};
