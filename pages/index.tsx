/* eslint-disable @next/next/no-img-element */
import React from "react";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import Typed from "react-typed";
import { PlusIcon } from "@heroicons/react/24/solid";
import { CloudArrowUpIcon, LockClosedIcon } from "@heroicons/react/20/solid";
import { PAGES, chosenCommunities, defaultMetadata } from "@/utilities";
import { NextSeo } from "next-seo";
import { CheckIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/Utilities/Button";
import { ProjectDialog } from "@/components";

const Presentation = () => {
  const phrases = [
    "Open Source",
    "Public Goods",
    "Community Funded",
    "Crypto protocol",
  ];
  return (
    <div className="flex flex-1 items-end gap-8 max-2xl:gap-4">
      <div className="mt-12 flex w-full flex-row items-end justify-center gap-1 max-lg:mt-4">
        <div className="flex w-full flex-[4]  flex-col  items-start">
          <div className="flex flex-1 flex-col gap-8 pb-8 max-2xl:gap-6">
            <h4 className="w-max rounded-3xl bg-[#EAECF5] dark:bg-slate-800 dark:text-blue-400 px-3 py-1 text-center text-base font-semibold text-indigo-900  max-2xl:text-sm">
              ON-CHAIN PROTOCOL
            </h4>

            <div className="flex flex-col gap-1 pb-8 max-2xl:pb-1">
              {/* <h2 className="text-6xl font-bold leading-[64px] text-gray-900 max-2xl:text-4xl max-2xl:leading-[36px] max-lg:text-3xl max-lg:leading-normal">
                Visibility and <br />
                accountability for
              </h2>
              <Typed
                strings={phrases}
                typeSpeed={100}
                className="w-max bg-[#EAECF5] p-4 text-center text-6xl font-normal leading-[64px] text-gray-900 max-2xl:text-4xl max-2xl:leading-[36px] max-lg:text-3xl max-lg:leading-normal"
                loop
                backSpeed={50}
              />
              <h2 className="text-6xl font-bold leading-[64px] text-gray-900 max-2xl:text-4xl max-2xl:leading-[36px] max-lg:text-3xl max-lg:leading-normal">
                projects
              </h2> */}
              <h1 className="text-6xl font-bold leading-[64px] text-gray-900 dark:text-gray-100 max-2xl:text-4xl max-2xl:leading-[36px] max-lg:text-3xl max-lg:leading-normal">
                Visibility and <br />
                accountability for <br className="mb-3" />
                <Typed
                  strings={phrases}
                  typeSpeed={100}
                  className="w-max bg-[#EAECF5] p-4 text-center text-6xl font-normal leading-[120px] dark:text-gray-100 dark:bg-gray-800 text-gray-900 max-2xl:text-4xl max-2xl:leading-[80px] max-lg:text-3xl max-lg:leading-[80px]"
                  loop
                  backSpeed={50}
                />
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
                    "flex rounded-md hover:opacity-75 transition-all ease-in-out duration-300 items-center h-max w-max flex-row gap-3 bg-[#101828] dark:bg-gray-700 px-7 py-4 text-lg font-semibold leading-7 text-white hover:bg-[#101828] max-2xl:px-5 max-2xl:text-base max-lg:text-sm",
                }}
              />
            </div>
          </div>

          <div className="flex w-full flex-1 flex-row flex-wrap gap-6 max-md:flex-col">
            <div className="flex  min-w-min max-w-[500px] flex-1 flex-col items-start gap-3 rounded-3xl  text-gray-900 dark:text-gray-900 bg-[#D7F8EF] dark:bg-gray-400 px-8 py-6 max-2xl:px-6 max-lg:min-w-full">
              <div className="flex items-center justify-center rounded-lg border border-black p-2 ">
                <img
                  src="/icons/coins-stacked.png"
                  alt="Grantee"
                  className="h-7 w-7"
                />
              </div>
              <h2 className=" text-2xl font-bold max-2xl:text-xl">
                For Grantees
              </h2>
              <ul className="">
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
            <div className="flex  min-w-min max-w-[500px] flex-1 flex-col items-start gap-3 rounded-3xl text-gray-900 dark:text-gray-900 bg-[#D7F8EF] dark:bg-gray-400 px-8 py-6 max-2xl:px-6 max-lg:min-w-full">
              <div className="flex items-center justify-center rounded-lg border border-black p-2">
                <img
                  src="/icons/globe.png"
                  alt="For Community + Grant Admins"
                  className="h-7 w-7"
                />
              </div>
              <h2 className="w-full break-words text-2xl font-bold  max-2xl:text-xl">
                For Community + Grant Admins
              </h2>
              <ul>
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
      <div className="flex h-max w-max flex-col gap-6 rounded-3xl bg-[#EAECF0] dark:bg-zinc-400 p-8 max-lg:w-full">
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
              className="flex h-full max-h-[166px] w-full flex-col items-center justify-center gap-2 rounded-2xl px-4 py-6 transition-all duration-300 ease-in-out hover:shadow-lg dark:hover:shadow-zinc-700"
            >
              <div>
                <img
                  alt={community.name}
                  src={community.imageURL}
                  className="h-20 w-20 rounded-full object-cover max-lg:h-10 max-lg:w-10 max-sm:h-6 max-sm:w-6"
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

const WhatIsSolving = () => {
  return (
    <div className="mb-10 mt-16 flex flex-row flex-wrap gap-16 max-lg:flex-col">
      <div className="flex max-w-full flex-1 flex-col gap-2.5 max-2xl:max-w-lg max-lg:max-w-full">
        <h4 className="w-max rounded-3xl bg-[#EAECF5] dark:bg-slate-800 dark:text-blue-400 px-3 py-1 text-center text-base font-semibold text-indigo-900 max-2xl:text-sm">
          100% ON-CHAIN
        </h4>
        <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 max-sm:text-2xl">
          Why are we building this?
        </h2>
        <p className="text-xl font-normal text-gray-900 dark:text-gray-100 max-sm:text-base">
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
          <div className="flex min-w-[280px]  flex-1 flex-col items-start gap-3 rounded-3xl bg-[#D7F8EF] dark:bg-slate-400 dark:text-zinc-900 px-8 py-6 max-2xl:px-6">
            <div className="flex items-center justify-center rounded-lg border border-black p-2 ">
              <img
                src="/icons/coins-stacked.png"
                alt="Grantee"
                className="h-7 w-7"
              />
            </div>
            <h3 className="text-2xl font-bold  max-2xl:text-xl">
              Limited Accessibility
            </h3>
            <p>
              Currently, it is challenging for grant teams and the community to
              easily access and track project progress and milestones, as
              information is scattered across forums and external links.
            </p>
          </div>
          <div className="flex min-w-[280px]  flex-1 flex-col items-start gap-3 rounded-3xl bg-[#E0EAFF] dark:bg-gray-400 dark:text-zinc-900 px-8 py-6 max-2xl:px-6">
            <div className="flex items-center justify-center rounded-lg border border-black p-2 ">
              <img
                src="/icons/coins-stacked.png"
                alt="Grantee"
                className="h-7 w-7"
              />
            </div>
            <h3 className=" text-2xl font-bold  max-2xl:text-xl">
              Reputation Portability
            </h3>
            <p>
              Grantees who apply for grants from multiple organizations struggle
              to establish and carry their reputation consistently across the
              ecosystem. This is particularly difficult for individuals who are
              new to the ecosystem and need opportunities to showcase their work
              and build their reputation.
            </p>
          </div>
        </div>
        <div className="flex min-w-[280px] flex-1 flex-col items-start gap-3 rounded-3xl bg-[#EAECF0] dark:bg-neutral-400 dark:text-zinc-900 px-8 py-6 max-2xl:px-6">
          <div className="flex items-center justify-center rounded-lg border border-black p-2 ">
            <img
              src="/icons/coins-stacked.png"
              alt="Grantee"
              className="h-7 w-7"
            />
          </div>
          <h3 className=" text-2xl font-bold   max-2xl:text-xl">
            Inadequate Data Structure
          </h3>
          <p>
            The absence of structured data that can be accessed in a
            permissionless manner hampers the development of applications and
            analytical tools for evaluating grant impact and builder reputation.
          </p>
        </div>
      </div>
    </div>
  );
};

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
      {/* <Head>
        <title>{defaultMetadata.title}</title>
        <meta name="description" content={defaultMetadata.description} />

        <meta property="og:type" content="website" />
        <meta
          property="og:url"
          content={defaultMetadata.openGraph.url}
          key="ogurl"
        />
        <meta
          property="og:image"
          content={defaultMetadata.openGraph.images[0]}
          key="ogimage"
        />
        <meta
          property="og:site_name"
          content={defaultMetadata.openGraph.siteName}
          key="ogsitename"
        />
        <meta
          property="og:title"
          content={defaultMetadata.title}
          key="ogtitle"
        />
        <meta
          property="og:description"
          content={defaultMetadata.description}
          key="ogdesc"
        />
        <link rel="icon" href={"/favicon.png"} />

        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={defaultMetadata.twitter.site} />
        <meta
          property="twitter:title"
          content={defaultMetadata.twitter.title}
        />
        <meta
          property="twitter:description"
          content={defaultMetadata.twitter.description}
        />
        <meta
          property="twitter:image"
          content={defaultMetadata.twitter.images[0]}
        />
        <meta
          property="twitter:image"
          content={defaultMetadata.twitter.images[0]}
        />
      </Head> */}
      <NextSeo
        title={defaultMetadata.title}
        description={defaultMetadata.description}
        twitter={{
          handle: defaultMetadata.twitter.creator,
          site: defaultMetadata.twitter.site,
          cardType: "summary_large_image",
        }}
        openGraph={{
          url: defaultMetadata.openGraph.url,
          title: defaultMetadata.title,
          description: defaultMetadata.description,
          images: defaultMetadata.openGraph.images.map((image) => ({
            url: image,
            alt: defaultMetadata.title,
          })),
          site_name: defaultMetadata.openGraph.siteName,
        }}
        additionalLinkTags={[
          {
            rel: "icon",
            href: "/favicon.png",
          },
        ]}
      />

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
                className="rounded-md bg-primary-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
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
                        <span className="inline-flex items-center justify-center rounded-xl bg-primary-500 p-3 shadow-lg">
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
        <div className="flex w-full max-w-[1920px] flex-col gap-16 px-16 py-1 max-lg:px-8 max-md:px-4">
          <Presentation />
          <Communities />
          <WhatIsSolving />
        </div>
      </div>

      {/* Communities using GAP */}
      <div
        className="flex px-6 pb-24 pt-10 sm:pb-32 lg:flex lg:px-8 lg:py-12 bg-white
      "
      >
        <div className="w-3/12">
          <div className="p-8 bg-gray-100 rounded-3xl">
            <div className="p-3 border border-gray-900 rounded-xl inline-flex">
              <Image
                src="/images/globe.png"
                alt="Coins stacked"
                className="mx-auto"
                height={28}
                width={28}
              />
            </div>
            <div className="mt-5 font-bold text-6xl">Communities using GAP</div>
          </div>
        </div>

        <div className="w-9/12">
          <div className="flex justify-around">
            <div className="text-center">
              <Image
                src="/logos/arbitrum_400x400.png"
                className="h-20 w-20 rounded-full mx-auto"
                alt="Arbitrum"
                height={400}
                width={400}
              />
              <div className="mt-3 font-bold text-xl">Arbitrum</div>
            </div>
            <div className="text-center">
              <Image
                src="/logos/gitcoin_200x200.jpeg"
                className="h-20 w-20 rounded-full mx-auto"
                alt="Gitcoin"
                height={200}
                width={200}
              />
              <div className="mt-3 font-bold text-xl">Gitcoin</div>
            </div>
            <div className="text-center">
              <Image
                src="/logos/optimism_256x256.jpeg"
                className="h-20 w-20 rounded-full mx-auto"
                alt="Optimism"
                height={256}
                width={256}
              />
              <div className="mt-3 font-bold text-xl">Optimism</div>
            </div>
            <div className="text-center">
              <Image
                src="/logos/nouns_400x400.jpeg"
                className="h-20 w-20 rounded-full mx-auto"
                alt="Public Nouns"
                height={400}
                width={400}
              />
              <div className="mt-3 font-bold text-xl">Public Nouns</div>
            </div>
          </div>
          <div className="mt-16 px-20">
            <button
              type="button"
              className="flex items-center rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              Add your Community
              <PlusIcon className="ml-2 -mr-0.5 h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Why are we building this? */}
      <div className="flex gap-x-20 px-6 pb-24 pt-10 sm:pb-32 lg:flex lg:px-8 lg:py-12 bg-white">
        <div className="w-6/12">
          <div className="mt-24 sm:mt-32 lg:mt-16">
            <span className="rounded-full bg-primary-600/10 px-3 py-1 text-sm font-semibold leading-6 text-primary-600 ring-1 ring-inset ring-primary-600/10">
              100% ON-CHAIN
            </span>
          </div>
          <div className="mt-8 font-semibold text-4xl">
            Why are we building this?
          </div>
          <div className="mt-8 space-y-5">
            <p className="text-gray-900 text-xl">
              Annually, the crypto ecosystem issues grants amounting to millions
              of dollars. While this funding is crucial for ecosystem growth, it
              has also introduced a range of issues.
            </p>

            <p className="text-gray-900 text-xl">
              The Grantee Accountability Protocol (GAP) is designed to address
              these challenges by aiding grantees in building their reputation,
              assisting communities in maintaining grantee accountability, and
              enabling third parties to develop applications using this
              protocol.
            </p>
          </div>
        </div>
        <div className="w-6/12">
          <div className="flex gap-x-3">
            <div className="w-6/12 border border-green-200 bg-green-100 rounded-3xl p-5">
              <div className="p-3 border border-gray-900 rounded-xl inline-flex">
                <Image
                  src="/images/coins-stacked.png"
                  alt="Coins stacked"
                  className="mx-auto"
                  height={28}
                  width={28}
                />
              </div>
              <div className="mt-5 font-bold text-2xl">
                Limited Accessibility
              </div>
              <p className="mt-5 text-gray-600">
                Currently, it is challenging for grant teams and the community
                to easily access and track project progress and milestones, as
                information is scattered across forums and external links.
              </p>
            </div>
            <div className="w-6/12 border border-indigo-200 bg-indigo-200 rounded-3xl p-5">
              <div className="p-3 border border-gray-900 rounded-xl inline-flex">
                <Image
                  src="/images/coins-stacked.png"
                  alt="Coins stacked"
                  className="mx-auto"
                  height={28}
                  width={28}
                />
              </div>
              <div className="mt-5 font-bold text-2xl">
                Reputation Portability
              </div>
              <p className="mt-5 text-gray-600">
                Grantees who apply for grants from multiple organizations
                struggle to establish and carry their reputation consistently
                across the ecosystem. This is particularly difficult for
                individuals who are new to the ecosystem and need opportunities
                to showcase their work and build their reputation.
              </p>
            </div>
          </div>
          <div className="mt-5 border border-gray-200 bg-gray-200 rounded-3xl p-5">
            <div className="p-3 border border-gray-900 rounded-xl inline-flex">
              <Image
                src="/images/coins-stacked.png"
                alt="Coins stacked"
                className="mx-auto"
                height={28}
                width={28}
              />
            </div>
            <div className="mt-5 font-bold text-2xl">
              Inadequate Data Structure
            </div>
            <p className="mt-5 text-gray-600">
              The absence of structured data that can be accessed in a
              permissionless manner hampers the development of applications and
              analytical tools for evaluating grant impact and builder
              reputation.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
