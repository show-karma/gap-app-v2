import Link from "next/link";
import { envVars } from "@/utilities/enviromentVars";
import { PAGES } from "@/utilities/pages";

export function HeroSection() {
  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-5 px-4 pt-16 pb-6 text-center">
      <p className="text-xs font-medium uppercase tracking-wider text-primary">
        Karma for AI agents
      </p>
      <h1 className="text-balance text-4xl font-semibold text-foreground sm:text-5xl">
        Karma works with Claude, Cursor, and Codex.
      </h1>
      <p className="text-balance text-lg text-muted-foreground">
        Connect Karma's Model Context Protocol server to your AI app to read projects, grants, and
        impact data — or take action on your behalf, when you say so.
      </p>
      <div className="mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href={PAGES.MCP_CONNECT}
          className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Connect your AI app
        </Link>
        <a
          href={`${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}/v2/docs`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          View OpenAPI docs ↗
        </a>
      </div>
    </section>
  );
}
