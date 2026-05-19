import Link from "next/link";
import { envVars } from "@/utilities/enviromentVars";
import { PAGES } from "@/utilities/pages";

export function CtaSection() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 rounded-2xl border border-border bg-card px-4 py-12 text-center">
      <h2 className="text-balance text-2xl font-semibold text-foreground sm:text-3xl">
        Ready to give your agent access?
      </h2>
      <p className="text-balance text-base text-muted-foreground">
        Connect Karma to your AI app in under two minutes. No code required for individual builders
        — copy the URL, paste it into your client, sign in.
      </p>
      <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row">
        <Link
          href={PAGES.MCP_CONNECT}
          className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Connect your AI app
        </Link>
        <a
          href={`${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}/v2/docs/json`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          OpenAPI JSON ↗
        </a>
      </div>
    </section>
  );
}
