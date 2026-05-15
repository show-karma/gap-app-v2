import { CURATED_TOOLS } from "../content";

export function ToolCatalogSection() {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-12">
      <header className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
          A sample of the tools
        </h2>
        <p className="text-base text-muted-foreground">
          A handful of the MCP tools your agent will have access to. The full list is published at{" "}
          <a
            href="/.well-known/mcp-tools.json"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            /.well-known/mcp-tools.json
          </a>
          .
        </p>
      </header>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {CURATED_TOOLS.map((tool) => (
          <li
            key={tool.name}
            className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4"
          >
            <code className="font-mono text-sm font-semibold text-foreground">{tool.name}</code>
            <p className="text-sm text-muted-foreground">{tool.description}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
