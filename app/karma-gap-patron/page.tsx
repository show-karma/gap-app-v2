import { GitcoinAirdropsManager } from "@/components/Pages/Project/AirdropGitcoinSupporters";
import { Suspense } from "react";
import { Spinner } from "@/components/Utilities/Spinner";
import { Metadata } from "next";
import { ExternalLink } from "@/components/Utilities/ExternalLink";

export const metadata: Metadata = {
  title: `Karma GAP - Gitcoin Supporter Airdrop`,
  description: `Airdrop NFTs for your project's supporters`,
};

const rounds: {
  title: string;
  url: string;
}[] = [
  {
    title: "Thriving Arbitrum Summer Round",
    url: "https://explorer.gitcoin.co/#/round/42161/389",
  },
  {
    title: "Real World Builders on Celo Round",
    url: "https://explorer.gitcoin.co/#/round/42220/11",
  },
  {
    title: "Regen Coordi-Nation Round (ReFi DAO)",
    url: "https://explorer.gitcoin.co/#/round/42220/14",
  },
  {
    title: "Web3 Grants Ecosystem Advancement Round",
    url: "https://explorer.gitcoin.co/#/round/42161/385",
  },
  {
    title: "Decentralized Science and Art in Psychedelics Round",
    url: "https://explorer.gitcoin.co/#/round/42161/383",
  },
  {
    title: "Token Engineering The Superchain Round",
    url: "https://explorer.gitcoin.co/#/round/10/57",
  },
  {
    title: "CollaborationTech Round",
    url: "https://explorer.gitcoin.co/#/round/42161/384",
  },
  {
    title: "DeSci Round GG21",
    url: "https://explorer.gitcoin.co/#/round/42161/387",
  },
  {
    title: "OpenCivics Collaborative Research Round",
    url: "https://explorer.gitcoin.co/#/round/42161/386",
  },
  {
    title: "Climate Solutions Round",
    url: "https://explorer.gitcoin.co/#/round/42161/388",
  },
  {
    title: "Asia Round",
    url: "https://explorer.gitcoin.co/#/round/10/44",
  },
];

const GrantProgramRegistry = () => {
  return (
    <div className="flex flex-row gap-4 w-full py-8 mt-3 px-5">
      <Suspense
        fallback={
          <div className="flex h-screen w-full items-center justify-center">
            <Spinner />
          </div>
        }
      >
        <GitcoinAirdropsManager />
      </Suspense>
      <div className="flex flex-col gap-4 bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md max-h-max h-full max-lg:hidden">
        <h3 className="text-xl font-bold">Recent Gitcoin Rounds</h3>
        <div className="flex flex-col gap-2">
          {rounds.map((round) => (
            <ExternalLink
              className="max-w-max text-zinc-800 border-b border-zinc-300 hover:text-blue-700 hover:border-blue-700 dark:text-zinc-200 dark:border-zinc-700 dark:hover:text-blue-400 dark:hover:border-blue-400"
              key={round.url}
              href={round.url}
            >
              {round.title}
            </ExternalLink>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GrantProgramRegistry;
