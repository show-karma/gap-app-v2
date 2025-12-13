"use client";
import { ChevronRightIcon } from "@heroicons/react/20/solid";
import Image from "next/image";
import Link from "next/link";
import pluralize from "pluralize";
import type { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList";
import { useDonationCart } from "@/store";
import type { CommunityDetailsResponse } from "@/types/v2/community";
import { communityColors } from "@/utilities/communityColors";
import { PAGES } from "@/utilities/pages";
import { ReadMore } from "@/utilities/ReadMore";

interface DonationHeaderProps {
  community: CommunityDetailsResponse;
  programId: string;
  program: GrantProgram;
}

export const DonationHeader = ({ community, programId, program }: DonationHeaderProps) => {
  const { items, toggle: _toggle } = useDonationCart();
  return (
    <div className="flex flex-row w-full max-w-full px-4 pb-4 sm:px-6 lg:px-8 py-5 border-b border-b-[#DFE1E6]">
      <div className="flex flex-row items-start gap-4 w-full">
        <div
          className="flex mt-4 flex-row items-center justify-center p-3 rounded-xl w-[72px] h-[72px]"
          style={{
            backgroundColor:
              communityColors[
                (community as CommunityDetailsResponse)?.uid?.toLowerCase() || "black"
              ] || "#000000",
          }}
        >
          <Image
            height={48}
            width={48}
            src={community.details?.logoUrl || community.details?.imageURL || ""}
            alt={community.details?.name}
            className="h-12 w-12 min-w-12 min-h-12 rounded-full border border-white"
          />
        </div>
        <div className="flex flex-col gap-0">
          <div className="flex flex-row items-center gap-3">
            <Link
              href={PAGES.COMMUNITY.DONATE_PROGRAM(
                community.details.slug || community.uid,
                programId
              )}
              className="text-sm font-medium text-blue-600 underline"
            >
              Program Donations
            </Link>
            <ChevronRightIcon className="w-4 h-4 text-neutral-300" />
            <p className="text-sm font-normal text-black dark:text-white">
              Donation Checkout{" "}
              {items.length > 0 && `(${items.length} ${pluralize("item", items.length)})`}
            </p>
          </div>
          <h1 className="text-3xl font-bold text-black dark:text-white">
            {program.metadata?.title}
          </h1>
          <ReadMore markdownClass="text-sm text-gray-800 dark:text-gray-200" side="left">
            {program.metadata?.description || ""}
          </ReadMore>
        </div>
      </div>
    </div>
  );
};
