import type { Metadata } from "next";
import { Suspense } from "react";
import { CollectionPageJsonLd } from "@/components/Seo/CollectionPageJsonLd";
import {
  FundingMapFeaturedLinksSection,
  FundingMapIntroFallback,
  FundingMapIntroSection,
} from "@/src/features/funding-map/components/funding-map-intro";
import { FundingMapList } from "@/src/features/funding-map/components/funding-map-list";
import { FundingMapLoading } from "@/src/features/funding-map/components/funding-map-loading";
import { FundingMapSearch } from "@/src/features/funding-map/components/funding-map-search";
import { FundingMapSidebar } from "@/src/features/funding-map/components/funding-map-sidebar";
import { customMetadata } from "@/utilities/meta";

const PAGE_DESCRIPTION =
  "Live directory of web3 and open-source funding: grants, retroactive funding, hackathons, bounties, and accelerator programs from ecosystems like Optimism, Celo, Filecoin, and the Ethereum Foundation. See what each program funds, filter by status and ecosystem, and apply.";

export const metadata: Metadata = customMetadata({
  title: "Funding Map — Web3 Grants, Hackathons & Ecosystem Funding Programs",
  description: PAGE_DESCRIPTION,
  path: "/funding-map",
});

const FundingMapPage = () => {
  return (
    <main className="flex w-full flex-col">
      <CollectionPageJsonLd
        name="Funding Map — Web3 Grants, Hackathons & Ecosystem Funding Programs"
        description={PAGE_DESCRIPTION}
        url="/funding-map"
      />
      <Suspense fallback={null}>
        <FundingMapSearch />
      </Suspense>
      {/* Server-rendered answer-first intro. Own Suspense boundary so the
          registry fetch never blocks the rest of the segment; the fallback
          carries the same copy without the fetched counts. */}
      <Suspense fallback={<FundingMapIntroFallback />}>
        <FundingMapIntroSection />
      </Suspense>
      <div className="flex w-full flex-col gap-6 px-6 py-8 lg:flex-row lg:px-8">
        <Suspense fallback={<FundingMapLoading />}>
          <FundingMapList />
        </Suspense>
        <FundingMapSidebar />
      </div>
      {/* Server-rendered crawlable links to open programs' detail pages —
          the interactive list above only exposes programs through a
          client-side dialog. Renders nothing when no open program has a
          linkable community page. */}
      <Suspense fallback={null}>
        <FundingMapFeaturedLinksSection />
      </Suspense>
    </main>
  );
};

export default FundingMapPage;
