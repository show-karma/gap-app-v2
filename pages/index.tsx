import React from "react";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import Typed from "react-typed";
import { CloudArrowUpIcon, LockClosedIcon } from "@heroicons/react/20/solid";

export default function Index() {
  const projectTypes = [
    "Open Source",
    "Public Goods",
    "Community Funded",
    "Crypto protocol",
  ];

  const features = [
    {
      name: "Push to Deploy",
      description:
        "Ac tincidunt sapien vehicula erat auctor pellentesque rhoncus. Et magna sit morbi lobortis.",
      icon: CloudArrowUpIcon,
    },
    {
      name: "SSL Certificates",
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
        <div className="mx-auto max-w-7xl px-6 pb-24 pt-10 sm:pb-32 lg:flex lg:px-8 lg:py-20">
          <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-2xl lg:flex-shrink-0 lg:pt-8">
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
          <div className="mx-auto mt-16 flex max-w-2xl sm:mt-24 lg:ml-10 lg:mr-0 lg:mt-0 lg:max-w-none lg:flex-none xl:ml-0">
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
    </>
  );
}
