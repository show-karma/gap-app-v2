import { fetchToolCatalog } from "../fetchToolCatalog";
import {
  CATEGORY_DISPLAY_ORDER,
  CATEGORY_LABELS,
  type PublicToolMetadata,
  type ToolCategory,
} from "../types";

export async function ToolCatalogSection() {
  const tools = await fetchToolCatalog();
  return <ToolCatalogContent tools={tools} />;
}

interface ToolCatalogContentProps {
  tools: PublicToolMetadata[];
}

export function ToolCatalogContent({ tools }: ToolCatalogContentProps) {
  const grouped = groupByCategory(tools);
  const populatedCategories = CATEGORY_DISPLAY_ORDER.filter(
    (category) => (grouped.get(category) ?? []).length > 0
  );

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-12">
      <header className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
          The full tool catalog
        </h2>
        <p className="text-base text-muted-foreground">
          Every public MCP tool a Karma-connected agent can call without authentication, grouped by
          category. The machine-readable list lives at{" "}
          <a
            href="/.well-known/mcp-tools.json"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            /.well-known/mcp-tools.json
          </a>
          .
        </p>
      </header>

      {populatedCategories.length === 0 ? (
        <EmptyCatalogFallback />
      ) : (
        <div className="flex flex-col gap-10">
          {populatedCategories.map((category) => (
            <CategoryGroup key={category} category={category} tools={grouped.get(category) ?? []} />
          ))}
        </div>
      )}
    </section>
  );
}

function CategoryGroup({
  category,
  tools,
}: {
  category: ToolCategory;
  tools: PublicToolMetadata[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3 border-b border-border pb-2">
        <h3 className="text-lg font-semibold text-foreground">{CATEGORY_LABELS[category]}</h3>
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          {tools.length} {tools.length === 1 ? "tool" : "tools"}
        </span>
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {tools.map((tool) => (
          <li
            key={tool.name}
            className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4"
          >
            <div className="flex flex-col gap-0.5">
              <code className="font-mono text-sm font-semibold text-foreground">{tool.name}</code>
              {tool.alias ? (
                <code className="font-mono text-xs text-muted-foreground">{tool.alias}</code>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">{tool.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyCatalogFallback() {
  return (
    <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
      Tool catalog is temporarily unavailable. Browse the live{" "}
      <a
        href="https://gapapi.karmahq.xyz/v2/docs"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-primary underline-offset-4 hover:underline"
      >
        OpenAPI documentation
      </a>{" "}
      instead.
    </div>
  );
}

function groupByCategory(tools: PublicToolMetadata[]): Map<ToolCategory, PublicToolMetadata[]> {
  const grouped = new Map<ToolCategory, PublicToolMetadata[]>();
  for (const tool of tools) {
    const bucket = grouped.get(tool.category);
    if (bucket) {
      bucket.push(tool);
    } else {
      grouped.set(tool.category, [tool]);
    }
  }
  return grouped;
}
