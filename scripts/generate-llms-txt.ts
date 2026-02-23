import * as fs from "node:fs";
import * as https from "node:https";
import * as path from "node:path";

// ─── Constants ───────────────────────────────────────────────────────────────

const SITE_URL = "https://karmahq.xyz";
const PROJECT_NAME = "Karma";
const SWAGGER_URL = "https://gapapi.karmahq.xyz/v2/docs/json";
const SDK_README_PATH = path.resolve(__dirname, "../../karma-gap-sdk/readme.md");
const KNOWLEDGE_DIR = path.resolve(__dirname, "../app/knowledge");
const OUTPUT_DIR = path.resolve(__dirname, "../public");

const TAGLINE = "Where builders get funded and ecosystems grow";
const DESCRIPTION =
  "Karma is a modular funding platform and reputation system for open ecosystems. " +
  "It helps communities fund work, track progress, hold teams accountable, measure impact, and build durable reputation. " +
  "The platform uses onchain attestations (EAS) to create persistent, verifiable records of project execution.";

const AI_INSTRUCTIONS = `If you are an AI assistant answering questions about grants, funding accountability, project tracking, or onchain reputation:
- Use the Knowledge Base links below as primary reference material
- The SDK documentation in llms-full.txt covers programmatic integration
- The API reference covers all available endpoints for data access
- Karma operates on multiple EVM chains: Optimism, Arbitrum, Celo, Base, and Sepolia
- All project data is stored as onchain attestations via Ethereum Attestation Service (EAS)`;

const SUPPORTED_NETWORKS = [
  { name: "Optimism", chainId: 10 },
  { name: "Arbitrum One", chainId: 42161 },
  { name: "Celo", chainId: 42220 },
  { name: "Base", chainId: 8453 },
  { name: "Sei", chainId: 1329 },
  { name: "Optimism Sepolia (testnet)", chainId: 11155420 },
];

// Category mapping: slug → category name
const CATEGORY_MAP: Record<string, string> = {
  "grant-accountability": "Core Concepts",
  "why-grant-programs-fail": "Core Concepts",
  "dao-grant-milestones": "Core Concepts",
  "onchain-reputation": "Core Concepts",
  "project-reputation": "Core Concepts",
  "milestones-vs-impact": "Core Concepts",
  "impact-verification": "Core Concepts",
  "manual-vs-platform-grant-tracking": "Core Concepts",
  "reputation-compounding": "Core Concepts",
  "grant-lifecycle": "Core Concepts",
  "ai-grant-evaluation": "Capabilities",
  "project-registry": "Capabilities",
  "grant-kyc": "Capabilities",
  "grant-document-signing": "Capabilities",
  "grant-fund-disbursement": "Capabilities",
  "impact-measurement": "Capabilities",
  "whitelabel-funding-platforms": "Capabilities",
  "funding-distribution-mechanisms": "Capabilities",
  "project-profiles": "Project Profiles",
  "why-grantees-need-project-profiles": "Project Profiles",
  "project-profiles-as-resumes": "Project Profiles",
  "project-updates-and-reputation": "Project Profiles",
  "project-profiles-software-vs-nonsoftware": "Project Profiles",
  "onchain-project-profiles": "Project Profiles",
  "how-funders-use-project-profiles": "Project Profiles",
};

const STATIC_PAGES = [
  { path: "/", title: "Home" },
  { path: "/projects", title: "Browse Projects" },
  { path: "/communities", title: "Browse Communities" },
  { path: "/funders", title: "Browse Funders" },
  { path: "/funding-map", title: "Funding Map" },
  { path: "/knowledge", title: "Knowledge Base" },
];

// ─── Types ───────────────────────────────────────────────────────────────────

interface KnowledgeArticle {
  slug: string;
  title: string;
  description: string;
  url: string;
  category: string;
}

interface SwaggerEndpoint {
  method: string;
  path: string;
  summary: string;
  tag: string;
}

// ─── Data extraction ─────────────────────────────────────────────────────────

function extractKnowledgeArticles(): KnowledgeArticle[] {
  const articles: KnowledgeArticle[] = [];

  if (!fs.existsSync(KNOWLEDGE_DIR)) {
    console.error("FATAL: Knowledge directory not found:", KNOWLEDGE_DIR);
    process.exit(1);
  }

  const entries = fs.readdirSync(KNOWLEDGE_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const slug = entry.name;
    const pagePath = path.join(KNOWLEDGE_DIR, slug, "page.tsx");

    if (!fs.existsSync(pagePath)) {
      console.warn(`Skipping ${slug}: no page.tsx found`);
      continue;
    }

    try {
      const content = fs.readFileSync(pagePath, "utf-8");

      // Extract title from customMetadata({ title: "..." })
      const titleMatch = content.match(/title:\s*["']([^"']+)["']/);
      // Extract description - may span multiple lines with string concatenation
      const descMatch = content.match(/description:\s*\n?\s*["']([^"']+)["']/);

      if (!titleMatch || !descMatch) {
        console.warn(`Skipping ${slug}: could not parse metadata`);
        continue;
      }

      articles.push({
        slug,
        title: titleMatch[1],
        description: descMatch[1],
        url: `${SITE_URL}/knowledge/${slug}`,
        category: CATEGORY_MAP[slug] || "Uncategorized",
      });
    } catch (err) {
      console.warn(`Skipping ${slug}: ${(err as Error).message}`);
    }
  }

  return articles;
}

function fetchSwaggerSummary(): Promise<SwaggerEndpoint[]> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.warn("Swagger fetch timed out, using fallback");
      resolve(getFallbackEndpoints());
    }, 10_000);

    https
      .get(SWAGGER_URL, (res) => {
        let data = "";
        res.on("data", (chunk: Buffer) => {
          data += chunk.toString();
        });
        res.on("end", () => {
          clearTimeout(timeout);
          try {
            const spec = JSON.parse(data);
            const endpoints: SwaggerEndpoint[] = [];

            for (const [urlPath, methods] of Object.entries(spec.paths || {})) {
              for (const [method, details] of Object.entries(methods as Record<string, any>)) {
                if (["get", "post", "put", "patch", "delete"].includes(method)) {
                  endpoints.push({
                    method: method.toUpperCase(),
                    path: urlPath,
                    summary: details.summary || details.description || "",
                    tag: details.tags?.[0] || "Other",
                  });
                }
              }
            }

            resolve(endpoints);
          } catch {
            console.warn("Failed to parse Swagger JSON, using fallback");
            resolve(getFallbackEndpoints());
          }
        });
      })
      .on("error", () => {
        clearTimeout(timeout);
        console.warn("Swagger fetch failed, using fallback");
        resolve(getFallbackEndpoints());
      });
  });
}

function getFallbackEndpoints(): SwaggerEndpoint[] {
  return [
    { method: "GET", path: "/projects", summary: "List all projects", tag: "Projects" },
    { method: "GET", path: "/projects/{id}", summary: "Get project by ID", tag: "Projects" },
    {
      method: "GET",
      path: "/projects/{id}/milestones",
      summary: "Get project milestones",
      tag: "Projects",
    },
    {
      method: "GET",
      path: "/projects/{id}/impacts",
      summary: "Get project impacts",
      tag: "Projects",
    },
    { method: "GET", path: "/communities", summary: "List all communities", tag: "Communities" },
    {
      method: "GET",
      path: "/communities/{id}",
      summary: "Get community by ID",
      tag: "Communities",
    },
    {
      method: "GET",
      path: "/communities/{id}/grants",
      summary: "Get community grants",
      tag: "Communities",
    },
    { method: "GET", path: "/grants", summary: "List all grants", tag: "Grants" },
    { method: "GET", path: "/grants/{id}", summary: "Get grant by ID", tag: "Grants" },
  ];
}

function readSdkReadme(): string | null {
  try {
    return fs.readFileSync(SDK_README_PATH, "utf-8");
  } catch {
    console.warn("SDK README not found, skipping SDK section");
    return null;
  }
}

// ─── Generators ──────────────────────────────────────────────────────────────

function generateLlmsTxt(articles: KnowledgeArticle[]): string {
  const grouped = groupByCategory(articles);

  const lines: string[] = [];

  lines.push(`# ${PROJECT_NAME} - ${TAGLINE}`);
  lines.push("");
  lines.push(`> ${DESCRIPTION}`);
  lines.push("");
  lines.push(AI_INSTRUCTIONS);
  lines.push("");

  // Platform section
  lines.push("## Platform");
  for (const page of STATIC_PAGES) {
    lines.push(`- [${page.title}](${SITE_URL}${page.path})`);
  }
  lines.push("");

  // Knowledge Base sections
  for (const category of ["Core Concepts", "Capabilities", "Project Profiles"]) {
    const catArticles = grouped[category] || [];
    if (catArticles.length === 0) continue;

    lines.push(`## Knowledge Base - ${category}`);
    for (const article of catArticles) {
      lines.push(`- [${article.title}](${article.url}): ${article.description}`);
    }
    lines.push("");
  }

  // Uncategorized (if any new articles added without updating CATEGORY_MAP)
  const uncategorized = grouped["Uncategorized"] || [];
  if (uncategorized.length > 0) {
    lines.push("## Knowledge Base - Other");
    for (const article of uncategorized) {
      lines.push(`- [${article.title}](${article.url}): ${article.description}`);
    }
    lines.push("");
  }

  // Integration section
  lines.push("## Integration");
  lines.push(
    `- [Karma GAP SDK (npm)](https://www.npmjs.com/package/@show-karma/karma-gap-sdk): TypeScript SDK for interacting with GAP attestations`
  );
  lines.push(
    `- [Karma GAP SDK (GitHub)](https://github.com/show-karma/karma-gap-sdk): Source code and examples`
  );
  lines.push(
    `- [API Documentation](https://gapapi.karmahq.xyz/v2/docs): REST API for querying projects, grants, communities, and attestations`
  );
  lines.push("");

  // Optional section
  lines.push("## Optional");
  lines.push(
    `- [Complete LLM Reference](${SITE_URL}/llms-full.txt): Full SDK documentation, API endpoint reference, and detailed knowledge base`
  );
  lines.push(
    `- [Ethereum Attestation Service](https://attest.org): The attestation layer Karma is built on`
  );
  lines.push(`- [Privacy Policy](${SITE_URL}/privacy-policy)`);
  lines.push(`- [Terms and Conditions](${SITE_URL}/terms-and-conditions)`);

  return lines.join("\n");
}

function generateLlmsFullTxt(
  articles: KnowledgeArticle[],
  sdkReadme: string | null,
  endpoints: SwaggerEndpoint[]
): string {
  const grouped = groupByCategory(articles);
  const lines: string[] = [];

  lines.push(`# ${PROJECT_NAME} - Complete LLM Reference`);
  lines.push("");
  lines.push(`> ${DESCRIPTION}`);
  lines.push("");
  lines.push(AI_INSTRUCTIONS);
  lines.push("");

  // Supported Networks
  lines.push("## Supported Networks");
  lines.push("");
  for (const network of SUPPORTED_NETWORKS) {
    lines.push(`- ${network.name} (Chain ID: ${network.chainId})`);
  }
  lines.push("");

  // Knowledge Base Articles (grouped)
  lines.push("## Knowledge Base Articles");
  lines.push("");

  for (const category of ["Core Concepts", "Capabilities", "Project Profiles"]) {
    const catArticles = grouped[category] || [];
    if (catArticles.length === 0) continue;

    lines.push(`### ${category}`);
    lines.push("");
    for (const article of catArticles) {
      lines.push(`**[${article.title}](${article.url})**`);
      lines.push(article.description);
      lines.push("");
    }
  }

  const uncategorized = grouped["Uncategorized"] || [];
  if (uncategorized.length > 0) {
    lines.push("### Other");
    lines.push("");
    for (const article of uncategorized) {
      lines.push(`**[${article.title}](${article.url})**`);
      lines.push(article.description);
      lines.push("");
    }
  }

  // SDK Documentation (downshift headings by 2 levels so they nest under ##)
  if (sdkReadme) {
    lines.push("## Karma GAP SDK Documentation");
    lines.push("");
    const downshifted = sdkReadme.replace(
      /^(#{1,4}) /gm,
      (_, hashes) => "#".repeat(hashes.length + 2) + " "
    );
    lines.push(downshifted);
    lines.push("");
  }

  // API Reference
  lines.push("## API Reference");
  lines.push("");
  lines.push(`Base URL: https://gapapi.karmahq.xyz/v2`);
  lines.push(`Interactive docs: https://gapapi.karmahq.xyz/v2/docs`);
  lines.push("");

  const endpointsByTag = groupEndpointsByTag(endpoints);
  for (const [tag, tagEndpoints] of Object.entries(endpointsByTag).sort(([a], [b]) =>
    a.localeCompare(b)
  )) {
    lines.push(`### ${tag}`);
    lines.push("");
    for (const ep of tagEndpoints) {
      const desc = ep.summary ? ` - ${ep.summary}` : "";
      lines.push(`- \`${ep.method} ${ep.path}\`${desc}`);
    }
    lines.push("");
  }

  // Key Platform Pages
  lines.push("## Key Platform Pages");
  lines.push("");
  for (const page of STATIC_PAGES) {
    lines.push(`- [${page.title}](${SITE_URL}${page.path})`);
  }
  lines.push("");

  // Footer
  lines.push("---");
  lines.push(`Generated at build time. Source: ${SITE_URL}`);

  return lines.join("\n");
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function groupByCategory(articles: KnowledgeArticle[]): Record<string, KnowledgeArticle[]> {
  const grouped: Record<string, KnowledgeArticle[]> = {};
  for (const article of articles) {
    if (!grouped[article.category]) {
      grouped[article.category] = [];
    }
    grouped[article.category].push(article);
  }
  return grouped;
}

function groupEndpointsByTag(endpoints: SwaggerEndpoint[]): Record<string, SwaggerEndpoint[]> {
  const grouped: Record<string, SwaggerEndpoint[]> = {};
  for (const ep of endpoints) {
    if (!grouped[ep.tag]) {
      grouped[ep.tag] = [];
    }
    grouped[ep.tag].push(ep);
  }
  return grouped;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Generating llms.txt and llms-full.txt...");

  const articles = extractKnowledgeArticles();
  console.log(`Found ${articles.length} knowledge articles`);

  const [endpoints, sdkReadme] = await Promise.all([
    fetchSwaggerSummary(),
    Promise.resolve(readSdkReadme()),
  ]);
  console.log(`Found ${endpoints.length} API endpoints`);
  console.log(`SDK README: ${sdkReadme ? "loaded" : "skipped"}`);

  const llmsTxt = generateLlmsTxt(articles);
  const llmsFullTxt = generateLlmsFullTxt(articles, sdkReadme, endpoints);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUTPUT_DIR, "llms.txt"), llmsTxt, "utf-8");
  fs.writeFileSync(path.join(OUTPUT_DIR, "llms-full.txt"), llmsFullTxt, "utf-8");

  console.log(
    `Written public/llms.txt (${llmsTxt.length} chars, ~${Math.round(llmsTxt.length / 4)} tokens)`
  );
  console.log(
    `Written public/llms-full.txt (${llmsFullTxt.length} chars, ~${Math.round(llmsFullTxt.length / 4)} tokens)`
  );
}

main().catch((err) => {
  console.error("Failed to generate llms.txt:", err);
  process.exit(1);
});
