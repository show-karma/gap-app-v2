import { ExternalLink } from "@/components/Utilities/ExternalLink";
import Image from "next/image";
const links = {
  funding_block: "https://tally.so/r/w2rJ8M",
  add_program: "/funding-map/add-program",
  cryptographer:
    "https://sovs.notion.site/Cartographer-Syndicate-a574b48ae162451cb73c17326f471b6a",
  notion:
    "https://www.notion.so/sovs/Onchain-Grant-Registry-8fde2610cf6c4422a07216d4b2506c73",
};

export const ProgramHeader = () => {
  return (
    <div className="flex flex-col w-full gap-3">
      <div className="flex flex-[3] flex-col gap-3 items-start justify-start text-left max-lg:gap-1">
        <h1 className="text-2xl tracking-[-0.72px] 2xl:text-4xl font-bold text-start text-black dark:text-white max-lg:tracking-normal">
          {`The best grant program directory you’ll find`}
        </h1>
        <p className="text-start text-lg max-lg:text-base max-w-5xl text-black dark:text-white">
          Explore our curated list of grant programs for innovators and
          creators: from tech pioneers to community leaders, there is a grant
          program to elevate your project. Find and apply for a grant now!
        </p>
      </div>
      <div className="flex flex-row gap-4 flex-wrap">
        <div className="bg-[#DBFFC5] flex flex-row gap-3 px-3 py-4 rounded-lg w-full max-w-[312px] h-[96px] max-md:h-full max-sm:max-w-full">
          <Image
            src="/icons/funding.png"
            alt="Funding"
            className="mt-1"
            height={24}
            width={24}
          />
          <div className="flex flex-col gap-1">
            <p className="text-black text-sm font-semibold">
              Looking for funding?
            </p>
            <p className="text-[#344054] text-sm font-normal">
              <ExternalLink
                href={links.funding_block}
                className="text-[#155EEF] underline font-semibold"
              >
                Get notified
              </ExternalLink>{" "}
              when we add a new grant or bounty
            </p>
          </div>
        </div>
        <div className="bg-[#DDF9F2] flex flex-row gap-3 px-3 py-4 rounded-lg w-full max-w-[312px] h-[96px] max-md:h-full max-sm:max-w-full">
          <Image
            src="/icons/reward.png"
            alt="Reward"
            height={24}
            width={24}
            className="mt-1"
          />
          <div className="flex flex-col gap-1">
            <p className="text-black text-sm font-semibold">
              Are we missing a grant program?
            </p>
            <p className="text-[#344054] text-sm font-normal">
              <ExternalLink
                href={links.add_program}
                className="text-[#155EEF] underline font-semibold"
              >
                Submit a program
              </ExternalLink>{" "}
              and get rewarded
            </p>
          </div>
        </div>
        <div className="bg-[#E0EAFF] flex flex-row gap-3 px-3 py-4 rounded-lg w-full max-w-[312px] h-[96px] max-md:h-full max-sm:max-w-full">
          <Image
            src="/icons/karma-program-registry-syndicate.png"
            alt="Cartographer Syndicate"
            height={24}
            width={24}
            className="mt-1"
          />
          <div className="flex flex-col gap-1">
            <p className="text-black text-sm font-semibold">
              This registry is maintained by the Cartographer Syndicate.
            </p>
            <p className="text-[#344054] text-sm font-normal">
              <ExternalLink
                href={links.cryptographer}
                className="text-[#155EEF] underline font-semibold"
              >
                Learn more
              </ExternalLink>{" "}
              about it
            </p>
          </div>
        </div>
        <div className="bg-[#ECE9FE] flex flex-row gap-3 px-3 py-4 rounded-lg w-full max-w-[312px] h-[96px] max-md:h-full max-sm:max-w-full">
          <Image
            src="/icons/karma-logo-rounded.png"
            alt="Karma Logo"
            height={24}
            width={24}
            className="mt-1"
          />
          <div className="flex flex-col gap-1">
            <p className="text-black text-sm font-semibold">
              Our vision and roadmap for the funding map.
            </p>
            <p className="text-[#344054] text-sm font-normal">
              <ExternalLink
                href={links.notion}
                className="text-[#155EEF] underline font-semibold"
              >
                Learn more
              </ExternalLink>{" "}
              about it.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
