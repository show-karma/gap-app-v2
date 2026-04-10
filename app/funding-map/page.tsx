import type { Metadata } from "next";
import { Suspense } from "react";
import { CollectionPageJsonLd } from "@/components/Seo/CollectionPageJsonLd";
import { FundingMapList } from "@/src/features/funding-map/components/funding-map-list";
import { FundingMapLoading } from "@/src/features/funding-map/components/funding-map-loading";
import { FundingMapSearch } from "@/src/features/funding-map/components/funding-map-search";
import { FundingMapSidebar } from "@/src/features/funding-map/components/funding-map-sidebar";
import { customMetadata } from "@/utilities/meta";

export const metadata: Metadata = customMetadata({
  title: "Directory of Funding Programs",
  description:
    "Browse the complete directory of funding programs. Find grants, retroactive funding, and ecosystem support across Ethereum, Optimism, Arbitrum, and more.",
  path: "/funding-map",
});

const FundingMapPage = () => {
  return (
    <main className="flex w-full flex-col">
      <CollectionPageJsonLd
        name="Directory of Funding Programs"
        description="Browse the complete directory of funding programs. Find grants, retroactive funding, and ecosystem support across Ethereum, Optimism, Arbitrum, and more."
        url="/funding-map"
      />
      <Suspense fallback={null}>
        <FundingMapSearch />
      </Suspense>
      <div className="flex w-full flex-col gap-6 px-6 py-8 lg:flex-row lg:px-8">
        <Suspense fallback={<FundingMapLoading />}>
          <FundingMapList />
        </Suspense>
        <FundingMapSidebar />
      </div>
    </main>
  );
};

export default FundingMapPage;
