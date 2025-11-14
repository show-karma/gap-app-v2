import { ChevronDownIcon } from "@heroicons/react/24/solid"
import * as Accordion from "@radix-ui/react-accordion"
import { ExternalLink } from "@/components/Utilities/ExternalLink"
import "./styles.css"

const rounds: {
  title: string
  url: string
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
  {
    title: "Sei Creator Fund: Round #2",
    url: "https://explorer.gitcoin.co/#/round/1329/9",
  },
]

export const RecentRounds = () => {
  return (
    <div className="flex flex-col gap-4 bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md max-h-max h-full max-lg:hidden">
      <h3 className="text-xl font-bold text-zinc-800 dark:text-zinc-200">Recent Gitcoin Rounds</h3>
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
  )
}

export const RecentRoundsMobile = () => {
  return (
    <Accordion.Root
      className="AccordionRoot lg:hidden "
      type="single"
      defaultValue="item-1"
      collapsible
    >
      <Accordion.Item className="AccordionItem" value="item-1">
        <Accordion.AccordionTrigger className="AccordionTrigger text-xl font-bold text-zinc-800 dark:text-zinc-200 bg-white dark:bg-slate-800 p-3 rounded-lg shadow-md w-full text-start justify-between items-center flex flex-row">
          Recent Gitcoin Rounds
          <ChevronDownIcon className="w-5 h-5 AccordionChevron" />
        </Accordion.AccordionTrigger>
        <Accordion.AccordionContent className="AccordionContent">
          <div className="flex flex-col gap-2 bg-white dark:bg-slate-800 p-3 rounded-lg shadow-md mt-1">
            {rounds.map((round) => (
              <ExternalLink
                className="max-w-max text-zinc-800 text-lg border-b border-zinc-300 hover:text-blue-700 hover:border-blue-700 dark:text-zinc-200 dark:border-zinc-700 dark:hover:text-blue-400 dark:hover:border-blue-400"
                key={round.url}
                href={round.url}
              >
                {round.title}
              </ExternalLink>
            ))}
          </div>
        </Accordion.AccordionContent>
      </Accordion.Item>
    </Accordion.Root>
  )
}
