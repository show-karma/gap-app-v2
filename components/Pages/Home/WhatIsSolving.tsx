import Image from "next/image";

export function WhatIsSolving() {
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
              <Image
                src="/icons/coins-stacked.png"
                alt="Grantee"
                className="h-7 w-7"
                width={28}
                height={28}
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
              <Image
                src="/icons/coins-stacked.png"
                alt="Grantee"
                className="h-7 w-7"
                width={28}
                height={28}
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
}
