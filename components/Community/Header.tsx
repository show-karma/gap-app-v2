"use client";
import { CommunityPageNavigator } from "@/components/Pages/Communities/CommunityPageNavigator";
import { communityColors } from "@/utilities/communityColors";
import { CommunityImpactStatCards } from "@/components/Pages/Communities/Impact/StatCards";
import { usePathname, useParams } from "next/navigation";
import { CommunityDetailsV2 } from "@/types/community";
import Link from "next/link";
import { cn } from "@/utilities/tailwind";
import { layoutTheme } from "@/src/helper/theme";

const AdminCommunityHeader = ({
  community,
}: {
  community: CommunityDetailsV2;
}) => {
  return (
    <div className={cn(layoutTheme.padding, "flex flex-col gap-4 justify-between items-start sm:px-3 md:px-4 px-6 py-2 border-b border-gray-200 dark:border-gray-800")}>
      <div className="flex flex-row gap-4 flex-wrap max-lg:flex-col justify-between items-center w-full">
        <div className="flex h-max flex-1 flex-row items-center justify-start gap-3 ">
          <div className="flex justify-center bg-black rounded-full p-2">
            <img
              alt={(community as CommunityDetailsV2)?.details?.name}
              src={
                (community as CommunityDetailsV2)?.details?.logoUrl || ""
              }
              className={"h-6 w-6 min-w-6 min-h-6 rounded-full"}
            />
          </div>
          <div className="flex flex-col gap-0">
            <p className="text-3xl font-body font-semibold text-black dark:text-white max-2xl:text-2xl max-lg:text-xl">
              {community
                ? (community as CommunityDetailsV2)?.details?.name
                : ""}
            </p>
          </div>
        </div>
      </div>
      <CommunityPageNavigator />
    </div>
  );
};

const NormalCommunityHeader = ({
  community,
}: {
  community: CommunityDetailsV2;
}) => {
  const pathname = usePathname();
  const params = useParams();

  return (
    <div className={cn(layoutTheme.padding, "py-0 flex flex-col gap-4 justify-between items-start mt-4 sm:px-3 md:px-4 px-6 border-b border-gray-200 dark:border-gray-800")}>
      <div className="flex flex-row gap-4 flex-wrap max-lg:flex-col justify-between items-center w-full">
        <div className="flex h-max flex-1 flex-row items-center justify-start gap-3 ">
          <div
            className="p-3 rounded-xl"
            style={{
              backgroundColor:
                communityColors[
                (community as CommunityDetailsV2)?.uid?.toLowerCase() ||
                "black"
                ] || "#000000",
            }}
          >
            <div className="flex justify-center border border-white rounded-full p-2">
              <img
                alt={(community as CommunityDetailsV2)?.details?.name}
                src={
                  (community as CommunityDetailsV2)?.details?.logoUrl ||
                  ""
                }
                className={
                  "h-14 w-14 min-w-14 min-h-14 rounded-full max-lg:h-8 max-lg:w-8 max-lg:min-h-8 max-lg:min-w-8"
                }
              />
            </div>
          </div>
          <div className="flex flex-col gap-0">
            <p className="text-3xl font-body font-semibold text-black dark:text-white max-2xl:text-2xl max-lg:text-xl">
              {community
                ? (community as CommunityDetailsV2)?.details?.name
                : ""}
            </p>
          </div>
        </div>
        <CommunityImpactStatCards />
      </div>
      <CommunityPageNavigator />
    </div>
  );
};
export default function CommunityHeader({
  community,
}: {
  community: CommunityDetailsV2;
}) {
  const pathname = usePathname();
  const isAdminPage = pathname.includes("/admin");
  const isReviewerPage = pathname.includes("/reviewer");
  const isDonatePage = pathname.includes("/donate");
  if (isAdminPage) {
    return <AdminCommunityHeader community={community} />;
  }
  if (isReviewerPage) {
    return null;
  }
  if (isDonatePage) {
    return null;
  }
  return <NormalCommunityHeader community={community} />;
}
