import Link from "next/link";
import { envVars } from "@/utilities/enviromentVars";
import { NON_PROFITS_PAGES, PAGES } from "@/utilities/pages";

/**
 * Answer-first section for /for-agents. Server-rendered on purpose: this
 * is the copy answer engines and crawlers read, so it must be present in
 * the initial HTML, state facts directly, and never depend on client
 * JavaScript. Every claim here traces to the MCP endpoint implementation
 * in gap-indexer (mcp.routes.ts, tool-discovery.ts) or to the shipped
 * connect guides — do not add capabilities that are not verifiable there.
 */

const MCP_SERVER_URL = `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}/mcp`;

export function AnswerSection() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12">
      <div className="flex flex-col gap-3">
        <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
          What Karma&apos;s MCP server is
        </h2>
        <p className="text-base text-muted-foreground">
          Karma provides a public MCP (Model Context Protocol) server at{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground">
            {MCP_SERVER_URL}
          </code>{" "}
          over Streamable HTTP. It works with Claude, ChatGPT, Cursor, Codex, and any MCP client
          that supports protocol version 2025-11-25 or later. A connected agent can search
          Karma&apos;s funding-program registry, run natural-language research across nonprofits,
          foundations, funders, and IRS 990 data, read program financials, and call Karma&apos;s
          documented read APIs — the same data that powers the Karma dashboard.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-xl font-semibold text-foreground">
          Which operations need authentication
        </h3>
        <p className="text-base text-muted-foreground">
          Tool discovery is open: the server describes itself and its tool catalog without
          credentials at <code className="font-mono text-sm">/mcp</code>,{" "}
          <code className="font-mono text-sm">/mcp/info</code>,{" "}
          <code className="font-mono text-sm">/mcp/tools</code>, and{" "}
          <code className="font-mono text-sm">/.well-known/mcp-tools.json</code>. Every tool call
          requires a signed-in session: OAuth 2.1 (your AI app opens Karma sign-in in the browser
          the first time you connect) or a Karma API key sent as the{" "}
          <code className="font-mono text-sm">x-api-key</code> header for headless agents. A
          connected agent inherits exactly the permissions of your Karma account — public project,
          program, and 990 data for any account, plus the projects you own, programs you administer,
          and applications you review when your account has those roles.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-xl font-semibold text-foreground">
          How to connect from Claude or ChatGPT
        </h3>
        <p className="text-base text-muted-foreground">
          In Claude (claude.ai or the desktop app): open Settings, choose Connectors, click Add
          custom connector, paste the server URL above, and sign in to Karma when prompted. In
          ChatGPT (Plus, Pro, Business, Enterprise, or Edu): enable Developer mode under Settings →
          Apps &amp; Connectors, create a connector with the same URL, and authorize with OAuth.
          Step-by-step instructions with screenshots and troubleshooting:{" "}
          <Link
            href={PAGES.MCP_CONNECT}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            general setup guide
          </Link>
          ,{" "}
          <Link
            href={NON_PROFITS_PAGES.CONNECT_CLAUDE}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Claude guide
          </Link>
          ,{" "}
          <Link
            href={NON_PROFITS_PAGES.CONNECT_CHATGPT}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            ChatGPT guide
          </Link>
          .
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-xl font-semibold text-foreground">
          Running a grant program from ChatGPT or Claude
        </h3>
        <p className="text-base text-muted-foreground">
          A foundation or grants team can do day-to-day program work from a chat instead of a
          dashboard: list the applications submitted to a program, pull program financials,
          summarize a project&apos;s grant and milestone history, and research prospective grantees
          across IRS 990 filings — all through the same read APIs the Karma dashboard uses, bounded
          by the signed-in account&apos;s permissions.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-xl font-semibold text-foreground">
          Can an AI agent draft and submit a grant application?
        </h3>
        <p className="text-base text-muted-foreground">
          Yes, with your permission. An agent can read a funding program&apos;s details and draft
          application copy against them, and with OAuth authorization it can submit applications,
          draft updates, comment on reviews, and propose milestone evidence on your behalf. You
          approve which capabilities the agent gets when you connect, every action is logged against
          your account, and you can revoke access at any time from your Karma settings.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-xl font-semibold text-foreground">
          How this compares to conventional grant platforms
        </h3>
        <p className="text-base text-muted-foreground">
          Conventional grants-management platforms are typically operated through their own web
          dashboards. Karma additionally exposes its funding-program registry, project and grant
          data, and nonprofit research through a documented, publicly discoverable MCP server, so
          foundations and nonprofits can work with the same data directly from Claude, ChatGPT, or
          any other MCP-compatible AI app.
        </p>
      </div>
    </section>
  );
}
