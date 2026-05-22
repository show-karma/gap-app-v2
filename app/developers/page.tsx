import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { envVars } from "@/utilities/enviromentVars";
import { customMetadata } from "@/utilities/meta";
import { PAGES } from "@/utilities/pages";
import { getWhitelabelContext } from "@/utilities/whitelabel-server";

export const metadata: Metadata = customMetadata({
  title: "Developers Karma API, MCP, and SDK resources",
  description:
    "Karma (karmahq.xyz) developer reference: REST API, OpenAPI spec, MCP server, OAuth and API-key auth, code examples, and machine-readable discovery files.",
  path: "/developers",
});

const styles = {
  h1: "text-3xl font-bold text-black dark:text-white",
  h2: "text-xl font-bold text-black dark:text-white mt-8",
  h3: "text-base font-semibold text-black dark:text-white mt-5",
  p: "text-base text-black dark:text-white mt-4",
  ul: "list-disc list-inside mt-4 space-y-2",
  li: "text-base text-zinc-700 dark:text-zinc-300",
  a: "text-blue-500 underline",
  code: "block whitespace-pre-wrap rounded-md bg-zinc-100 dark:bg-zinc-900 p-3 mt-3 text-sm font-mono text-zinc-800 dark:text-zinc-200 overflow-x-auto",
  inlineCode:
    "rounded bg-zinc-100 dark:bg-zinc-900 px-1.5 py-0.5 font-mono text-sm text-zinc-800 dark:text-zinc-200",
};

export default async function DevelopersPage() {
  const { isWhitelabel } = await getWhitelabelContext();
  if (isWhitelabel) notFound();

  const apiUrl = envVars.NEXT_PUBLIC_GAP_INDEXER_URL;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className={styles.h1}>Karma developer resources</h1>

      <p className={styles.p}>
        Everything you need to integrate with Karma (karmahq.xyz) the funding-program platform for
        grants, hackathons, RFPs, and on-chain milestone tracking. Public reads work without auth;
        mutating operations use OAuth or an API key.
      </p>

      <h2 className={styles.h2}>REST API</h2>
      <p className={styles.p}>
        Karma exposes a public REST API for projects, communities, grants, applications, milestones,
        payouts, and impact indicators.
      </p>
      <ul className={styles.ul}>
        <li className={styles.li}>
          <strong>OpenAPI spec:</strong>{" "}
          <Link className={styles.a} href="/openapi.json">
            karmahq.xyz/openapi.json
          </Link>{" "}
          apex-served proxy of the indexer&apos;s spec, refreshed hourly
        </li>
        <li className={styles.li}>
          <strong>Swagger UI:</strong>{" "}
          <a
            className={styles.a}
            href={`${apiUrl}/v2/docs`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {apiUrl}/v2/docs
          </a>
        </li>
        <li className={styles.li}>
          <strong>Authentication:</strong> public reads need no auth; mutations require OAuth
          (interactive) or the <code className={styles.inlineCode}>x-api-key</code> header
          (headless). See the OAuth-protected-resource metadata below.
        </li>
      </ul>

      <h2 className={styles.h2}>MCP server</h2>
      <p className={styles.p}>
        Karma ships a Model Context Protocol (MCP) server so AI agents like Claude Desktop, Cursor,
        and Codex CLI can read funding data and act on your behalf natively. Streamable HTTP
        transport, OAuth-protected, ~35 public tools.
      </p>
      <ul className={styles.ul}>
        <li className={styles.li}>
          <strong>MCP endpoint:</strong> <code className={styles.inlineCode}>{apiUrl}/v2/mcp</code>{" "}
          (JSON-RPC)
        </li>
        <li className={styles.li}>
          <strong>Setup guide (human):</strong>{" "}
          <Link className={styles.a} href={PAGES.MCP_CONNECT}>
            karmahq.xyz/mcp/connect
          </Link>
        </li>
        <li className={styles.li}>
          <strong>Tool catalog (machine):</strong>{" "}
          <Link className={styles.a} href="/.well-known/mcp-tools.json">
            karmahq.xyz/.well-known/mcp-tools.json
          </Link>
        </li>
        <li className={styles.li}>
          <strong>Server card:</strong>{" "}
          <Link className={styles.a} href="/.well-known/mcp/server-card.json">
            karmahq.xyz/.well-known/mcp/server-card.json
          </Link>
        </li>
        <li className={styles.li}>
          <strong>Server info (live):</strong>{" "}
          <a
            className={styles.a}
            href={`${apiUrl}/v2/mcp/info`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {apiUrl}/v2/mcp/info
          </a>
        </li>
      </ul>

      <h2 className={styles.h2}>Authentication</h2>
      <h3 className={styles.h3}>OAuth 2.0 (interactive)</h3>
      <p className={styles.p}>
        Authorization-server metadata is published per RFC 9728 at the apex:{" "}
        <Link className={styles.a} href="/.well-known/oauth-protected-resource">
          karmahq.xyz/.well-known/oauth-protected-resource
        </Link>
        . AI clients walk the OAuth flow automatically on first connect.
      </p>
      <h3 className={styles.h3}>API key (headless)</h3>
      <p className={styles.p}>
        Generate an API key in your Karma settings. Pass it as{" "}
        <code className={styles.inlineCode}>x-api-key: &lt;your-key&gt;</code> on every request.
        Useful for scripts, CI jobs, and headless agents.
      </p>

      <h2 className={styles.h2}>Machine-readable discovery</h2>
      <p className={styles.p}>
        AI agents and SDK generators can discover Karma&apos;s surface from any of these stable
        URLs:
      </p>
      <ul className={styles.ul}>
        <li className={styles.li}>
          <Link className={styles.a} href="/llms.txt">
            /llms.txt
          </Link>{" "}
          human-readable site index for LLMs
        </li>
        <li className={styles.li}>
          <Link className={styles.a} href="/llms-full.txt">
            /llms-full.txt
          </Link>{" "}
          full content reference
        </li>
        <li className={styles.li}>
          <Link className={styles.a} href="/developers/llms.txt">
            /developers/llms.txt
          </Link>{" "}
          developer-scoped index
        </li>
        <li className={styles.li}>
          <Link className={styles.a} href="/api/llms.txt">
            /api/llms.txt
          </Link>{" "}
          API-scoped index
        </li>
        <li className={styles.li}>
          <Link className={styles.a} href="/.well-known/ai-plugin.json">
            /.well-known/ai-plugin.json
          </Link>{" "}
          ChatGPT-style plugin manifest
        </li>
        <li className={styles.li}>
          <Link className={styles.a} href="/.well-known/mcp.json">
            /.well-known/mcp.json
          </Link>{" "}
          MCP server discovery (local-config shape)
        </li>
        <li className={styles.li}>
          <Link className={styles.a} href="/.well-known/agent-card.json">
            /.well-known/agent-card.json
          </Link>{" "}
          A2A agent card
        </li>
        <li className={styles.li}>
          <Link className={styles.a} href="/.well-known/api-catalog">
            /.well-known/api-catalog
          </Link>{" "}
          RFC 9727 API catalog
        </li>
        <li className={styles.li}>
          <Link className={styles.a} href="/index.md">
            /index.md
          </Link>{" "}
          markdown homepage fallback
        </li>
        <li className={styles.li}>
          <Link className={styles.a} href="/agents.md">
            /agents.md
          </Link>{" "}
          AI agent instructions
        </li>
      </ul>

      <h2 className={styles.h2}>Quick examples</h2>
      <h3 className={styles.h3}>cURL list community programs</h3>
      <pre className={styles.code}>
        {`curl ${apiUrl}/v2/communities/optimism/programs \\
 -H "Accept: application/json"`}
      </pre>
      <h3 className={styles.h3}>Claude Desktop connect MCP</h3>
      <p className={styles.p}>
        Add the URL <code className={styles.inlineCode}>{apiUrl}/v2/mcp</code> as a remote MCP
        server in Claude Desktop&apos;s settings. Claude walks the OAuth flow in your browser the
        first time you connect.
      </p>
      <h3 className={styles.h3}>cURL with API key read your projects</h3>
      <pre className={styles.code}>
        {`curl ${apiUrl}/v2/my-projects \\
 -H "x-api-key: $KARMA_API_KEY"`}
      </pre>

      <h2 className={styles.h2}>Source code</h2>
      <ul className={styles.ul}>
        <li className={styles.li}>
          <strong>GitHub organization:</strong>{" "}
          <a
            className={styles.a}
            href="https://github.com/show-karma"
            target="_blank"
            rel="noopener noreferrer"
          >
            github.com/show-karma
          </a>{" "}
          (karmahq org repos including the SDK, indexer, and this frontend)
        </li>
        <li className={styles.li}>
          <strong>Frontend (gap-app-v2):</strong>{" "}
          <a
            className={styles.a}
            href="https://github.com/show-karma/gap-app-v2"
            target="_blank"
            rel="noopener noreferrer"
          >
            github.com/show-karma/gap-app-v2
          </a>{" "}
          see{" "}
          <a
            className={styles.a}
            href="https://github.com/show-karma/gap-app-v2/blob/main/AGENTS.md"
            target="_blank"
            rel="noopener noreferrer"
          >
            AGENTS.md
          </a>{" "}
          for AI coding-agent instructions
        </li>
      </ul>

      <h2 className={styles.h2}>Support</h2>
      <p className={styles.p}>
        Developer questions, integration help, partnership inquiries:{" "}
        <a className={styles.a} href="mailto:info@karmahq.xyz">
          info@karmahq.xyz
        </a>
        . Security disclosures: same address, subject{" "}
        <code className={styles.inlineCode}>Security:</code>.
      </p>
    </main>
  );
}
