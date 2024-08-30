"use client";
import { useEffect } from "react";
import { useReviewStore } from "@/store/review";
import { useSearchParams } from "next/navigation";

import { GrantStory } from "@/types/review";

import { StarReviewIcon } from "@/components/Icons/StarReview";
import { CardReview } from "@/components/Pages/Project/Review/CardReview";
import { ChevronDown } from "@/components/Icons";

import { formatDate } from "@/utilities/formatDate";
import { getGrantStories } from "@/utilities/review/getGrantStories";
import { SCORER_DECIMALS } from "@/utilities/review/constants/constants";

export const NavbarReview = () => {
  const isStarSelected = useReviewStore((state: any) => state.isStarSelected);
  const stories = useReviewStore((state: any) => state.stories);
  const grantUID = useReviewStore((state: any) => state.grantUID);
  const setGrantUID = useReviewStore((state: any) => state.setGrantUID);
  const setBadges = useReviewStore((state: any) => state.setBadges);
  const setStories = useReviewStore((state: any) => state.setStories);
  const setIsStarSelected = useReviewStore((state: any) => state.setIsStarSelected);

  const searchParams = useSearchParams();

  useEffect(() => {
    const grantIdFromQueryParam = searchParams?.get("grantId");
    if (grantIdFromQueryParam && grantUID !== grantIdFromQueryParam) {
      setBadges(null);
      setStories(null);
      setIsStarSelected(0);
      setGrantUID(grantIdFromQueryParam);
    }

    if (grantUID && !stories) {
      fetchGrantStories();
    }
  }, [grantUID, stories]);

  const fetchGrantStories = async () => {
    const grantStories = await getGrantStories(grantUID);
    setStories(grantStories);
  };

  const handleToggleReviewSelected = (id: number) => {
    const currentSelection = useReviewStore.getState().isStarSelected;
    useReviewStore.setState({
      isStarSelected: currentSelection === id ? null : id,
    });
  };

  return (
    <div className="w-full flex flex-col">
      <div className="w-full flex px-2 gap-2 overflow-x-auto pb-4 relative scroller">
        {stories && stories.length > 0 ? (
          stories
            .sort((a: any, b: any) => Number(b.timestamp) - Number(a.timestamp))
            .map((storie: GrantStory, index: number) => (
              <div
                key={index}
                className="flex flex-col justify-center items-center text-center relative"
              >
                <p className="w-full">{formatDate(new Date(Number(storie.timestamp) * 1000))}</p>
                <div className="w-full flex flex-col items-center sm:px-14 px-4">
                  <StarReviewIcon
                    props={{
                      className: `w-20 h-20 ${isStarSelected === index && "text-[#004EEB]"}`,
                    }}
                    pathProps={{
                      className: "cursor-pointer",
                      fill: `${isStarSelected === index && "#004EEB"} `,
                      onClick: () => {
                        setBadges(null);
                        handleToggleReviewSelected(index);
                      },
                    }}
                  />
                  <p>{(Number(storie.averageScore) / 10 ** SCORER_DECIMALS).toFixed(1)}</p>
                  {isStarSelected === index && (
                    <div>
                      <ChevronDown className="text-[#004EEB]" />
                    </div>
                  )}
                  {index < stories.length - 1 && (
                    <div className="absolute right-0 top-1/2 h-3/4 w-[2px] bg-zinc-300 transform -translate-y-1/2"></div>
                  )}
                </div>
              </div>
            ))
        ) : (
          <div>
            <p>
              Be the first to share your thoughts! Reach out to the grantee and encourage them to
              leave a review.
            </p>
          </div>
        )}
      </div>
      <div className="w-full flex flex-col">
        {isStarSelected !== null && stories && <CardReview storie={stories[isStarSelected]} />}
      </div>
    </div>
  );
};
