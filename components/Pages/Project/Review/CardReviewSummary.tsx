import { ReviewMode } from "@/types/review";
import { PlusIcon } from "@heroicons/react/24/solid";
import { Button } from "@/components/Utilities/Button";
import { isAddressEqual } from "viem";
import { DynamicStarsReview } from "./DynamicStarsReview";
import { useProjectStore } from "@/store";
import { useAccount, useSwitchChain } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import toast from "react-hot-toast";
import { arbitrum } from "viem/chains";
import { useReviewStore } from "@/store/review";
import { getBadgeIds } from "@/utilities/review/getBadgeIds";
import { SCORER_ID } from "@/utilities/review/constants/constants";
import { getBadge } from "@/utilities/review/getBadge";
import { ProgressBar } from "./ProgressBar";

export const CardReviewSummary = () => {
  const project = useProjectStore((state: any) => state.project);
  const setIsOpenReview = useReviewStore((state: any) => state.setIsOpenReview);
  const setActiveBadges = useReviewStore((state: any) => state.setActiveBadges);
  const setActiveBadgeIds = useReviewStore((state: any) => state.setActiveBadgeIds);
  const stories = useReviewStore((state: any) => state.stories);

  const { openConnectModal } = useConnectModal();
  const { switchChain } = useSwitchChain();
  const { isConnected, address, chainId } = useAccount();

  // Grab all recent badges and save on state
  const handleStoryBadges = async () => {
    const badgeIds = await getBadgeIds(SCORER_ID);
    const badges = badgeIds && (await Promise.all(badgeIds.map((id) => getBadge(id))));
    setActiveBadgeIds(badgeIds);
    setActiveBadges(badges);
  };

  const handleReviewButton = () => {
    if (!isConnected && openConnectModal) {
      openConnectModal();
    } else {
      if (chainId != arbitrum.id) {
        switchChain({ chainId: arbitrum.id });
        toast.error("Must connect to Arbitrum to review");
      } else {
        setIsOpenReview(ReviewMode.WRITE);
        handleStoryBadges();
      }
    }
  };

  return (
    <div className="flex flex-col w-full gap-5">
      <div className="flex w-full justify-between items-center">
        <div className="flex gap-2">
          <DynamicStarsReview
            totalStars={1}
            rating={0}
            setRating={() => {}}
            mode={ReviewMode.READ}
          />
          <h2 className="text-base font-semibold font-['Open Sans'] leading-normal">
            Reviews Summary
          </h2>
        </div>
        {isConnected &&
        project?.recipient &&
        address &&
        !isAddressEqual(project.recipient, address) ? ( // Check if the address is equal to the grant recipient address
          <Button
            disabled={false}
            onClick={handleReviewButton}
            className="bg-[#0E104D] gap-2 px-3 items-center"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            Add Review
          </Button>
        ) : (
          !isConnected && (
            <Button
              disabled={false}
              onClick={openConnectModal}
              className="bg-[#0E104D] gap-2 px-3 items-center"
            >
              Connect Wallet
            </Button>
          )
        )}
      </div>
      <div className="flex gap-8 border border-[#26252A] rounded-lg p-6 justify-between">
        <div className="flex flex-col gap-3 h-full">
          <div className="flex">
            <h1 className="text-[#959FA8] text-xs leading-4 font-bold font-['Open Sans']">
              Total Review
            </h1>
          </div>
          <div className="flex flex-col gap-2">
            {stories && (
              <h2 className="font-medium text-[56px] leading-[56px] font-['Open Sans']">
                {stories.length}
              </h2>
            )}
            <p className="text-[#959fa8] text-sm font-normal font-['Open Sans'] leading-tight">
              Typically reviewed 5 times per day
            </p>
          </div>
        </div>
        <div className="w-6 h-[124px] justify-center items-center gap-2.5 inline-flex relative">
          <div className="border border-[#26252A] h-full" />
          <div className="w-[3px] h-8 bg-[#1832ed] rounded-[100px] absolute"></div>
        </div>
        <div className="flex flex-col gap-3 h-full">
          <div className="flex">
            <h1 className="text-[#959FA8] text-xs leading-4 font-bold font-['Open-Sans']">
              Average Review
            </h1>
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="font-medium text-[56px] leading-[56px] font-['Open Sans']">4.0</h2>
            <DynamicStarsReview
              totalStars={5}
              rating={4}
              setRating={() => {}}
              mode={ReviewMode.READ}
            />
          </div>
        </div>
        <div className="w-6 h-[124px] justify-center items-center gap-2.5 inline-flex relative">
          <div className="border border-[#26252A] h-full" />
          <div className="w-[3px] h-8 bg-[#1832ed] rounded-[100px] absolute"></div>
        </div>
        <div className="flex flex-col gap-1.5 items-center justify-center">
          <div className="flex gap-2 items-center">
            <p className="text-white text-sm font-bold font-['Open Sans'] leading-tight">5</p>
            <ProgressBar currentStep={10} numberOfItems={100} />
            <p className="text-[#959fa8] text-sm font-normal font-['Open Sans'] leading-tight">
              10%
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <p className="text-white text-sm font-bold font-['Open Sans'] leading-tight">4</p>
            <ProgressBar currentStep={30} numberOfItems={100} />
            <p className="text-[#959fa8] text-sm font-normal font-['Open Sans'] leading-tight">
              30%
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <p className="text-white text-sm font-bold font-['Open Sans'] leading-tight">3</p>
            <ProgressBar currentStep={45} numberOfItems={100} />
            <p className="text-[#959fa8] text-sm font-normal font-['Open Sans'] leading-tight">
              45%
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <p className="text-white text-sm font-bold font-['Open Sans'] leading-tight">2</p>
            <ProgressBar currentStep={69} numberOfItems={100} />
            <p className="text-[#959fa8] text-sm font-normal font-['Open Sans'] leading-tight">
              69%
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <p className="text-white text-sm font-bold font-['Open Sans'] leading-tight">1</p>
            <ProgressBar currentStep={2} numberOfItems={100} />
            <p className="text-[#959fa8] text-sm font-normal font-['Open Sans'] leading-tight">
              2%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
