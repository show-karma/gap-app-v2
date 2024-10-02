import { GitcoinAirdropsManager } from "@/components/Pages/Project/AirdropGitcoinSupporters";
import { Suspense } from "react";
import { Spinner } from "@/components/Utilities/Spinner";
import { Metadata } from "next";
import {
  RecentRounds,
  RecentRoundsMobile,
} from "@/components/Pages/Patron/RecentRounds";
import { customMetadata } from "@/utilities/meta";

export const metadata: Metadata = customMetadata({
  title: `Karma GAP - Gitcoin Supporter Airdrop`,
  description: `Airdrop NFTs for your project's supporters`,
});

const GrantProgramRegistry = () => {
  return (
    <div className="flex flex-row gap-8 w-full py-8 mt-3 px-5 max-lg:flex-col my-8 max-lg:gap-4">
      <Suspense>
        <RecentRoundsMobile />
      </Suspense>
      <Suspense
        fallback={
          <div className="flex h-screen w-full items-center justify-center">
            <Spinner />
          </div>
        }
      >
        <GitcoinAirdropsManager />
      </Suspense>
      <RecentRounds />
    </div>
  );
};

export default GrantProgramRegistry;
