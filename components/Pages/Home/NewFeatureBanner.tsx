import { MegaphoneIcon } from "@/components/Icons/Megaphone";
import { RightArrowIcon } from "@/components/Icons/RightArrow";
import { ExternalLink } from "@/components/Utilities/ExternalLink";

export function NewFeatureBanner() {
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