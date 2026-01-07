import type { Metadata } from "next";
import { Suspense } from "react";
import { PROJECT_NAME } from "@/constants/brand";
import { FundingMapList } from "@/src/features/funding-map/components/funding-map-list";
import { FundingMapLoading } from "@/src/features/funding-map/components/funding-map-loading";
import { FundingMapSearch } from "@/src/features/funding-map/components/funding-map-search";
import { FundingMapSidebar } from "@/src/features/funding-map/components/funding-map-sidebar";
import { customMetadata } from "@/utilities/meta";

export const metadata: Metadata = customMetadata({
  title: `${PROJECT_NAME} - Directory of web3 funding programs`,
  description: `Find all the funding opportunities across web3 ecosystem.`,
});

const FundingMapPage = () => {
  return (
    <main className="flex w-full flex-col">
      <Suspense fallback={null}>
        <FundingMapSearch />
      </Suspense>
      <div className="flex w-full flex-col gap-6 px-6 py-16 lg:flex-row lg:px-8">
        <Suspense fallback={<FundingMapLoading />}>
          <FundingMapList />
        </Suspense>
        <FundingMapSidebar />
      </div>
    </main>
  );
};

export default FundingMapPage;
