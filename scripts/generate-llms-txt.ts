import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "..");

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf-8");

  for (const rawLine of content.split("\n")) {
    const line = rawLine.replace(/\r$/, "").trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    if (process.env[key] !== undefined) continue;

    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value.replace(/\\n/g, "\n").replace(/\\r/g, "\r");
  }
}

function loadScriptEnv() {
  loadEnvFile(path.resolve(PROJECT_ROOT, ".env.local"));
  loadEnvFile(path.resolve(PROJECT_ROOT, ".env"));
}

loadScriptEnv();

const SITE_URL = "https://karmahq.xyz";
const SITEMAP_URL = `${SITE_URL}/sitemap.xml`;
const PROJECT_NAME = "Karma";
const API_DOCS_URL = "https://gapapi.karmahq.xyz/v2/docs";
const API_SPEC_URL = "https://gapapi.karmahq.xyz/v2/docs/json";
const FIRECRAWL_SCRAPE_URL =
  process.env.FIRECRAWL_SCRAPE_URL || "https://api.firecrawl.dev/v1/scrape";
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY || "";
const SDK_README_PATH = path.resolve(__dirname, "../../karma-gap-sdk/readme.md");
const SDK_README_FALLBACK_URL =
  "https://raw.githubusercontent.com/show-karma/karma-gap-sdk/main/readme.md";
const KNOWLEDGE_DIR = path.resolve(__dirname, "../app/knowledge");
const OUTPUT_DIR = path.resolve(__dirname, "../public");
const BUILD_TIMESTAMP = new Date().toISOString();

const DEFAULT_DESCRIPTION =
  "Karma is a platform for builders and ecosystems. Builders showcase their work and build reputation. " +
  "Ecosystems use Karma to allocate funding, track milestones, and measure impact.";

const SITEMAP_LABEL_MAP: Record<string, string> = {
  "/": "Home",
  "/communities": "Communities",
  "/create-project-profile": "Create Project Profile",
  "/funders": "For Funders",
  "/funding-map": "Funding Map",
  "/privacy-policy": "Privacy Policy",
  "/projects": "Projects",
  "/seeds": "Seeds",
  "/terms-and-conditions": "Terms and Conditions",
  "/knowledge": "Knowledge Base",
};

const SITEMAP_DESCRIPTION_MAP: Record<string, string> = {
  "/": "Ecosystems use Karma to fund projects transparently. Builders use it to share progress, earn reputation, and get discovered.",
  "/communities": "Explore DAOs, protocols, and organizations running funding programs on Karma",
  "/create-project-profile":
    "Create a public project profile to track funding, milestones, and updates",
  "/funders":
    "Tools for funders to allocate grants, track milestones, measure outcomes, and grow ecosystems",
  "/funding-map": "Browse open funding programs across ecosystems",
  "/privacy-policy": "Privacy policy for the Karma platform",
  "/projects": "Discover projects with verified milestones and onchain reputation",
  "/seeds": "Seed funding and early-stage project support",
  "/terms-and-conditions": "Terms and conditions for using the Karma platform",
  "/knowledge": "Articles on grant accountability, reputation, and impact measurement",
};

const SUPPORTED_NETWORKS = [
  { name: "Optimism", chainId: 10 },
  { name: "Arbitrum One", chainId: 42161 },
  { name: "Celo", chainId: 42220 },
  { name: "Base", chainId: 8453 },
  { name: "Sei", chainId: 1329 },
  { name: "Optimism Sepolia (testnet)", chainId: 11155420 },
];

interface LandingPageTarget {
  path: string;
  label: string;
  fallbackTitle: string;
  fallbackDescription: string;
  curatedDescription?: string;
  minContentChars?: number;
  maxContentChars?: number;
  preferSourceFallback?: boolean;
  sourceFallbackFiles?: string[];
}

const LANDING_PAGE_TARGETS: LandingPageTarget[] = [
  {
    path: "/",
    label: "Home",
    fallbackTitle: "Karma - Where builders get funded and ecosystems grow",
    fallbackDescription: DEFAULT_DESCRIPTION,
    curatedDescription:
      "Ecosystems use Karma to fund projects transparently. Builders use it to share progress, earn reputation, and get discovered.",
    minContentChars: 400,
    maxContentChars: 4200,
    sourceFallbackFiles: [
      "app/page.tsx",
      "src/features/homepage/components/hero.tsx",
      "src/features/homepage/components/platform-features.tsx",
      "src/features/homepage/components/how-it-works.tsx",
      "src/features/homepage/components/where-builders-grow.tsx",
      "src/features/homepage/components/faq.tsx",
    ],
  },
  {
    path: "/funders",
    label: "For Funders",
    fallbackTitle: "For Funders - Allocate funding and grow your ecosystem",
    fallbackDescription:
      "Discover how Karma helps funders allocate grants, track milestones, measure impact, and grow their ecosystems.",
    curatedDescription:
      "From intake to impact, Karma gives funders the tools to allocate grants, track milestones, measure outcomes, and grow their ecosystems.",
    minContentChars: 500,
    maxContentChars: 5200,
    sourceFallbackFiles: [
      "app/funders/page.tsx",
      "src/features/funders/components/hero.tsx",
      "src/features/funders/components/numbers-section.tsx",
      "src/features/funders/components/platform-section.tsx",
      "src/features/funders/components/case-studies-section.tsx",
      "src/features/funders/components/how-it-works-section.tsx",
      "src/features/funders/components/offering-section.tsx",
      "src/features/funders/components/faq-section.tsx",
      "src/features/funders/components/handle-the-vision-section.tsx",
    ],
  },
  {
    path: "/projects",
    label: "Projects",
    fallbackTitle: "Explore Projects",
    fallbackDescription:
      "Browse projects that use Karma to track grants, share updates, and build public reputation.",
    curatedDescription:
      "Discover projects with verified milestones and onchain reputation. Evaluate track records and traction.",
    minContentChars: 260,
    maxContentChars: 2400,
    preferSourceFallback: true,
    sourceFallbackFiles: ["app/projects/page.tsx", "components/Pages/Projects/HeroSection.tsx"],
  },
  {
    path: "/communities",
    label: "Communities",
    fallbackTitle: "Explore Communities",
    fallbackDescription:
      "Browse communities using Karma to run funding programs and track outcomes.",
    curatedDescription:
      "Explore DAOs, protocols, and organizations running funding programs on Karma.",
    minContentChars: 260,
    maxContentChars: 2600,
    preferSourceFallback: true,
    sourceFallbackFiles: [
      "app/communities/page.tsx",
      "components/Pages/Communities/CommunitiesPage.tsx",
    ],
  },
];

const STATIC_PAGES = [
  { path: "/", title: "Home" },
  { path: "/projects", title: "Browse Projects" },
  { path: "/communities", title: "Browse Communities" },
  { path: "/funders", title: "For Funders" },
  { path: "/funding-map", title: "Funding Map" },
  { path: "/knowledge", title: "Knowledge Base" },
];

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

const BOILERPLATE_LINE_PATTERNS = [
  /^sign in$/i,
  /^contact sales$/i,
  /^resources$/i,
  /^explore$/i,
  /^for builders$/i,
  /^for funders$/i,
  /^search project\/community$/i,
  /for builders.*for funders/i,
  /^sign in contact sales$/i,
  /^created on$/i,
  /^stay up to date$/i,
  /^view all$/i,
  /^no communities found\.?$/i,
  /^terms privacy$/i,
  /^©\s*\d{4}/i,
  /^💖/i,
  // CTA / UI chrome
  /^ready to get started\??$/i,
  /^ready to scale/i,
  /^still have questions\??$/i,
  /^can't find the answer/i,
  /^read case study$/i,
  /^run your program on karma$/i,
  /^run a funding program$/i,
  /^add your community$/i,
  /^grow your ecosystem\b/i,
  /^where builders grow$/i,
  /^join over [\d,]+\+? /i,
  /^join our community$/i,
  /^get started$/i,
  /^learn more$/i,
  /^explore projects$/i,
  // NOTE: "Choose your growth path" handled by cleanExtractedContent pricing block detector
  /^connect with our team$/i,
  /^configure your ecosystem$/i,
  /^launch your program$/i,
  /^celebrate your milestones/i,
  /^accept fiat donations$/i,
  // Orphan marketing section headers
  /^our platform$/i,
  // NOTE: "Our Offering" handled by cleanExtractedContent pricing block detector
  /^the numbers$/i,
  /^case studies$/i,
  /^how it works$/i,
  /^faqs?$/i,
  // NOTE: "Live Funding Opportunities" is handled by cleanExtractedContent block detector
  /^communities on karma$/i,
  /^trusted by\b/i,
  // Stat labels without values
  /^ecosystems supported$/i,
  /^projects tracked$/i,
  /^onchain attestations$/i,
  /^program launch time$/i,
  // Pricing tier names as standalone
  /^starter$/i,
  /^enterprise$/i,
  // Trust badges / logo names as standalone
  /^celo public goods$/i,
  // Broken date/stat renders from live data cards
  /^ends[a-z]/i,
  /^\d+funding/i,
  /^direct grants$/i,
  // How-it-works short step labels
  /^create project$/i,
  /^apply and get funded$/i,
  /^build reputation$/i,
  /^get retrofunding$/i,
  /^get donations$/i,
  /^apply for more funding$/i,
  /^add milestones,? metrics/i,
  // Design fragments / broken renders
  /^step \d+$/i,
  /^most popular$/i,
  /^[A-Z]{1,2}$/,
  // NOTE: orphan quote marks handled by cleanExtractedContent testimonial block detector
  /^[\d.]+x\s*faster$/i,
  // Short stat callouts (e.g. "4k+ projects active on Karma")
  /^\d+[kKmM+]+\s+\w+/,
  /^\d+\+?\s+hours?\s+saved/i,
];

interface KnowledgeArticle {
  slug: string;
  title: string;
  description: string;
  url: string;
  category: string;
  body: string;
  sourcePath: string;
  lastUpdated: string;
}

interface LandingPageContent {
  path: string;
  label: string;
  url: string;
  title: string;
  description: string;
  snippet: string;
  fullText: string;
  source: string;
  lastUpdated: string;
}

interface FirecrawlResponse {
  success?: boolean;
  data?: {
    markdown?: string;
    metadata?: {
      title?: string;
      description?: string;
    };
  };
  error?: string;
}

interface LandingExtraction {
  title: string;
  description: string;
  text: string;
  source: string;
}

interface SitemapEntry {
  url: string;
  lastModified: string;
  changeFrequency: string;
  priority: string;
}

interface SdkReadmeData {
  content: string;
  source: string;
  sourcePath: string;
  lastUpdated: string;
}

function normalizeWhitespace(value: string): string {
  return value
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .trim();
}

function normalizeMultilineText(value: string): string {
  const lines = value
    .split("\n")
    .map((line) => normalizeWhitespace(line))
    .filter((line) => line.length > 0);

  const counts = new Map<string, number>();
  for (const line of lines) {
    const key = line.toLowerCase();
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const filtered: string[] = [];
  let previous = "";
  for (const line of lines) {
    const lower = line.toLowerCase();
    const words = line.split(/\s+/).length;
    const repeatedOften = (counts.get(lower) || 0) > 2;
    const isMostlyNumeric = /^[\d.,%+$KkMmbB-]+$/.test(line);

    if (BOILERPLATE_LINE_PATTERNS.some((re) => re.test(line))) continue;
    if (lower === previous.toLowerCase()) continue;
    if (repeatedOften && words <= 2) continue;
    if (isMostlyNumeric && words <= 2) continue;

    filtered.push(line);
    previous = line;
  }

  return filtered
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function truncateAtWordBoundary(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  const cutoff = value.lastIndexOf(" ", maxChars - 1);
  const end = cutoff > Math.floor(maxChars * 0.6) ? cutoff : maxChars;
  return `${value.slice(0, end).trim()}...`;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&mdash;/g, "-")
    .replace(/&ndash;/g, "-")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      const codepoint = Number.parseInt(hex, 16);
      return Number.isNaN(codepoint) ? "" : String.fromCodePoint(codepoint);
    })
    .replace(/&#([0-9]+);/g, (_, dec) => {
      const codepoint = Number.parseInt(dec, 10);
      return Number.isNaN(codepoint) ? "" : String.fromCodePoint(codepoint);
    });
}

function markdownToPlainText(markdown: string): string {
  const withoutFormatting = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "");
  return normalizeMultilineText(withoutFormatting);
}

function findMetaContent(html: string, attr: "name" | "property", key: string): string | null {
  const regex = new RegExp(
    `<meta[^>]+${attr}=["']${key}["'][^>]*content=["']([^"']+)["'][^>]*>`,
    "i"
  );
  const match = html.match(regex);
  return match ? decodeHtmlEntities(match[1].trim()) : null;
}

function extractTitleFromHtml(html: string): string | null {
  const match = html.match(/<title>([\s\S]*?)<\/title>/i);
  if (!match) return null;
  return decodeHtmlEntities(normalizeWhitespace(match[1]));
}

function extractMainHtml(html: string): string {
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  const mainMatch = stripped.match(/<(main|article)[^>]*>([\s\S]*?)<\/\1>/i);
  if (mainMatch) return mainMatch[2];
  const bodyMatch = stripped.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return bodyMatch ? bodyMatch[1] : stripped;
}

function htmlToPlainText(fragment: string): string {
  const text = fragment
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(h1|h2|h3|h4|h5|h6|p|li|section|article|div|tr)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, " ");
  return normalizeMultilineText(decodeHtmlEntities(text));
}

function deriveDescription(text: string, fallback: string): string {
  const flat = text.replace(/\n/g, " ");
  // Grab the first sentence (40-220 chars ending with punctuation)
  const first = flat.match(/.{40,220}?[.!?](?=\s|$)/);
  if (!first) return fallback;

  const firstSentence = normalizeWhitespace(first[0]);
  // If the first sentence is short, try to grab a second sentence for a richer description
  if (firstSentence.length < 100) {
    const rest = flat.slice(first.index! + first[0].length).trim();
    const second = rest.match(/^.{20,120}?[.!?](?=\s|$)/);
    if (second) {
      const combined = `${firstSentence} ${normalizeWhitespace(second[0])}`;
      if (combined.length <= 240) return combined;
    }
  }
  return firstSentence;
}

function cleanPageTitle(value: string): string {
  return normalizeWhitespace(value.replace(/\s*\|\s*Karma$/i, ""));
}

function buildSnippet(value: string): string {
  const lines = value
    .split("\n")
    .filter((line) => line.length > 0)
    .filter((line) => line.length >= 28);
  const snippet = (lines.length > 0 ? lines : value.split("\n")).slice(0, 8).join(" ");
  return truncateAtWordBoundary(normalizeWhitespace(snippet), 700);
}

function isMeaningfulTextCandidate(value: string): boolean {
  const line = normalizeWhitespace(decodeHtmlEntities(value));
  if (line.length < 18 || line.length > 260) return false;
  if (!/[A-Za-z]/.test(line)) return false;
  if ((line.match(/\s+/g) || []).length < 2) return false;
  if (BOILERPLATE_LINE_PATTERNS.some((re) => re.test(line))) return false;
  if (line.includes("className") || line.includes("http://") || line.includes("https://"))
    return false;
  if (line.includes("//")) return false;
  if (
    /\b(import|export|return|const|let|function|useState|map\(|className|onClick|target=)\b/.test(
      line
    )
  ) {
    return false;
  }
  if (/[{}]|=>|===|!==|^\)\s*:\s*\($/.test(line)) return false;
  const utilityClassMatches =
    line.match(/\b(?:sm:|md:|lg:|xl:|2xl:)?[a-z]+-[A-Za-z0-9[\]#./%:-]+\b/g) || [];
  if (utilityClassMatches.length >= 2) return false;
  if (/^[\p{P}\p{S}\d\s]+$/u.test(line)) return false;
  return true;
}

function extractTextCandidatesFromSource(content: string): string[] {
  const results: string[] = [];

  for (const match of content.matchAll(/>\s*([^<>{\n][^<>{]{8,}?)\s*</g)) {
    const candidate = normalizeWhitespace(match[1]);
    if (isMeaningfulTextCandidate(candidate)) {
      results.push(candidate);
    }
  }

  for (const match of content.matchAll(
    /(?:title|description):\s*(?:\n\s*)?["'`]([^"'`\n]{20,220})["'`]/g
  )) {
    const candidate = normalizeWhitespace(match[1]);
    if (isMeaningfulTextCandidate(candidate)) {
      results.push(candidate);
    }
  }

  return results;
}

function buildSourceFallbackText(target: LandingPageTarget): string {
  const fallbackLines = [target.fallbackTitle, target.fallbackDescription];

  for (const relativePath of target.sourceFallbackFiles || []) {
    const filePath = path.resolve(PROJECT_ROOT, relativePath);
    if (!fs.existsSync(filePath)) continue;

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      fallbackLines.push(...extractTextCandidatesFromSource(content));
    } catch {}
  }

  return truncateAtWordBoundary(
    normalizeMultilineText(dedupeLines(fallbackLines).join("\n")),
    3200
  );
}

function toProjectRelative(filePath: string): string {
  const relative = path.relative(PROJECT_ROOT, filePath);
  return relative && !relative.startsWith("..") ? relative : filePath;
}

function getLastUpdatedForFile(filePath: string): string {
  const relativePath = toProjectRelative(filePath);

  try {
    const gitDate = execFileSync("git", ["log", "-1", "--format=%cI", "--", relativePath], {
      cwd: PROJECT_ROOT,
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf-8",
    }).trim();

    if (gitDate) {
      return gitDate;
    }
  } catch {
    // Ignore git failures and fallback to filesystem timestamp.
  }

  try {
    return fs.statSync(filePath).mtime.toISOString();
  } catch {
    return BUILD_TIMESTAMP;
  }
}

function getLatestTimestampForFiles(filePaths: string[]): string {
  let latest = "";
  let latestMs = 0;

  for (const filePath of filePaths) {
    const timestamp = getLastUpdatedForFile(filePath);
    const timestampMs = new Date(timestamp).getTime();

    if (!Number.isNaN(timestampMs) && timestampMs >= latestMs) {
      latest = timestamp;
      latestMs = timestampMs;
    }
  }

  return latest || BUILD_TIMESTAMP;
}

function dedupeLines(lines: string[]): string[] {
  const deduped: string[] = [];

  for (const line of lines) {
    const normalized = normalizeWhitespace(line);
    if (!normalized) continue;
    const key = normalized.toLowerCase();

    const duplicateIndex = deduped.findIndex((existingLine) => {
      const existingKey = existingLine.toLowerCase();
      if (existingKey === key) return true;

      // Drop near-duplicates where one line mostly contains the other.
      if (existingLine.length >= 40 && normalized.length >= 40) {
        return existingKey.includes(key) || key.includes(existingKey);
      }

      return false;
    });

    if (duplicateIndex === -1) {
      deduped.push(normalized);
      continue;
    }

    if (normalized.length > deduped[duplicateIndex].length) {
      deduped[duplicateIndex] = normalized;
    }
  }

  return deduped;
}

function isPersonNameLine(line: string): boolean {
  const trimmed = line.trim();
  return (
    trimmed.length > 3 &&
    trimmed.length < 30 &&
    /^[A-Z][a-z]+ [A-Z]/.test(trimmed) &&
    !/[.!?,;:]$/.test(trimmed) &&
    trimmed.split(/\s+/).length <= 3
  );
}

function isJobTitleLine(line: string): boolean {
  return /\b(lead|head|director|manager|founder|co-?founder|ceo|cto|devrel|vp|president|partner|advisor)\b/i.test(
    line.trim()
  );
}

function isPricingLine(line: string): boolean {
  const trimmed = line.trim();
  if (/^track up to \d/i.test(trimmed)) return true;
  if (/^\d+\s+integrations?\b/i.test(trimmed)) return true;
  if (/\bsupport\s*\(\d+hr/i.test(trimmed)) return true;
  if (/\bSLA\b/.test(trimmed)) return true;
  if (/^(email|dedicated|telegram)\s+support/i.test(trimmed)) return true;
  if (/^milestone tracking with/i.test(trimmed)) return true;
  if (/^full api access/i.test(trimmed)) return true;
  if (/^all ai automation/i.test(trimmed)) return true;
  if (/^multi-chain deployments/i.test(trimmed)) return true;
  if (/^custom agentic/i.test(trimmed)) return true;
  if (/^ai application review/i.test(trimmed)) return true;
  if (/^(start|scale|continuous)\s+(your|to|grant)/i.test(trimmed)) return true;
  if (/^track [\d,]+\+? projects/i.test(trimmed)) return true;
  if (/^unlimited grants/i.test(trimmed)) return true;
  return false;
}

function detectBlockSkip(lines: string[], i: number): number {
  const trimmed = lines[i].trim();

  // --- Live data card block ---
  // Triggered by "Live Funding Opportunities" or a cluster of short program-name lines
  if (/^live funding opportunities$/i.test(trimmed)) {
    let j = i + 1;
    while (j < lines.length) {
      const next = lines[j].trim();
      // Exit when we hit a substantive sentence (>60 chars or contains a verb phrase)
      if (next.length > 60 && /[a-z]{3,}\s+[a-z]{3,}/i.test(next)) break;
      j++;
    }
    return j - i;
  }

  // --- Testimonial block ---
  // Pattern: orphan quote mark followed by quote text, then person name/title attribution
  if (/^["\u201C\u201D]$/.test(trimmed)) {
    let j = i + 1;
    while (j < Math.min(i + 8, lines.length)) {
      const next = lines[j].trim();
      // Found person name — skip through name and optional title
      if (isPersonNameLine(next)) {
        j++;
        if (j < lines.length && isJobTitleLine(lines[j])) j++;
        return j - i;
      }
      // Found job title directly (name might be a single word we can't pattern-match)
      if (isJobTitleLine(next)) {
        j++;
        return j - i;
      }
      j++;
    }
    // Standalone orphan quote mark — skip just this line
    return 1;
  }

  // Pattern: person name followed by job title (standalone attribution)
  if (isPersonNameLine(trimmed) && i + 1 < lines.length && isJobTitleLine(lines[i + 1])) {
    return 2;
  }

  // Pattern: single-word name followed by job title (e.g. "Gonna" + "Optimism Grants Council Lead")
  if (
    trimmed.length < 20 &&
    trimmed.split(/\s+/).length === 1 &&
    /^[A-Z][a-z]+$/.test(trimmed) &&
    i + 1 < lines.length &&
    isJobTitleLine(lines[i + 1])
  ) {
    return 2;
  }

  // --- Pricing block ---
  // Triggered by pricing-section taglines or "Our Offering" section header
  if (/^(start where you are|choose your growth path|our offering)/i.test(trimmed)) {
    let j = i + 1;
    while (j < lines.length) {
      const next = lines[j].trim();
      if (isPricingLine(next) || /^(starter|pro|enterprise)$/i.test(next) || !next) {
        j++;
        continue;
      }
      break;
    }
    return j - i;
  }

  return 0;
}

function isStatLabelLine(line: string): boolean {
  const trimmed = line.trim();
  // A stat label line: 30-120 chars, doesn't end with sentence punctuation,
  // not a real heading or content sentence
  return (
    trimmed.length >= 30 && trimmed.length <= 120 && !/[.!?]$/.test(trimmed) && !/^#/.test(trimmed)
  );
}

function isStatLabelBlock(lines: string[], index: number): boolean {
  const trimmed = lines[index].trim();
  if (!isStatLabelLine(trimmed)) return false;

  // Look for a run of 3+ consecutive stat-label-like lines around this position
  let start = index;
  while (start > 0 && isStatLabelLine(lines[start - 1].trim())) start--;
  let end = index;
  while (end < lines.length - 1 && isStatLabelLine(lines[end + 1].trim())) end++;

  return end - start + 1 >= 3;
}

function cleanExtractedContent(text: string): string {
  const lines = text.split("\n");
  const result: string[] = [];

  // Short standalone fragment patterns — lines that are noise when they appear
  // without surrounding paragraph context
  const shortFragmentPatterns = [
    /^one profile\b/i,
    /^launch and fund/i,
    /^ecosystems trust/i,
    /^support for multiple chains/i,
    /^track and manage payouts$/i,
    /^add project deliverables$/i,
    /^add custom metrics/i,
    /^accept fiat donations$/i,
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Strip trailing FAQ/CTA blocks
    if (/^(frequently asked questions|faqs?)$/i.test(trimmed)) break;

    // Detect and skip noise blocks (live data, testimonials, pricing)
    const blockSkip = detectBlockSkip(lines, i);
    if (blockSkip > 0) {
      i += blockSkip - 1;
      continue;
    }

    // Skip orphan single/double char lines (avatar initials, logo fragments, curly quotes)
    if (trimmed.length <= 3 && /^[A-Z"'\u201C\u201D\u2018\u2019]{0,3}$/.test(trimmed)) continue;

    // Skip stat callout lines (e.g. "100+ hours saved", "3,600+ Milestones completed")
    if (
      /^[\d,]+\+?\s+(hours?|milestones?|projects?|grants?)\b/i.test(trimmed) &&
      trimmed.length < 80
    ) {
      continue;
    }

    // Skip consecutive stat label blocks (stat descriptions without their numeric values)
    // These are groups of 3+ short lines (30-120 chars) that don't end with sentence punctuation
    if (isStatLabelBlock(lines, i)) {
      continue;
    }

    // Skip short standalone fragment lines
    if (shortFragmentPatterns.some((re) => re.test(trimmed))) continue;

    result.push(line);
  }

  // Deduplicate near-identical lines (>80% word overlap)
  const deduped: string[] = [];
  const seenWordSets: { words: Set<string>; line: string }[] = [];

  for (const line of result) {
    const words = line.toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length < 5) {
      deduped.push(line);
      continue;
    }

    const wordSet = new Set(words);
    let isDuplicate = false;

    for (const seen of seenWordSets) {
      const intersection = [...wordSet].filter((w) => seen.words.has(w));
      const overlapMax = intersection.length / Math.max(wordSet.size, seen.words.size);
      const overlapMin = intersection.length / Math.min(wordSet.size, seen.words.size);
      // Skip if >80% overlap by larger set, or if one line's words are mostly a subset of another
      if (overlapMax > 0.8 || (overlapMin > 0.85 && Math.min(wordSet.size, seen.words.size) >= 5)) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      deduped.push(line);
      seenWordSets.push({ words: wordSet, line });
    }
  }

  return deduped
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function mergeTextBlocks(primary: string, secondary: string, maxChars: number): string {
  const mergedLines = dedupeLines([...primary.split("\n"), ...secondary.split("\n")]);
  return truncateAtWordBoundary(normalizeMultilineText(mergedLines.join("\n")), maxChars);
}

function isNoisyLandingText(text: string): boolean {
  const noisePatterns = [
    /created on\s+[a-z]{3}\s+\d{1,2},\s+\d{4}/i,
    /\b\d{1,3}(?:,\d{3})+\s+projects found\b/i,
    /\bsort by\b/i,
    /\bno communities found\b/i,
    /previous slide.*next slide/i,
    /\bwallet\s*[·|]\s*privy\b/i,
  ];

  const matches = noisePatterns.reduce((count, pattern) => count + Number(pattern.test(text)), 0);
  const lineCount = text.split("\n").filter(Boolean).length;

  return matches >= 2 || lineCount > 120;
}

async function fetchViaFirecrawl(
  url: string,
  fallbackDescription: string
): Promise<LandingExtraction | null> {
  if (!FIRECRAWL_API_KEY) return null;

  try {
    const response = await fetch(FIRECRAWL_SCRAPE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: true,
        excludeTags: ["button", "nav", "footer", "aside", "img", ".cta", ".faq"],
        removeBase64Images: true,
        blockAds: true,
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      throw new Error(`Firecrawl request failed (${response.status})`);
    }

    const payload = (await response.json()) as FirecrawlResponse;
    if (!payload.success || !payload.data?.markdown) {
      throw new Error(payload.error || "Firecrawl returned no markdown");
    }

    const text = truncateAtWordBoundary(markdownToPlainText(payload.data.markdown), 9000);
    const titleFromMarkdown = payload.data.markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
    const title = cleanPageTitle(payload.data.metadata?.title || titleFromMarkdown || PROJECT_NAME);
    const rawDescription = normalizeWhitespace(payload.data.metadata?.description || "");
    const description =
      rawDescription && rawDescription.length <= 260
        ? rawDescription
        : deriveDescription(text, fallbackDescription);

    return {
      title,
      description,
      text,
      source: "firecrawl",
    };
  } catch (error) {
    console.warn(`Firecrawl scrape failed for ${url}: ${(error as Error).message}`);
    return null;
  }
}

async function fetchViaHtml(
  url: string,
  fallbackTitle: string,
  fallbackDescription: string
): Promise<LandingExtraction | null> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Karma-LLMS-Generator/1.0" },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      throw new Error(`HTML fetch failed (${response.status})`);
    }

    const html = await response.text();
    const main = extractMainHtml(html);
    const text = truncateAtWordBoundary(htmlToPlainText(main), 9000);
    const safeText =
      text.length < 180 ? normalizeMultilineText(`${fallbackTitle}\n${fallbackDescription}`) : text;
    const title = cleanPageTitle(extractTitleFromHtml(html) || fallbackTitle);
    const description =
      findMetaContent(html, "name", "description") ||
      findMetaContent(html, "property", "og:description") ||
      deriveDescription(safeText, fallbackDescription);

    return {
      title,
      description: normalizeWhitespace(description),
      text: safeText,
      source: "html",
    };
  } catch (error) {
    console.warn(`HTML scrape failed for ${url}: ${(error as Error).message}`);
    return null;
  }
}

function parseTagValue(xmlChunk: string, tagName: string): string {
  const match = xmlChunk.match(new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match ? decodeHtmlEntities(normalizeWhitespace(match[1])) : "";
}

async function fetchSitemapEntries(): Promise<SitemapEntry[]> {
  try {
    const response = await fetch(SITEMAP_URL, {
      headers: { "User-Agent": "Karma-LLMS-Generator/1.0" },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      throw new Error(`Sitemap fetch failed (${response.status})`);
    }

    const xml = await response.text();
    const entries: SitemapEntry[] = [];

    for (const match of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
      const block = match[1];
      const url = parseTagValue(block, "loc");
      if (!url) continue;

      entries.push({
        url,
        lastModified: parseTagValue(block, "lastmod"),
        changeFrequency: parseTagValue(block, "changefreq"),
        priority: parseTagValue(block, "priority"),
      });
    }

    if (entries.length > 0) {
      return entries;
    }
  } catch (error) {
    console.warn(`Sitemap fetch failed: ${(error as Error).message}`);
  }

  return STATIC_PAGES.map((page) => ({
    url: `${SITE_URL}${page.path}`,
    lastModified: BUILD_TIMESTAMP,
    changeFrequency: "",
    priority: "",
  }));
}

async function extractLandingPages(): Promise<LandingPageContent[]> {
  const pages = await Promise.all(
    LANDING_PAGE_TARGETS.map(async (target) => {
      const url = `${SITE_URL}${target.path}`;
      const sourceFiles = (target.sourceFallbackFiles || [])
        .map((relativePath) => path.resolve(PROJECT_ROOT, relativePath))
        .filter((filePath) => fs.existsSync(filePath));
      const sourceFallbackText = buildSourceFallbackText(target);
      const lastUpdated = getLatestTimestampForFiles(sourceFiles);
      const firecrawlData = await fetchViaFirecrawl(url, target.fallbackDescription);
      const extracted =
        firecrawlData ||
        (await fetchViaHtml(url, target.fallbackTitle, target.fallbackDescription));

      if (!extracted) {
        const fallbackText = truncateAtWordBoundary(
          sourceFallbackText,
          target.maxContentChars || sourceFallbackText.length
        );
        return {
          path: target.path,
          label: target.label,
          url,
          title: target.fallbackTitle,
          description: deriveDescription(
            fallbackText,
            target.curatedDescription || target.fallbackDescription
          ),
          snippet: buildSnippet(fallbackText),
          fullText: fallbackText,
          source: "fallback-source",
          lastUpdated,
        };
      }

      const minContentChars = target.minContentChars || 180;
      const maxContentChars = target.maxContentChars || 4200;
      let fullText = normalizeMultilineText(extracted.text);
      let sourceLabel = extracted.source;
      const hasSourceFallback = sourceFallbackText.length >= 180;

      if (target.preferSourceFallback && hasSourceFallback) {
        fullText = sourceFallbackText;
        sourceLabel = `${sourceLabel}+source-priority`;
      } else if (fullText.length < minContentChars && hasSourceFallback) {
        fullText = mergeTextBlocks(sourceFallbackText, fullText, maxContentChars);
        sourceLabel = `${sourceLabel}+source-fallback`;
      } else if (isNoisyLandingText(fullText) && hasSourceFallback) {
        fullText = sourceFallbackText;
        sourceLabel = `${sourceLabel}+source-denoise`;
      }

      fullText = cleanExtractedContent(fullText);
      fullText = truncateAtWordBoundary(fullText, maxContentChars);

      // Use curatedDescription if available (clean, hand-written summaries).
      // Fall back to auto-derived from fullText so new pages still get descriptions.
      const description =
        target.curatedDescription || deriveDescription(fullText, target.fallbackDescription);

      return {
        path: target.path,
        label: target.label,
        url,
        title: extracted.title || target.fallbackTitle,
        description,
        snippet: buildSnippet(fullText),
        fullText,
        source: sourceLabel,
        lastUpdated,
      };
    })
  );

  return pages;
}

function normalizeInlineText(value: string): string {
  return normalizeWhitespace(
    decodeHtmlEntities(
      value
        .replace(/\{" "\}/g, " ")
        .replace(/\{"\\n"\}/g, "\n")
        .replace(/\{\s*`([^`]+)`\s*\}/g, "$1")
        .replace(/\{\s*"([^"]+)"\s*\}/g, "$1")
        .replace(/\{\s*'([^']+)'\s*\}/g, "$1")
        .replace(/\{[^}]+\}/g, " ")
    )
  );
}

function convertJsxInline(nodeContent: string): string {
  let converted = nodeContent;

  converted = converted.replace(
    /<Link[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/Link>/g,
    (_, href, label) => {
      const cleanLabel = normalizeInlineText(convertJsxInline(label));
      return cleanLabel ? `[${cleanLabel}](${href})` : "";
    }
  );

  converted = converted.replace(
    /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/g,
    (_, href, label) => {
      const cleanLabel = normalizeInlineText(convertJsxInline(label));
      return cleanLabel ? `[${cleanLabel}](${href})` : "";
    }
  );

  converted = converted.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/g, (_, __, text) => {
    const clean = normalizeInlineText(convertJsxInline(text));
    return clean ? `**${clean}**` : "";
  });

  converted = converted.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/g, (_, __, text) => {
    const clean = normalizeInlineText(convertJsxInline(text));
    return clean ? `*${clean}*` : "";
  });

  converted = converted.replace(/<br\s*\/?>/gi, "\n");
  converted = converted.replace(/<[^>]+>/g, " ");

  return normalizeInlineText(converted);
}

function jsxToMarkdown(jsx: string): string {
  let content = jsx
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, " ")
    .replace(/\r/g, "")
    .replace(/\{" "\}/g, " ")
    .replace(/\{"\\n"\}/g, "\n");

  content = content.replace(/<(main|article|section|div)[^>]*>/g, "\n");
  content = content.replace(/<\/(main|article|section|div)>/g, "\n");

  const lines: string[] = [];

  for (const match of content.matchAll(/<(h[1-4]|p|li|blockquote)[^>]*>([\s\S]*?)<\/\1>/g)) {
    const [, rawTag, rawBody] = match;
    const text = convertJsxInline(rawBody);
    if (!text) continue;

    if (rawTag === "h1") {
      lines.push(`# ${text}`);
      lines.push("");
      continue;
    }

    if (rawTag === "h2") {
      lines.push(`## ${text}`);
      lines.push("");
      continue;
    }

    if (rawTag === "h3") {
      lines.push(`### ${text}`);
      lines.push("");
      continue;
    }

    if (rawTag === "h4") {
      lines.push(`#### ${text}`);
      lines.push("");
      continue;
    }

    if (rawTag === "li") {
      lines.push(`- ${text}`);
      continue;
    }

    if (rawTag === "blockquote") {
      lines.push(`> ${text}`);
      lines.push("");
      continue;
    }

    lines.push(text);
    lines.push("");
  }

  const markdown = normalizeMultilineText(lines.join("\n"));
  return markdown;
}

function extractArticleBody(
  filePath: string,
  fallbackTitle: string,
  fallbackDescription: string
): string {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const returnMatch = content.match(/return\s*\(([\s\S]*?)\)\s*;[\s\n]*}/m);

    if (!returnMatch) {
      return normalizeMultilineText(`${fallbackTitle}\n\n${fallbackDescription}`);
    }

    const markdown = jsxToMarkdown(returnMatch[1]);
    if (!markdown || markdown.length < 120) {
      return normalizeMultilineText(`${fallbackTitle}\n\n${fallbackDescription}`);
    }

    return truncateAtWordBoundary(markdown, 14000);
  } catch {
    return normalizeMultilineText(`${fallbackTitle}\n\n${fallbackDescription}`);
  }
}

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
      continue;
    }

    try {
      const content = fs.readFileSync(pagePath, "utf-8");
      const titleMatch = content.match(/title:\s*["']([^"']+)["']/);
      const descMatch = content.match(/description:\s*(?:\n\s*)?["']([^"']+)["']/);
      if (!titleMatch || !descMatch) continue;

      const relativeSourcePath = toProjectRelative(pagePath);
      const title = titleMatch[1].trim();
      const description = descMatch[1].trim();

      articles.push({
        slug,
        title,
        description,
        url: `${SITE_URL}/knowledge/${slug}`,
        category: CATEGORY_MAP[slug] || "Uncategorized",
        body: extractArticleBody(pagePath, title, description),
        sourcePath: relativeSourcePath,
        lastUpdated: getLastUpdatedForFile(pagePath),
      });
    } catch (error) {
      console.warn(`Skipping ${slug}: ${(error as Error).message}`);
    }
  }

  return articles.sort((a, b) => a.title.localeCompare(b.title));
}

async function readSdkReadme(): Promise<SdkReadmeData | null> {
  try {
    const content = fs.readFileSync(SDK_README_PATH, "utf-8");
    return {
      content,
      source: "https://github.com/show-karma/karma-gap-sdk",
      sourcePath: toProjectRelative(SDK_README_PATH),
      lastUpdated: getLastUpdatedForFile(SDK_README_PATH),
    };
  } catch {
    // Fallback to remote README when the SDK submodule is not initialized in this worktree.
  }

  try {
    const response = await fetch(SDK_README_FALLBACK_URL, {
      headers: { "User-Agent": "Karma-LLMS-Generator/1.0" },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      throw new Error(`Remote SDK README fetch failed (${response.status})`);
    }

    const content = await response.text();
    return {
      content,
      source: "https://github.com/show-karma/karma-gap-sdk",
      sourcePath: SDK_README_FALLBACK_URL,
      lastUpdated: BUILD_TIMESTAMP,
    };
  } catch (error) {
    console.warn(`SDK README unavailable, skipping SDK section: ${(error as Error).message}`);
    return null;
  }
}

function groupByCategory(articles: KnowledgeArticle[]): Record<string, KnowledgeArticle[]> {
  const grouped: Record<string, KnowledgeArticle[]> = {};
  for (const article of articles) {
    if (!grouped[article.category]) grouped[article.category] = [];
    grouped[article.category].push(article);
  }
  return grouped;
}

function getPrimaryLandingMetadata(landingPages: LandingPageContent[]): {
  title: string;
  description: string;
} {
  const homePage = landingPages.find((page) => page.path === "/");
  if (!homePage) {
    return {
      title: `${PROJECT_NAME} - LLM Index`,
      description: DEFAULT_DESCRIPTION,
    };
  }
  return {
    title: homePage.title,
    description: homePage.description || DEFAULT_DESCRIPTION,
  };
}

function sitemapUrlToLabel(url: string): string {
  try {
    const pathname = new URL(url).pathname.replace(/\/$/, "") || "/";
    if (SITEMAP_LABEL_MAP[pathname]) return SITEMAP_LABEL_MAP[pathname];
    // For /knowledge/slug paths, derive label from slug
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length > 0) {
      const slug = segments[segments.length - 1];
      return slug
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    }
    return url;
  } catch {
    return url;
  }
}

function generateSitemapSection(
  lines: string[],
  sitemapEntries: SitemapEntry[],
  options?: { excludeKnowledgeArticles?: boolean }
): void {
  lines.push("## Site URL Index");

  let filteredEntries = [...sitemapEntries];
  if (options?.excludeKnowledgeArticles) {
    filteredEntries = filteredEntries.filter((entry) => {
      try {
        const pathname = new URL(entry.url).pathname;
        // Keep /knowledge but exclude /knowledge/[slug]
        return !/^\/knowledge\/.+/.test(pathname);
      } catch {
        return true;
      }
    });
  }

  const sortedEntries = filteredEntries.sort((a, b) => {
    const priorityA = Number.parseFloat(a.priority || "0");
    const priorityB = Number.parseFloat(b.priority || "0");
    if (priorityA !== priorityB) return priorityB - priorityA;
    return a.url.localeCompare(b.url);
  });

  for (const entry of sortedEntries) {
    const label = sitemapUrlToLabel(entry.url);
    let pathname: string;
    try {
      pathname = new URL(entry.url).pathname;
    } catch {
      pathname = "";
    }
    const desc = SITEMAP_DESCRIPTION_MAP[pathname];
    lines.push(desc ? `- [${label}](${entry.url}): ${desc}` : `- [${label}](${entry.url})`);
  }
  lines.push("");
}

function generateLlmsTxt(
  articles: KnowledgeArticle[],
  landingPages: LandingPageContent[],
  sitemapEntries: SitemapEntry[]
): string {
  const lines: string[] = [];
  const primary = getPrimaryLandingMetadata(landingPages);
  const homeTarget = LANDING_PAGE_TARGETS.find((t) => t.path === "/");

  const homePage = landingPages.find((page) => page.path === "/");

  lines.push(`# ${PROJECT_NAME}`);
  lines.push("");

  // Blockquote: auto-derived from home page content
  const blockquote = homePage?.description || primary.description;
  lines.push(`> ${blockquote}`);
  lines.push("");

  // Detail section: clean narrative paragraph
  const networkNames = SUPPORTED_NETWORKS.filter((n) => !n.name.includes("testnet"))
    .map((n) => n.name)
    .join(", ");
  lines.push(
    `Karma is a platform where ecosystems allocate funding, track milestones, and measure impact, while builders share progress, earn reputation, and get discovered for more opportunities. Karma supports ${networkNames}.`
  );
  lines.push("");

  // Landing Pages: includes Funding Map and Knowledge Base (no separate Product Pages section)
  lines.push("## Landing Pages");
  for (const page of landingPages) {
    const desc = page.description ? `: ${page.description}` : "";
    lines.push(`- [${page.label}](${page.url})${desc}`);
  }
  lines.push(
    `- [Funding Map](${SITE_URL}/funding-map): Browse open funding programs across ecosystems`
  );
  lines.push(
    `- [Knowledge Base](${SITE_URL}/knowledge): Articles on grant accountability, reputation, and impact measurement`
  );
  lines.push("");

  lines.push("## Developer Docs");
  lines.push(
    `- [API Documentation](${API_DOCS_URL}): REST API docs for projects, communities, grants, and attestations`
  );
  lines.push(`- [OpenAPI JSON](${API_SPEC_URL})`);
  lines.push(
    `- [Karma GAP SDK (npm)](https://www.npmjs.com/package/@show-karma/karma-gap-sdk): TypeScript SDK`
  );
  lines.push(
    `- [Karma GAP SDK (GitHub)](https://github.com/show-karma/karma-gap-sdk): source and examples`
  );
  lines.push("");

  // Site URL Index: top-level pages only (exclude /knowledge/* articles)
  generateSitemapSection(lines, sitemapEntries, { excludeKnowledgeArticles: true });

  // Optional: flat list of KB articles (no nested categories)
  lines.push("## Optional");
  lines.push(
    `- [Complete LLM Reference](${SITE_URL}/llms-full.txt): Full inline content for all pages and articles`
  );

  const grouped = groupByCategory(articles);
  for (const category of ["Core Concepts", "Capabilities", "Project Profiles"]) {
    const categoryArticles = grouped[category] || [];
    for (const article of categoryArticles) {
      lines.push(`- [${article.title}](${article.url}): ${category} — ${article.description}`);
    }
  }
  const uncategorized = grouped["Uncategorized"] || [];
  for (const article of uncategorized) {
    lines.push(`- [${article.title}](${article.url}): ${article.description}`);
  }

  lines.push(`- [Ethereum Attestation Service](https://attest.org)`);
  lines.push(`- [Privacy Policy](${SITE_URL}/privacy-policy)`);
  lines.push(`- [Terms and Conditions](${SITE_URL}/terms-and-conditions)`);

  return lines.join("\n");
}

function generateLlmsFullTxt(
  articles: KnowledgeArticle[],
  sdkReadme: SdkReadmeData | null,
  landingPages: LandingPageContent[],
  sitemapEntries: SitemapEntry[]
): string {
  const lines: string[] = [];
  const primary = getPrimaryLandingMetadata(landingPages);
  const grouped = groupByCategory(articles);

  const homePage = landingPages.find((page) => page.path === "/");

  // --- H1 + blockquote (same as llms.txt) ---
  lines.push(`# ${PROJECT_NAME}`);
  lines.push("");
  const blockquote = homePage?.description || primary.description;
  lines.push(`> ${blockquote}`);
  lines.push("");

  // --- Detail section: clean narrative paragraph ---
  const networkNames = SUPPORTED_NETWORKS.filter((n) => !n.name.includes("testnet"))
    .map((n) => n.name)
    .join(", ");
  lines.push(
    `Karma is a platform where ecosystems allocate funding, track milestones, and measure impact, while builders share progress, earn reputation, and get discovered for more opportunities. Karma supports ${networkNames}.`
  );
  lines.push("");

  // --- Table of Contents ---
  lines.push("## Table of Contents");
  lines.push("");
  lines.push("- Landing Pages");
  lines.push("- Supported Networks");
  lines.push("- Developer Docs");
  if (sdkReadme?.content) {
    lines.push("- Karma GAP SDK Documentation");
  }
  lines.push("- Key Platform Pages");
  lines.push("- Site URL Index");
  for (const category of ["Core Concepts", "Capabilities", "Project Profiles", "Uncategorized"]) {
    const count = (grouped[category] || []).length;
    if (count === 0) continue;
    lines.push(`- Knowledge Base - ${category} (${count} articles)`);
  }
  lines.push("");

  // --- Landing Pages: full content in standard markdown ---
  lines.push("## Landing Pages");
  lines.push("");
  for (const page of landingPages) {
    lines.push(`### ${page.label}`);
    lines.push("");
    lines.push(page.fullText.trim());
    lines.push("");
  }

  // --- Supported Networks ---
  lines.push("## Supported Networks");
  lines.push("");
  for (const network of SUPPORTED_NETWORKS) {
    lines.push(`- ${network.name} (Chain ID: ${network.chainId})`);
  }
  lines.push("");

  // --- Developer Docs ---
  lines.push("## Developer Docs");
  lines.push("");
  lines.push(
    `- [API Documentation](${API_DOCS_URL}): REST API docs for projects, communities, grants, and attestations`
  );
  lines.push(`- [OpenAPI JSON](${API_SPEC_URL})`);
  lines.push(
    "- Authentication: use Privy JWT in `Authorization: Bearer <token>` for protected endpoints"
  );
  lines.push(
    "- Public reads are available for key listing endpoints (projects, communities, grants)"
  );
  lines.push(
    `- [Karma GAP SDK (npm)](https://www.npmjs.com/package/@show-karma/karma-gap-sdk): TypeScript SDK`
  );
  lines.push(
    `- [Karma GAP SDK (GitHub)](https://github.com/show-karma/karma-gap-sdk): source and examples`
  );
  lines.push("");

  // --- SDK Documentation (full content) ---
  if (sdkReadme?.content) {
    lines.push("## Karma GAP SDK Documentation");
    lines.push("");
    const downshifted = sdkReadme.content.replace(
      /^(#{1,4}) /gm,
      (_, hashes: string) => "#".repeat(hashes.length + 2) + " "
    );
    lines.push(downshifted.trim());
    lines.push("");
  }

  // --- Key Platform Pages ---
  lines.push("## Key Platform Pages");
  for (const page of STATIC_PAGES) {
    lines.push(`- [${page.title}](${SITE_URL}${page.path})`);
  }
  lines.push("");

  // --- Site URL Index ---
  generateSitemapSection(lines, sitemapEntries);

  // --- Knowledge Base: full articles (optional/secondary content) ---
  const orderedCategories = ["Core Concepts", "Capabilities", "Project Profiles", "Uncategorized"];
  for (const category of orderedCategories) {
    const categoryArticles = grouped[category] || [];
    if (categoryArticles.length === 0) continue;

    lines.push(`## Knowledge Base - ${category}`);
    lines.push("");

    for (const article of categoryArticles) {
      lines.push(`### ${article.title}`);
      lines.push("");
      if (article.description) {
        lines.push(article.description);
        lines.push("");
      }
      if (article.body) {
        // Strip any leading H1 that duplicates the title we just wrote
        let body = article.body.trim();
        const h1Match = body.match(/^#\s+(.+)\n*/);
        if (h1Match && h1Match[1].trim() === article.title.trim()) {
          body = body.slice(h1Match[0].length).trim();
        }
        // Downshift headings: articles are at H3 level, so their internal
        // ## headings become #### to maintain proper nesting
        body = body.replace(
          /^(#{1,4}) /gm,
          (_, hashes: string) => "#".repeat(Math.min(hashes.length + 2, 6)) + " "
        );
        lines.push(body);
        lines.push("");
      }
    }
  }

  return lines.join("\n");
}

async function main() {
  console.log("Generating llms.txt and llms-full.txt...");

  const articles = extractKnowledgeArticles();
  const landingPages = await extractLandingPages();
  const sitemapEntries = await fetchSitemapEntries();
  const sdkReadme = await readSdkReadme();

  console.log(`Found ${articles.length} knowledge articles`);
  console.log(`Landing pages extracted: ${landingPages.length}`);
  console.log(`Sitemap entries: ${sitemapEntries.length}`);
  console.log(`Landing extraction sources: ${landingPages.map((page) => page.source).join(", ")}`);
  console.log(`SDK README: ${sdkReadme?.content ? "loaded" : "skipped"}`);

  const llmsTxt = generateLlmsTxt(articles, landingPages, sitemapEntries);
  const llmsFullTxt = generateLlmsFullTxt(articles, sdkReadme, landingPages, sitemapEntries);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUTPUT_DIR, "llms.txt"), llmsTxt, "utf-8");
  fs.writeFileSync(path.join(OUTPUT_DIR, "llms-full.txt"), llmsFullTxt, "utf-8");

  console.log(
    `Written public/llms.txt (${llmsTxt.length} chars, ~${Math.round(llmsTxt.length / 4)} tokens)`
  );
  console.log(
    `Written public/llms-full.txt (${llmsFullTxt.length} chars, ~${Math.round(llmsFullTxt.length / 4)} tokens)`
  );

  // Generate static .md files for landing pages and knowledge articles
  generateMarkdownFiles(landingPages, articles);
}

function sentenceOverlap(a: string, b: string): number {
  const wa = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
  const wb = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));
  if (wa.size === 0 || wb.size === 0) return 0;
  const intersection = [...wa].filter((w) => wb.has(w));
  return intersection.length / Math.min(wa.size, wb.size);
}

function generateMarkdownFiles(
  landingPages: LandingPageContent[],
  articles: KnowledgeArticle[]
): void {
  const knowledgeDir = path.join(OUTPUT_DIR, "knowledge");
  fs.mkdirSync(knowledgeDir, { recursive: true });

  let mdCount = 0;

  // Landing page .md files
  for (const page of landingPages) {
    const filename = page.path === "/" ? "index.html.md" : `${page.path.replace(/^\//, "")}.md`;

    // Strip leading lines of fullText that closely overlap with the description
    // to avoid near-duplicate lead paragraphs
    let body = page.fullText.trim();
    let stripped = true;
    while (stripped) {
      stripped = false;
      const firstLine = body.split("\n")[0];
      if (firstLine && sentenceOverlap(page.description, firstLine) >= 0.5) {
        body = body.slice(firstLine.length).trim();
        stripped = true;
      }
    }

    const content = `# ${page.title}\n\n${page.description}\n\n${body}\n`;
    fs.writeFileSync(path.join(OUTPUT_DIR, filename), content, "utf-8");
    mdCount++;
  }

  // Knowledge base article .md files
  for (const article of articles) {
    const content = `# ${article.title}\n\n${article.description}\n\n${article.body.trim()}\n`;
    fs.writeFileSync(path.join(knowledgeDir, `${article.slug}.md`), content, "utf-8");
    mdCount++;
  }

  console.log(`Written ${mdCount} .md files to public/`);
}

// --- Exports for testing ---
export {
  BOILERPLATE_LINE_PATTERNS,
  SITEMAP_LABEL_MAP,
  SITEMAP_DESCRIPTION_MAP,
  PROJECT_NAME,
  SITE_URL,
  SUPPORTED_NETWORKS,
  normalizeWhitespace,
  normalizeMultilineText,
  truncateAtWordBoundary,
  decodeHtmlEntities,
  markdownToPlainText,
  findMetaContent,
  extractTitleFromHtml,
  extractMainHtml,
  htmlToPlainText,
  deriveDescription,
  cleanPageTitle,
  buildSnippet,
  isMeaningfulTextCandidate,
  dedupeLines,
  isPersonNameLine,
  isJobTitleLine,
  isPricingLine,
  detectBlockSkip,
  isStatLabelLine,
  isStatLabelBlock,
  cleanExtractedContent,
  isNoisyLandingText,
  sentenceOverlap,
  sitemapUrlToLabel,
  generateSitemapSection,
  generateLlmsTxt,
  generateLlmsFullTxt,
  groupByCategory,
  getPrimaryLandingMetadata,
  mergeTextBlocks,
};

export type { KnowledgeArticle, LandingPageContent, SitemapEntry, SdkReadmeData };

if (require.main === module) {
  main().catch((error) => {
    console.error("Failed to generate llms documents:", error);
    process.exit(1);
  });
}
