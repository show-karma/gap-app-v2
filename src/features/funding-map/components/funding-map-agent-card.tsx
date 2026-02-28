"use client";

import { Bot, CircleUser, Copy } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { cn } from "@/utilities/tailwind";

const SKILLS_URL = "https://github.com/show-karma/skills";

const AGENT_PROMPT = `Read ${SKILLS_URL} and follow the instructions to find funding opportunities`;

const pillTriggerClass = cn(
  "rounded-full px-3 py-1.5 text-sm font-medium transition-all",
  "data-[state=inactive]:bg-transparent data-[state=inactive]:text-muted-foreground data-[state=inactive]:shadow-none",
  "data-[state=active]:bg-brand-500 data-[state=active]:text-brand-950 data-[state=active]:shadow-sm"
);

const stepNumberClass = cn(
  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
  "bg-brand-500/15 text-[11px] font-semibold text-brand-500"
);

export function FundingMapAgentCard() {
  const [, copyToClipboard] = useCopyToClipboard();

  const codeBlock = (
    <div className="flex items-start justify-between gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5">
      <code className="break-words font-mono text-sm leading-relaxed text-emerald-400">
        Read{" "}
        <a
          href={SKILLS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-emerald-400/50 hover:decoration-emerald-400"
        >
          {SKILLS_URL}
        </a>{" "}
        and follow the instructions to find funding opportunities
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
  );

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

        <TabsContent value="human" className="mt-4">
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-foreground">Send Your AI Agent to Karma</h3>
            {codeBlock}
            <ol className="flex flex-col gap-2.5">
              <li className="flex items-start gap-2.5">
                <span className={stepNumberClass}>1</span>
                <span className="text-sm leading-snug text-muted-foreground">
                  Send this to your agent
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className={stepNumberClass}>2</span>
                <span className="text-sm leading-snug text-muted-foreground">
                  They run the skill &amp; find programs for you
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className={stepNumberClass}>3</span>
                <span className="text-sm leading-snug text-muted-foreground">
                  Get structured results with URLs, deadlines, and budgets
                </span>
              </li>
            </ol>
          </div>
        </TabsContent>

        <TabsContent value="agent" className="mt-4">
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-foreground">Find Funding with Karma</h3>
            {codeBlock}
            <ol className="flex flex-col gap-2.5">
              <li className="flex items-start gap-2.5">
                <span className={stepNumberClass}>1</span>
                <span className="text-sm leading-snug text-muted-foreground">
                  Execute instruction above to get started
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className={stepNumberClass}>2</span>
                <span className="text-sm leading-snug text-muted-foreground">
                  Get structured results with URLs, deadlines, and budgets
                </span>
              </li>
            </ol>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
