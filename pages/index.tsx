import React from "react";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import Typed from "react-typed";
import { CloudArrowUpIcon, LockClosedIcon } from "@heroicons/react/20/solid";
import { PlusIcon } from "@heroicons/react/24/solid";

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
      <Head>
        <title>Gap</title>
        <meta name="title" content="Gap" />
      </Head>

      <div className="relative isolate overflow-hidden bg-white">
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
