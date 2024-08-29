import { GitcoinAirdropsManager } from "@/components/Pages/Project/AirdropGitcoinSupporters";
import { Suspense } from "react";
import { Spinner } from "@/components/Utilities/Spinner";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: `Karma GAP - Gitcoin Supporter Airdrop`,
    description: `Airdrop NFTs for your project's supporters`,
};

const GrantProgramRegistry = () => {
    return (
        <Suspense
            fallback={
                <div className="flex h-screen w-full items-center justify-center">
                    <Spinner />
                </div>
            }
        >
            <GitcoinAirdropsManager />
        </Suspense>
    );
};

export default GrantProgramRegistry;
