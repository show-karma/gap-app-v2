/* eslint-disable @next/next/no-img-element */
import React, { Suspense, useState } from "react";
import Link from "next/link";
import { PlusIcon } from "@heroicons/react/24/solid";
import { CloudArrowUpIcon, LockClosedIcon } from "@heroicons/react/20/solid";
import { CheckIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/Utilities/Button";
import dynamic from "next/dynamic";
import { chosenCommunities } from "@/utilities/chosenCommunities";
import { PAGES } from "@/utilities/pages";
import { defaultMetadata } from "@/utilities/meta";
import { ImageTheme } from "@/components/Utilities/ImageTheme";
import { TypedLoading } from "@/components/Pages/Home/ReactTypedWrapp";
// import { ReactTypedWrapper } from "@/components/Pages/Home/ReactTypedWrapp";
import { MegaphoneIcon } from "@/components/Icons/Megaphone";
import { RightArrowIcon } from "@/components/Icons/RightArrow";
import { ExternalLink } from "@/components/Utilities/ExternalLink";

const ProjectDialog = dynamic(
  () =>
    import("@/components/Dialogs/ProjectDialog/index").then(
      (mod) => mod.ProjectDialog
    ),
  { ssr: false }
);
const ReactTypedWrapper = dynamic(
  () =>
    import("@/components/Pages/Home/ReactTypedWrapp").then(
      (mod) => mod.ReactTypedWrapper
    ),
  { ssr: false, loading: () => <TypedLoading /> }
);

const Presentation = () => {
  return (
    <div className="flex flex-1 items-end gap-8 max-2xl:gap-4">
      <div className=" flex w-full flex-row items-end justify-center gap-1 max-lg:mt-4">
        <div className="flex w-full flex-[4]  flex-col  items-start">
          <div className="flex flex-1 flex-col gap-8 pb-8 max-2xl:gap-6">
            <h4 className="w-max rounded-3xl bg-[#EAECF5] dark:bg-slate-800 dark:text-blue-400 px-3 py-1 text-center text-base font-semibold text-indigo-900  max-2xl:text-sm">
              ONCHAIN PROTOCOL
            </h4>

            <div className="flex flex-col gap-1 pb-8 max-2xl:pb-1">
              <h1 className="text-6xl font-bold leading-[64px] text-gray-900 dark:text-gray-100 max-2xl:text-4xl max-2xl:leading-[36px] max-lg:text-3xl max-lg:leading-normal">
                Visibility and <br />
                accountability for <br className="mb-3" />
                <ReactTypedWrapper />
                <span className="text-6xl font-bold leading-[64px] text-gray-900 dark:text-gray-100 max-2xl:text-4xl max-2xl:leading-[36px] max-lg:text-3xl max-lg:leading-normal">
                  <br /> projects
                </span>
              </h1>
            </div>

            <div className="w-max">
              <ProjectDialog
                buttonElement={{
                  icon: (
                    <img
                      className="h-6 w-6 text-white"
                      alt="Contact"
                      src="/icons/arrow-right-2.svg"
                    />
                  ),
                  iconSide: "right",
                  text: "Add your project",
                  styleClass:
                    "flex rounded-md hover:opacity-75 border-none transition-all ease-in-out duration-300 items-center h-max w-max flex-row gap-3 bg-[#101828] dark:bg-gray-700 px-7 py-4 text-lg font-semibold leading-7 text-white hover:bg-[#101828] max-2xl:px-5 max-2xl:text-base max-lg:text-sm",
                }}
              />
            </div>
          </div>

          <div className="flex w-full flex-1 flex-row flex-wrap gap-6 max-md:flex-col">
            <div className="flex  min-w-min max-w-[500px] flex-1 flex-col items-start gap-3 rounded-3xl  text-gray-900 dark:text-gray-900 bg-[#D7F8EF] px-8 py-6 max-2xl:px-6 max-lg:min-w-full">
              <div className="flex items-center justify-center rounded-lg border border-black p-2 ">
                <img
                  src="/icons/coins-stacked.png"
                  alt="Grantee"
                  className="h-7 w-7"
                />
              </div>
              <h2 className="text-2xl text-black font-bold max-2xl:text-xl">
                For Grantees
              </h2>
              <ul className="text-gray-900">
                <li className="flex w-full flex-row gap-4 break-words">
                  <CheckIcon className="h-6 min-h-[24px] w-6 min-w-[24px]" />
                  <p className="text-base font-normal">
                    Self-Report on grant progress.
                  </p>
                </li>
                <li className="flex w-full flex-row gap-4 break-words">
                  <CheckIcon className="h-6 min-h-[24px] w-6 min-w-[24px]" />
                  <p className="text-base font-normal">Build Reputation.</p>
                </li>
                <li className="flex w-full flex-row gap-4 break-words">
                  <CheckIcon className="h-6 min-h-[24px] w-6 min-w-[24px]" />
                  <p className="text-base font-normal">Receive more funding.</p>
                </li>
              </ul>
            </div>
            <div className="flex  min-w-min max-w-[500px] flex-1 flex-col items-start gap-3 rounded-3xl text-gray-900 dark:text-gray-900 bg-[#D7F8EF] px-8 py-6 max-2xl:px-6 max-lg:min-w-full">
              <div className="flex items-center justify-center rounded-lg border border-black p-2">
                <img
                  src="/icons/globe.png"
                  alt="For Community + Grant Admins"
                  className="h-7 w-7"
                />
              </div>
              <h2 className="w-full text-black break-words text-2xl font-bold  max-2xl:text-xl">
                For Community + Grant Admins
              </h2>
              <ul className="text-gray-900">
                <li className="flex w-full flex-row gap-4 break-words">
                  <CheckIcon className="h-6 min-h-[24px] w-6 min-w-[24px]" />
                  <p className="text-base font-normal ">
                    Stay up-to-date on projects progress.
                  </p>
                </li>
                <li className="flex w-full flex-row gap-4 break-words">
                  <CheckIcon className="h-6 min-h-[24px] w-6 min-w-[24px]" />
                  <p className="text-base font-normal ">
                    Trigger payments based on milestone completion.
                  </p>
                </li>
                <li className="flex w-full flex-row gap-4 break-words">
                  <CheckIcon className="h-6 max-h-[24px] min-h-[24px] w-6 min-w-[24px] max-w-[24px]" />
                  <p className="text-base font-normal ">
                    Endorse projects, monitor fund usage and flag discrepancies.
                  </p>
                </li>
              </ul>
            </div>
            <div />
          </div>
        </div>
        <div className="flex h-full w-full max-w-[720px] flex-col justify-end max-2xl:max-w-[500px] max-xl:max-w-[360px] max-lg:hidden">
          <img
            className="aspect-auto h-[auto] w-full max-w-[720px]"
            src="/images/homepage-artwork.png"
            alt="Homepage artwork"
          />
        </div>
      </div>
    </div>
  );
};

const Communities = () => {
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
          <img src="/icons/globe.svg" alt="Globe" className="h-7 w-7" />
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
              <ImageTheme
                alt={community.name}
                lightSrc={community.imageURL.light}
                darkSrc={community.imageURL.dark}
                className={
                  "h-20 w-20 rounded-full object-cover max-lg:h-10 max-lg:w-10 max-sm:h-6 max-sm:w-6"
                }
              />

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

const WhatIsSolving = () => {
  return (
    <div className="mb-10 mt-16 flex flex-row flex-wrap gap-16 max-lg:flex-col">
      <div className="flex max-w-full flex-1 flex-col gap-2.5 max-2xl:max-w-lg max-lg:max-w-full">
        <h4 className="w-max rounded-3xl bg-[#EAECF5] dark:bg-slate-800 dark:text-blue-400 px-3 py-1 text-center text-base font-semibold text-indigo-900  max-2xl:text-sm">
          100% ONCHAIN
        </h4>
        <h2 className="text-4xl font-bold text-gray-900 max-sm:text-2xl dark:text-zinc-100">
          Why are we building this?
        </h2>
        <p className="text-xl font-normal text-gray-900 max-sm:text-base dark:text-zinc-200">
          Annually, the crypto ecosystem issues grants amounting to millions of
          dollars. While this funding is crucial for ecosystem growth, it has
          also introduced a range of issues.
          <br />
          <br />
          The Grantee Accountability Protocol (GAP) is designed to address these
          challenges by aiding grantees in building their reputation, assisting
          communities in maintaining grantee accountability, and enabling third
          parties to develop applications using this protocol.
        </p>
      </div>
      <div className="flex flex-1 flex-col gap-6">
        <div className="flex flex-row flex-wrap gap-6">
          <div className="flex min-w-[280px]  flex-1 flex-col items-start gap-3 rounded-3xl  bg-[#D7F8EF] px-8 py-6 max-2xl:px-6">
            <div className="flex items-center justify-center rounded-lg border border-black p-2 ">
              <img
                src="/icons/coins-stacked.png"
                alt="Grantee"
                className="h-7 w-7"
              />
            </div>
            <h3 className="text-2xl font-bold text-black  max-2xl:text-xl">
              Limited Accessibility
            </h3>
            <p className="text-gray-700">
              Currently, it is challenging for grant teams and the community to
              easily access and track project progress and milestones, as
              information is scattered across forums and external links.
            </p>
          </div>
          <div className="flex min-w-[280px]  flex-1 flex-col items-start gap-3 rounded-3xl bg-[#E0EAFF] px-8 py-6 max-2xl:px-6">
            <div className="flex items-center justify-center rounded-lg border border-black p-2 ">
              <img
                src="/icons/coins-stacked.png"
                alt="Grantee"
                className="h-7 w-7"
              />
            </div>
            <h3 className=" text-2xl font-bold text-black  max-2xl:text-xl">
              Reputation Portability
            </h3>
            <p className="text-gray-700">
              Grantees who apply for grants from multiple organizations struggle
              to establish and carry their reputation consistently across the
              ecosystem. This is particularly difficult for individuals who are
              new to the ecosystem and need opportunities to showcase their work
              and build their reputation.
            </p>
          </div>
        </div>
        <div className="flex min-w-[280px] flex-1 flex-col items-start gap-3 rounded-3xl bg-[#EAECF0] px-8 py-6 max-2xl:px-6">
          <div className="flex items-center justify-center rounded-lg border border-black p-2 ">
            <img
              src="/icons/coins-stacked.png"
              alt="Grantee"
              className="h-7 w-7"
            />
          </div>
          <h3 className=" text-2xl font-bold text-black  max-2xl:text-xl">
            Inadequate Data Structure
          </h3>
          <p className="text-gray-700">
            The absence of structured data that can be accessed in a
            permissionless manner hampers the development of applications and
            analytical tools for evaluating grant impact and builder reputation.
          </p>
        </div>
      </div>
    </div>
  );
};

export const metadata = defaultMetadata;
function NewFeatureBanner() {
  return (
    <div className="flex w-full">
      <div className="flex w-full justify-between bg-[#bee1d8] border-l-[5px] border-[#1de9b6] rounded-l-lg p-4 gap-4 max-md:p-2 max-md:flex-col">
        <div className="flex flex-row gap-4 items-center max-md:gap-2.5">
          <MegaphoneIcon />
          <div className="flex flex-col">
            <p className="text-sm font-semibold text-[#080a0e] max-md:text-xs">
              We just launched onchain grant program registry - find funding for
              your project.
            </p>
            {/* <p>
							Visibility and accountability for community funded and public
							goods projects.
						</p> */}
          </div>
        </div>
        <ExternalLink href="/funding-map">
          <button
            type="button"
            className="max-md:text-xs max-md:p-[8px_12px] bg-[#080a0e] rounded-[4px] text-[#1de9b6] flex items-center justify-center gap-[8px] p-[16px_24px] outline-none border-none font-semibold text-[14px] leading-[16px]"
          >
            View details
            <RightArrowIcon />
          </button>
        </ExternalLink>
      </div>
    </div>
  );
}

export default function Index() {
  const projectTypes = [
    "Open Source",
    "Public Goods",
    "Community Funded",
    "Crypto protocol",
  ];

  const features = [
    {
      name: "For Grantees",
      description:
        "Ac tincidunt sapien vehicula erat auctor pellentesque rhoncus. Et magna sit morbi lobortis.",
      icon: CloudArrowUpIcon,
    },
    {
      name: "For Community + Grant Admins",
      description:
        "Ac tincidunt sapien vehicula erat auctor pellentesque rhoncus. Et magna sit morbi lobortis.",
      icon: LockClosedIcon,
    },
  ];

  return (
    <>
      {/* <div className="relative isolate overflow-hidden bg-white">
        <svg
          className="absolute inset-0 -z-10 h-full w-full stroke-gray-200 [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)]"
          aria-hidden="true"
        >
          <defs>
            <pattern
              id="0787a7c5-978c-4f66-83c7-11c213f99cb7"
              width={200}
              height={200}
              x="50%"
              y={-1}
              patternUnits="userSpaceOnUse"
            >
              <path d="M.5 200V.5H200" fill="none" />
            </pattern>
          </defs>
          <rect
            width="100%"
            height="100%"
            strokeWidth={0}
            fill="url(#0787a7c5-978c-4f66-83c7-11c213f99cb7)"
          />
        </svg>
        <div className="px-6 pb-24 pt-10 sm:pb-32 lg:flex lg:px-8 lg:py-12">
          <div className="w-7/12">
            <div className="mt-24 sm:mt-32 lg:mt-16">
              <span className="rounded-full bg-primary-600/10 px-3 py-1 text-sm font-semibold leading-6 text-primary-600 ring-1 ring-inset ring-primary-600/10">
                ONCHAIN PROTOCOL
              </span>
            </div>
            <h1 className="mt-10 text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Accountability <br /> & Visibility for
            </h1>
            <div className="mt-5">
              <Typed
                strings={projectTypes}
                typeSpeed={100}
                className="w-max bg-[#EAECF5] p-4 text-center text-6xl font-normal leading-[120px] text-gray-900 max-2xl:text-4xl max-2xl:leading-[80px] max-lg:text-3xl max-lg:leading-[80px]"
                loop
                backSpeed={50}
              />
            </div>
            <h1 className="mt-10 text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Projects
            </h1>
            <div className="mt-10 flex items-center gap-x-6">
              <Link
                href="/add"
                className="rounded-md bg-primary-600 px-3.5 py-2.5 text-sm font-semibold text-white  hover:bg-brand-blue focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
              >
                Add your project<span className="ml-2">→</span>
              </Link>
            </div>
            <div className="mt-12 w-full grid grid-cols-1 gap-12 sm:grid-cols-2">
              {features.map((feature) => (
                <div key={feature.name} className="pt-6">
                  <div className="flow-root rounded-lg bg-gray-50 px-6 pb-8">
                    <div className="-mt-6">
                      <div>
                        <span className="inline-flex items-center justify-center rounded-xl bg-brand-blue p-3 ">
                          <feature.icon
                            className="h-8 w-8 text-white"
                            aria-hidden="true"
                          />
                        </span>
                      </div>
                      <h3 className="mt-8 text-lg font-semibold leading-8 tracking-tight text-gray-900">
                        {feature.name}
                      </h3>
                      <p className="mt-5 text-base leading-7 text-gray-600">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="w-5/12">
            <div className="max-w-3xl flex-none sm:max-w-5xl lg:max-w-none">
              <Image
                src="/images/homepage-artwork.png"
                alt="App screenshot"
                width={850}
                height={933}
                className="w-full rounded-md"
              />
            </div>
          </div>
        </div>
      </div> */}
      <div className="flex w-full flex-col items-center bg-white dark:bg-black">
        <div className="flex w-full max-w-[1920px] flex-col gap-2 px-16 py-1 pt-4 max-lg:px-8 max-md:px-4">
          <NewFeatureBanner />
          <div className="flex flex-col gap-16 py-4">
            <Presentation />
            <Communities />
            <WhatIsSolving />
          </div>
        </div>
      </div>
    </>
  );
}
