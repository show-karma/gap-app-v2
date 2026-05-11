"use client";

import { Copy } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { envVars } from "@/utilities/enviromentVars";

interface SupportedClient {
  name: string;
  description: string;
  docsUrl?: string;
  setupHint: (mcpUrl: string, copy: (value: string, msg: string) => void) => React.ReactNode;
  logoSrc?: string;
}

const SUPPORTED_CLIENTS: SupportedClient[] = [
  {
    name: "Cursor",
    description: "Cursor's MCP integration discovers OAuth-protected servers automatically.",
    docsUrl: "https://docs.cursor.com/context/mcp",
    logoSrc: "/images/mcp/cursor.svg",
    setupHint: () =>
      "Settings → MCP → Add Server. Paste the URL above. Cursor will open Karma in your browser to sign in.",
  },
  {
    name: "Claude Desktop",
    description: "Claude Desktop supports remote MCP servers via the OAuth handshake.",
    docsUrl: "https://modelcontextprotocol.io/quickstart/user",
    logoSrc: "/images/mcp/claude.svg",
    setupHint: () =>
      "Settings → Developer → Add Server. Choose 'Remote URL' and paste the URL above.",
  },
  {
    name: "Codex CLI",
    description: "OpenAI's Codex CLI supports remote MCP servers via OAuth.",
    docsUrl: "https://github.com/openai/codex",
    logoSrc: "/images/mcp/openai.svg",
    setupHint: (mcpUrl, copy) => {
      const command = `codex mcp add karma --url ${mcpUrl}`;
      return (
        <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
          Run
          <code className="break-all rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
            {command}
          </code>
          <button
            type="button"
            onClick={() => copy(command, "Codex command copied")}
            aria-label="Copy Codex command"
            className="text-muted-foreground hover:text-foreground"
          >
            <Copy className="h-3.5 w-3.5" aria-hidden />
          </button>
          and follow the browser prompt.
        </span>
      );
    },
  },
  {
    name: "Other MCP clients",
    description: "Any MCP-spec-compliant client (2025-11-25+) auto-discovers the OAuth flow.",
    setupHint: () =>
      "Add the URL as a remote server. The client will follow the WWW-Authenticate hint and walk you through Karma's sign-in flow.",
  },
];

export function McpConnectPage() {
  const [, copy] = useCopyToClipboard();
  const mcpUrl = `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}/v2/mcp`;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-12">
      <header className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wider text-primary">MCP integration</p>
        <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">
          Connect Karma to your AI app
        </h1>
        <p className="text-base text-muted-foreground">
          Karma exposes an OAuth-protected MCP server so AI apps like Cursor, Claude Desktop, and
          Codex can read your projects, grants, and impact data — and act on your behalf when you
          allow them to.
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-sm font-medium text-muted-foreground">MCP server URL</h2>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <code className="break-all rounded-md bg-muted px-3 py-2 font-mono text-sm text-foreground">
            {mcpUrl}
          </code>
          <Button variant="outline" size="sm" onClick={() => copy(mcpUrl, "MCP URL copied")}>
            <Copy aria-hidden /> Copy
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Most AI apps will discover everything else automatically. You'll be asked to sign in to
          Karma and approve access the first time you connect.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">Supported apps</h2>
        <ul className="mt-4 space-y-3">
          {SUPPORTED_CLIENTS.map((client) => (
            <li key={client.name} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="flex items-center gap-2.5 text-base font-semibold text-foreground">
                  {client.logoSrc ? (
                    <Image
                      src={client.logoSrc}
                      alt=""
                      width={20}
                      height={20}
                      className="h-5 w-5 shrink-0 dark:invert"
                    />
                  ) : null}
                  {client.name}
                </h3>
                {client.docsUrl ? (
                  <a
                    href={client.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Docs ↗
                  </a>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{client.description}</p>
              <div className="mt-3 text-sm text-foreground">{client.setupHint(mcpUrl, copy)}</div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
