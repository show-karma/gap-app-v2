import Link from "next/link";
import { MegaphoneIcon } from "@/components/Icons/Megaphone";
import { RightArrowIcon } from "@/components/Icons/RightArrow";
import { NON_PROFITS_PAGES } from "@/utilities/pages";

const bannerLink = NON_PROFITS_PAGES.HOME;

// Brand announcement colors are one-off marketing tokens with no Tailwind
// theme equivalent, so they live as inline styles rather than arbitrary
// color classes.
const BANNER_BG = "#bee1d8";
const BRAND_TEAL = "#1de9b6";
const BRAND_INK = "#080a0e";

export function NewFeatureBanner() {
  return (
    <div className="flex w-full">
      <div
        className="flex w-full justify-between border-l-[5px] rounded-l-lg p-4 gap-4 max-md:p-2 max-md:flex-col"
        style={{ backgroundColor: BANNER_BG, borderColor: BRAND_TEAL }}
      >
        <div className="flex flex-row gap-4 items-center max-md:gap-2.5">
          <MegaphoneIcon />
          <div className="flex flex-row gap-1">
            <p className="text-sm font-semibold max-md:text-xs" style={{ color: BRAND_INK }}>
              We just launched funder search for nonprofits
            </p>{" "}
            <Link
              href={bannerLink}
              className="text-sm font-semibold text-blue-600 max-md:text-xs underline"
            >
              Try it now
            </Link>
          </div>
        </div>
        <Link href={bannerLink}>
          <button
            type="button"
            className="max-md:text-xs max-md:p-[8px_12px] rounded-[4px] flex items-center justify-center gap-[8px] p-[16px_24px] outline-none border-none font-semibold text-[14px] leading-[16px]"
            style={{ backgroundColor: BRAND_INK, color: BRAND_TEAL }}
          >
            View details
            <RightArrowIcon />
          </button>
        </Link>
      </div>
    </div>
  );
}
