"use client";

import { Bot, CircleUser, Copy } from "lucide-react";
import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { cn } from "@/utilities/tailwind";

const SKILLS_REPO_URL = "https://github.com/show-karma/skills";

const AGENT_PROMPT = `Read ${SKILLS_REPO_URL} and follow the instructions to install the skills. Then use the find-programs skill to find new funding opportunities.`;

const HUMAN_STEPS = [
  "Copy and send this prompt to your AI agent",
  "Your agent reads the instructions and installs the skills",
  "It uses find-programs to discover new funding opportunities",
] as const;

const AGENT_STEPS: readonly ReactNode[] = [
  <>
    Install the{" "}
    <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono text-foreground">
      find-programs
    </code>{" "}
    skill
  </>,
  "Ask your agent to search for funding programs",
  "Get structured results with URLs, deadlines, and budgets",
];

const pillTriggerClass = cn(
  "rounded-full px-3 py-1.5 text-sm font-medium transition-all",
  "data-[state=inactive]:bg-transparent data-[state=inactive]:text-muted-foreground data-[state=inactive]:shadow-none",
  "data-[state=active]:bg-brand-500 data-[state=active]:text-brand-950 data-[state=active]:shadow-sm"
);

function StepList({ steps }: { steps: readonly ReactNode[] }) {
  return (
    <ol className="flex flex-col gap-2.5">
      {steps.map((text, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static list
        <li key={i} className="flex items-start gap-2.5">
          <span
            className={cn(
              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
              "bg-brand-500/15 text-[11px] font-semibold text-brand-500"
            )}
          >
            {i + 1}
          </span>
          <span className="text-sm leading-snug text-muted-foreground">{text}</span>
        </li>
      ))}
    </ol>
  );
}

export function FundingMapAgentCard() {
  const [, copyToClipboard] = useCopyToClipboard();

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-background p-5">
      <Tabs defaultValue="human">
        <TabsList className="grid w-full grid-cols-2 gap-1 rounded-full bg-muted p-1">
          <TabsTrigger value="human" className={pillTriggerClass}>
            <CircleUser className="mr-1.5 h-3.5 w-3.5" />
            I&apos;m a Human
          </TabsTrigger>
          <TabsTrigger value="agent" className={pillTriggerClass}>
            <Bot className="mr-1.5 h-3.5 w-3.5" />
            I&apos;m an Agent
          </TabsTrigger>
        </TabsList>

        <div className="mt-4 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5">
            <code className="break-all font-mono text-sm leading-relaxed text-emerald-400">
              Read{" "}
              <a
                href={SKILLS_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-emerald-400/50 hover:decoration-emerald-400"
              >
                {SKILLS_REPO_URL}
              </a>{" "}
              and follow the instructions to install the skills. Then use the find-programs skill to
              find new funding opportunities.
            </code>
            <button
              type="button"
              onClick={() => copyToClipboard(AGENT_PROMPT)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
              aria-label="Copy to clipboard"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>

          <TabsContent value="human" className="mt-0">
            <StepList steps={HUMAN_STEPS} />
          </TabsContent>

          <TabsContent value="agent" className="mt-0">
            <StepList steps={AGENT_STEPS} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
