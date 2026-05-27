"use client";

import { ArrowLeft, ArrowRight, Check, Copy } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { NON_PROFITS_PAGES } from "@/utilities/pages";

const MCP_URL = "https://gapapi.karmahq.xyz/mcp";

export type Provider = "claude" | "chatgpt";

function sharedFaqs(productName: "Claude" | "ChatGPT"): FaqItem[] {
  return [
    {
      q: "Is it free?",
      a: "Yes. Connecting and asking questions is free. We may add a paid tier later for high-volume usage, but the core prospecting agent stays free for nonprofits.",
    },
    {
      q: "What data does it have access to?",
      a: "IRS 990 and 990-PF filings for every U.S. private foundation and public charity that files annually. Over 2 million filings going back several years. Every answer cites the filing it came from.",
    },
    {
      q: `Does Karma see my ${productName} chats?`,
      a: `Only the queries that flow through this connector, never the rest of your ${productName} conversations. We log queries to improve the agent; you can turn that off in your Karma account settings.`,
    },
  ];
}

interface Step {
  title: string;
  body: ReactNode;
  code?: string;
}

interface FaqItem {
  q: string;
  a: ReactNode;
}

interface GuideContent {
  eyebrow: string;
  title: string;
  intro: string;
  prereq: ReactNode;
  steps: Step[];
  foot: string;
  troubleshoot: FaqItem[];
  faqs: FaqItem[];
  otherLink: { label: string; href: string };
}

const CLAUDE_GUIDE: GuideContent = {
  eyebrow: "Setup guide",
  title: "Add Karma Find Funders to Claude",
  intro:
    "Once connected, every Claude chat can search foundations, pull 990 filings, and brief you on funders. No extra tools to open.",
  prereq: (
    <>
      Custom connectors via remote MCP are available on Free, Pro, Max, Team, and Enterprise plans
      (currently in beta, Free plans are capped at one connector). On Team and Enterprise, an owner
      needs to add the connector at the org level first, then members connect individually.
    </>
  ),
  steps: [
    {
      title: "Open Claude settings (Pro and Max)",
      body: (
        <>
          In Claude, click your profile in the bottom-left and choose <Kbd>Settings</Kbd>. Open{" "}
          <Kbd>Customize</Kbd> → <Kbd>Connectors</Kbd>. On Team or Enterprise, an owner first adds
          the connector under <Kbd>Organization settings</Kbd> → <Kbd>Connectors</Kbd> →{" "}
          <Kbd>Add</Kbd> → <Kbd>Custom</Kbd> → <Kbd>Web</Kbd>.
        </>
      ),
    },
    {
      title: "Add a custom connector",
      body: (
        <>
          On the Connectors page, click <Kbd>+</Kbd> and choose <Kbd>Add custom connector</Kbd>. A
          dialog opens asking for a name and the remote MCP server URL.
        </>
      ),
    },
    {
      title: "Paste the MCP server URL",
      body: (
        <>
          Name it <Kbd>Karma Find Funders</Kbd>. Paste the URL below into the{" "}
          <Kbd>Remote MCP server URL</Kbd> field. You can leave <Kbd>Advanced settings</Kbd> (OAuth
          Client ID/Secret) blank. Click <Kbd>Add</Kbd>.
        </>
      ),
      code: MCP_URL,
    },
    {
      title: "Sign in and authorize",
      body: (
        <>
          Claude opens a sign-in window. Sign in (or create a Karma account) and authorize the
          connector. You&apos;ll land back in Claude when it&apos;s done.
        </>
      ),
    },
    {
      title: "Turn it on inside a chat",
      body: (
        <>
          Open a new chat. Click the <Kbd>+</Kbd> button in the composer, choose{" "}
          <Kbd>Connectors</Kbd>, and toggle <Kbd>Karma Find Funders</Kbd> on for this conversation.
          Try, &ldquo;Find family foundations funding youth literacy in Ohio under $10M.&rdquo;
          Claude will call the agent and return a cited list.
        </>
      ),
    },
  ],
  foot: "Works in claude.ai and the Claude desktop app. Streamable HTTP transport. OAuth 2.1. Beta as of May 2026.",
  troubleshoot: [
    {
      q: 'Claude says "Failed to connect" or the connector is greyed out.',
      a: (
        <>
          Double-check the URL is exactly <Kbd>{MCP_URL}</Kbd> with no trailing slash. Claude calls
          the MCP server from Anthropic&apos;s cloud, not your browser, so the server has to be
          reachable on the public internet. If you&apos;re on a corporate network, an outbound
          firewall on the Karma side is not the issue but your Anthropic plan may need to allow
          custom connectors.
        </>
      ),
    },
    {
      q: 'I don\'t see "Add custom connector" or the option is missing.',
      a: (
        <>
          On Team and Enterprise, the connector has to be added by an owner under{" "}
          <Kbd>Organization settings</Kbd> → <Kbd>Connectors</Kbd> first. Once added, members will
          see it under <Kbd>Customize</Kbd> → <Kbd>Connectors</Kbd> labeled <Kbd>Custom</Kbd> and
          can click <Kbd>Connect</Kbd> to authenticate.
        </>
      ),
    },
    {
      q: "I added it but Claude doesn't seem to use it.",
      a: (
        <>
          Connectors are off by default in new chats. Click <Kbd>+</Kbd> in the composer, open{" "}
          <Kbd>Connectors</Kbd>, and confirm <Kbd>Karma Find Funders</Kbd> is toggled on for the
          conversation you&apos;re in.
        </>
      ),
    },
  ],
  faqs: sharedFaqs("Claude"),
  otherLink: { label: "Using ChatGPT instead?", href: NON_PROFITS_PAGES.CONNECT_CHATGPT },
};

const CHATGPT_GUIDE: GuideContent = {
  eyebrow: "Setup guide",
  title: "Add Karma Find Funders to ChatGPT",
  intro:
    "Once connected, every ChatGPT chat can search foundations, surface 990 filings, and brief you on funders alongside the rest of your workflow.",
  prereq: (
    <>
      Custom MCP connectors live behind Developer Mode in <Kbd>Settings</Kbd> →{" "}
      <Kbd>Apps &amp; Connectors</Kbd>. Plus, Pro, Business, Enterprise, and Education plans can
      enable Developer Mode. On Plus and Pro, custom connectors are read-only (search and fetch);
      full read/write connectors require Business, Enterprise, or Edu. Workspace admins on
      Business/Enterprise may need to turn Developer Mode on under <Kbd>Workspace settings</Kbd> →{" "}
      <Kbd>Permissions &amp; Roles</Kbd> first.
    </>
  ),
  steps: [
    {
      title: "Open Apps & Connectors",
      body: (
        <>
          In ChatGPT, click your profile in the bottom-left and choose <Kbd>Settings</Kbd>. In the
          left sidebar, open <Kbd>Apps &amp; Connectors</Kbd>.
        </>
      ),
    },
    {
      title: "Enable Developer mode",
      body: (
        <>
          Scroll to the bottom of <Kbd>Apps &amp; Connectors</Kbd>, open{" "}
          <Kbd>Advanced settings</Kbd>, and turn on <Kbd>Developer mode</Kbd>. A <Kbd>Create</Kbd>{" "}
          button now appears on the Apps &amp; Connectors page.
        </>
      ),
    },
    {
      title: "Create the connector",
      body: (
        <>
          Back on <Kbd>Apps &amp; Connectors</Kbd>, click <Kbd>Create</Kbd>. Fill in:
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>
              <Kbd>Name</Kbd>: <Kbd>Karma Find Funders</Kbd>
            </li>
            <li>
              <Kbd>Description</Kbd>: &ldquo;Search foundations and grantmaking nonprofits from IRS
              990 filings.&rdquo;
            </li>
            <li>
              <Kbd>MCP server URL</Kbd>: paste the URL below.
            </li>
          </ul>
        </>
      ),
      code: MCP_URL,
    },
    {
      title: "Authorize with OAuth",
      body: (
        <>
          Leave authentication on <Kbd>OAuth</Kbd> and click <Kbd>Create</Kbd>. ChatGPT opens a
          sign-in window. Authorize Karma and you&apos;ll land back on the Apps &amp; Connectors
          page. On success, ChatGPT shows the tools the server advertises.
        </>
      ),
    },
    {
      title: "Use it in a chat",
      body: (
        <>
          Open a new chat. Click <Kbd>+</Kbd> in the composer, then <Kbd>More</Kbd>, and select{" "}
          <Kbd>Karma Find Funders</Kbd>. Try, &ldquo;Who funded climate justice in the Bay Area last
          year?&rdquo; ChatGPT will call the agent and ask you to approve each tool call until you
          save approvals for the conversation.
        </>
      ),
    },
  ],
  foot: "Available on ChatGPT Plus, Pro, Business, Enterprise, and Edu. Streamable HTTP transport over HTTPS. OAuth 2.1. Beta as of May 2026.",
  troubleshoot: [
    {
      q: "I don't see Developer mode in Apps & Connectors → Advanced settings.",
      a: (
        <>
          On Business and Enterprise, a workspace admin has to enable it first under{" "}
          <Kbd>Workspace settings</Kbd> → <Kbd>Permissions &amp; Roles</Kbd> →{" "}
          <Kbd>Connected Data</Kbd>. On Plus and Pro the toggle is on your account directly; if
          it&apos;s missing entirely, the feature may still be rolling out to your account.
        </>
      ),
    },
    {
      q: 'ChatGPT says "This connector requires authentication."',
      a: "That message means the OAuth handshake didn't finish. Remove the connector and add it again. Make sure to allow the sign-in pop-up window when prompted.",
    },
    {
      q: "ChatGPT added it but never calls the tool.",
      a: (
        <>
          ChatGPT scopes connectors per-conversation. Click <Kbd>+</Kbd> in the composer,{" "}
          <Kbd>More</Kbd>, and pick <Kbd>Karma Find Funders</Kbd>. If you&apos;re on Plus or Pro,
          remember the connector is read-only, so prompts that imply writing or modifying data will
          be refused.
        </>
      ),
    },
  ],
  faqs: sharedFaqs("ChatGPT"),
  otherLink: { label: "Using Claude instead?", href: NON_PROFITS_PAGES.CONNECT_CLAUDE },
};

const GUIDES: Record<Provider, GuideContent> = {
  claude: CLAUDE_GUIDE,
  chatgpt: CHATGPT_GUIDE,
};

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex items-center rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 font-mono text-[0.85em] text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
      {children}
    </kbd>
  );
}

function CodeBlock({ text }: { text: string }) {
  const [copiedText, copy] = useCopyToClipboard();
  const copied = copiedText === text;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
      <code className="break-all font-mono text-sm text-gray-900 dark:text-gray-100">{text}</code>
      <button
        type="button"
        onClick={() => copy(text, "Copied")}
        className="flex shrink-0 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        aria-label={copied ? "Copied" : "Copy MCP URL"}
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5" /> Copied
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" /> Copy
          </>
        )}
      </button>
    </div>
  );
}

function StepCard({ index, step }: { index: number; step: Step }) {
  return (
    <li className="flex gap-4">
      <div
        aria-hidden
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-xs font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
      >
        {index}
      </div>
      <div className="flex-1 space-y-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">{step.title}</h3>
        <p className="text-gray-700 dark:text-gray-300">{step.body}</p>
        {step.code && <CodeBlock text={step.code} />}
      </div>
    </li>
  );
}

function QaCard({ item }: { item: FaqItem }) {
  return (
    <div className="space-y-2 rounded-lg border border-gray-200 p-5 dark:border-gray-700">
      <h3 className="font-semibold text-gray-900 dark:text-gray-50">{item.q}</h3>
      <div className="text-sm text-gray-700 dark:text-gray-300">{item.a}</div>
    </div>
  );
}

export function ConnectGuide({ provider }: { provider: Provider }) {
  const g = GUIDES[provider];

  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <Link
        href={NON_PROFITS_PAGES.HOME}
        className="inline-flex items-center gap-1.5 text-sm text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Find Funders
      </Link>

      <article className="mt-6 space-y-10">
        <header className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            {g.eyebrow}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">{g.title}</h1>
          <p className="text-lg text-gray-700 dark:text-gray-300">{g.intro}</p>
        </header>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-900/40">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Before you start
          </h2>
          <p className="mt-2 text-gray-700 dark:text-gray-300">{g.prereq}</p>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
            Step-by-step setup
          </h2>
          <ol className="space-y-6">
            {g.steps.map((step, i) => (
              <StepCard key={step.title} index={i + 1} step={step} />
            ))}
          </ol>
          <p className="text-sm text-gray-500 dark:text-gray-400">{g.foot}</p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">Troubleshooting</h2>
          <div className="space-y-3">
            {g.troubleshoot.map((item) => (
              <QaCard key={item.q} item={item} />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">FAQ</h2>
          <div className="space-y-3">
            {g.faqs.map((item) => (
              <QaCard key={item.q} item={item} />
            ))}
          </div>
        </div>

        <div className="border-t border-gray-200 pt-8 dark:border-gray-700">
          <Link
            href={g.otherLink.href}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            {g.otherLink.label}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </article>
    </main>
  );
}
