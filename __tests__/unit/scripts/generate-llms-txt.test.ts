import type {
  DocsPage,
  KnowledgeArticle,
  LandingPageContent,
  SdkReadmeData,
  SitemapEntry,
} from "../../../scripts/generate-llms-txt";
import {
  BOILERPLATE_LINE_PATTERNS,
  buildSnippet,
  categorizeDocsPage,
  cleanDocsMarkdown,
  cleanExtractedContent,
  cleanPageTitle,
  DOCS_CATEGORY_ORDER,
  DOCS_SITE_URL,
  decodeHtmlEntities,
  dedupeLines,
  deriveDescription,
  detectBlockSkip,
  docsPageTitle,
  extractMainHtml,
  extractTitleFromHtml,
  findMetaContent,
  generateLlmsFullTxt,
  generateLlmsTxt,
  generateSitemapSection,
  getPrimaryLandingMetadata,
  groupByCategory,
  groupDocsByCategory,
  htmlToPlainText,
  isJobTitleLine,
  isMeaningfulTextCandidate,
  isNoisyLandingText,
  isPersonNameLine,
  isPricingLine,
  isStatLabelBlock,
  isStatLabelLine,
  markdownToPlainText,
  mergeTextBlocks,
  normalizeMultilineText,
  normalizeWhitespace,
  PROJECT_NAME,
  SITE_URL,
  SITEMAP_DESCRIPTION_MAP,
  SITEMAP_LABEL_MAP,
  sentenceOverlap,
  sitemapUrlToLabel,
  truncateAtWordBoundary,
  validateDocsDescription,
} from "../../../scripts/generate-llms-txt";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeLandingPage(overrides: Partial<LandingPageContent> = {}): LandingPageContent {
  return {
    path: "/",
    label: "Home",
    url: "https://karmahq.xyz/",
    title: "Karma - Where builders get funded",
    description: "Ecosystems use Karma to fund projects transparently.",
    snippet: "Ecosystems use Karma to fund projects.",
    fullText: "Ecosystems use Karma to fund projects transparently. Builders share progress.",
    source: "firecrawl",
    lastUpdated: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeArticle(overrides: Partial<KnowledgeArticle> = {}): KnowledgeArticle {
  return {
    slug: "grant-accountability",
    title: "What Is Grant Accountability in Web3?",
    description: "Grant accountability turns funding promises into persistent execution history.",
    url: "https://karmahq.xyz/knowledge/grant-accountability",
    category: "Core Concepts",
    body: "Grant accountability is the practice of tracking funded work.",
    sourcePath: "app/knowledge/grant-accountability/page.tsx",
    lastUpdated: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeSitemapEntry(overrides: Partial<SitemapEntry> = {}): SitemapEntry {
  return {
    url: "https://karmahq.xyz",
    lastModified: "2024-01-01",
    changeFrequency: "weekly",
    priority: "1.0",
    ...overrides,
  };
}

function makeDocsPage(overrides: Partial<DocsPage> = {}): DocsPage {
  return {
    path: "/overview/how-does-it-work",
    url: "https://docs.gap.karmahq.xyz/overview/how-does-it-work",
    title: "How Does It Work",
    description:
      "Every team maintains a project profile on Karma containing comprehensive information.",
    fullText:
      "# How Does It Work\n\nEvery team maintains a project profile on Karma containing comprehensive information about their work.",
    category: "Overview",
    source: "firecrawl",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// normalizeWhitespace
// ---------------------------------------------------------------------------

describe("normalizeWhitespace", () => {
  it("collapses multiple spaces", () => {
    expect(normalizeWhitespace("hello   world")).toBe("hello world");
  });

  it("replaces tabs with spaces", () => {
    expect(normalizeWhitespace("hello\tworld")).toBe("hello world");
  });

  it("removes carriage returns", () => {
    expect(normalizeWhitespace("hello\r\nworld")).toBe("hello\nworld");
  });

  it("trims leading and trailing whitespace", () => {
    expect(normalizeWhitespace("  hello  ")).toBe("hello");
  });
});

// ---------------------------------------------------------------------------
// normalizeMultilineText
// ---------------------------------------------------------------------------

describe("normalizeMultilineText", () => {
  it("removes empty lines", () => {
    expect(normalizeMultilineText("hello\n\n\nworld")).toBe("hello\nworld");
  });

  it("removes consecutive duplicate lines", () => {
    expect(normalizeMultilineText("hello\nhello\nworld")).toBe("hello\nworld");
  });

  it("removes boilerplate lines", () => {
    expect(normalizeMultilineText("hello\nSign In\nworld")).toBe("hello\nworld");
  });

  it("removes mostly-numeric standalone lines", () => {
    expect(normalizeMultilineText("hello\n$42,000\nworld")).toBe("hello\nworld");
  });

  it("removes lines repeated more than twice with ≤2 words", () => {
    const input = "content\nLearn More\nstuff\nLearn More\nmore\nLearn More\nend";
    // "Learn More" appears 3 times and is ≤2 words, so it's filtered as boilerplate + repeat
    expect(normalizeMultilineText(input)).not.toContain("Learn More");
  });
});

// ---------------------------------------------------------------------------
// BOILERPLATE_LINE_PATTERNS
// ---------------------------------------------------------------------------

describe("BOILERPLATE_LINE_PATTERNS", () => {
  const shouldMatch = [
    "Sign In",
    "Contact Sales",
    "Get Started",
    "Learn More",
    "Ready to get started?",
    "Still have questions?",
    "Grow your ecosystem with our tools",
    "Step 1",
    "Step 3",
    "Most Popular",
    "Ecosystems Supported",
    "Projects Tracked",
    "Starter",
    "Enterprise",
    "4.5x faster",
    "4k+ projects",
    "AB", // two-char design fragment
  ];

  const shouldNotMatch = [
    "Ecosystems use Karma to fund projects transparently.",
    "Grant accountability turns funding promises into persistent execution history.",
    "Track project metrics automatically through GitHub and Dune.",
    "A public registry of every project in your ecosystem.",
  ];

  for (const line of shouldMatch) {
    it(`matches boilerplate: "${line}"`, () => {
      const matches = BOILERPLATE_LINE_PATTERNS.some((re) => re.test(line));
      expect(matches).toBe(true);
    });
  }

  for (const line of shouldNotMatch) {
    it(`does not match content: "${line.slice(0, 50)}..."`, () => {
      const matches = BOILERPLATE_LINE_PATTERNS.some((re) => re.test(line));
      expect(matches).toBe(false);
    });
  }
});

// ---------------------------------------------------------------------------
// truncateAtWordBoundary
// ---------------------------------------------------------------------------

describe("truncateAtWordBoundary", () => {
  it("returns text unchanged when under limit", () => {
    expect(truncateAtWordBoundary("short text", 100)).toBe("short text");
  });

  it("truncates at a word boundary", () => {
    const result = truncateAtWordBoundary("hello world this is a longer text", 16);
    expect(result).toBe("hello world...");
  });

  it("appends ellipsis", () => {
    const result = truncateAtWordBoundary("a".repeat(200), 50);
    expect(result).toMatch(/\.\.\.$/);
  });
});

// ---------------------------------------------------------------------------
// decodeHtmlEntities
// ---------------------------------------------------------------------------

describe("decodeHtmlEntities", () => {
  it("decodes common named entities", () => {
    expect(decodeHtmlEntities("&amp;&lt;&gt;&quot;")).toBe('&<>"');
  });

  it("decodes hex entities", () => {
    expect(decodeHtmlEntities("&#x41;")).toBe("A");
  });

  it("decodes decimal entities", () => {
    expect(decodeHtmlEntities("&#65;")).toBe("A");
  });

  it("decodes &nbsp; to space", () => {
    expect(decodeHtmlEntities("hello&nbsp;world")).toBe("hello world");
  });

  it("decodes &mdash; and &ndash; to hyphens", () => {
    expect(decodeHtmlEntities("a&mdash;b&ndash;c")).toBe("a-b-c");
  });
});

// ---------------------------------------------------------------------------
// markdownToPlainText
// ---------------------------------------------------------------------------

describe("markdownToPlainText", () => {
  it("strips markdown headings", () => {
    const result = markdownToPlainText("# Title\n\nSome content here for testing.");
    expect(result).not.toContain("#");
    expect(result).toContain("Title");
  });

  it("converts links to plain text", () => {
    const result = markdownToPlainText("Check [this link](https://example.com) now for details.");
    expect(result).toContain("this link");
    expect(result).not.toContain("https://example.com");
  });

  it("strips bold and italic", () => {
    const result = markdownToPlainText("This is **bold** and *italic* text in this sentence.");
    expect(result).toContain("bold");
    expect(result).toContain("italic");
    expect(result).not.toContain("*");
  });

  it("strips code blocks", () => {
    const result = markdownToPlainText("Before\n```\ncode here\n```\nAfter this block of content.");
    expect(result).not.toContain("code here");
    expect(result).toContain("After this block of content.");
  });

  it("strips image references", () => {
    const result = markdownToPlainText("See ![alt text](image.png) in this document here.");
    expect(result).not.toContain("image.png");
  });
});

// ---------------------------------------------------------------------------
// findMetaContent / extractTitleFromHtml / extractMainHtml
// ---------------------------------------------------------------------------

describe("findMetaContent", () => {
  it("extracts meta description by name", () => {
    const html = '<meta name="description" content="Test description">';
    expect(findMetaContent(html, "name", "description")).toBe("Test description");
  });

  it("extracts og:description by property", () => {
    const html = '<meta property="og:description" content="OG desc">';
    expect(findMetaContent(html, "property", "og:description")).toBe("OG desc");
  });

  it("returns null when not found", () => {
    expect(findMetaContent("<html></html>", "name", "description")).toBeNull();
  });
});

describe("extractTitleFromHtml", () => {
  it("extracts the title tag", () => {
    expect(extractTitleFromHtml("<title>My Page</title>")).toBe("My Page");
  });

  it("returns null when no title", () => {
    expect(extractTitleFromHtml("<html><body></body></html>")).toBeNull();
  });
});

describe("extractMainHtml", () => {
  it("extracts content from <main> tag", () => {
    const html = "<body><nav>nav</nav><main><p>Main content</p></main></body>";
    const result = extractMainHtml(html);
    expect(result).toContain("Main content");
    expect(result).not.toContain("nav");
  });

  it("falls back to body when no main tag", () => {
    const html = "<body><p>Body content</p></body>";
    expect(extractMainHtml(html)).toContain("Body content");
  });

  it("strips script and style tags", () => {
    const html = "<body><script>alert(1)</script><style>.x{}</style><p>Clean</p></body>";
    const result = extractMainHtml(html);
    expect(result).not.toContain("alert");
    expect(result).not.toContain(".x{}");
    expect(result).toContain("Clean");
  });
});

describe("htmlToPlainText", () => {
  it("converts HTML elements to text", () => {
    const result = htmlToPlainText("<h1>Title</h1><p>Paragraph of text with some content.</p>");
    expect(result).toContain("Title");
    expect(result).toContain("Paragraph of text with some content.");
  });

  it("converts list items", () => {
    const result = htmlToPlainText(
      "<ul><li>First item in the list here</li><li>Second item in the list here</li></ul>"
    );
    expect(result).toContain("First item in the list here");
  });
});

// ---------------------------------------------------------------------------
// deriveDescription
// ---------------------------------------------------------------------------

describe("deriveDescription", () => {
  it("extracts the first sentence ending with punctuation", () => {
    // First sentence is >100 chars so deriveDescription returns only it (no combining)
    const text =
      "Karma is a platform for builders and ecosystems that enables funding programs to track outcomes and measure real-world impact. This second sentence adds extra.";
    const result = deriveDescription(text, "fallback");
    expect(result).toBe(
      "Karma is a platform for builders and ecosystems that enables funding programs to track outcomes and measure real-world impact."
    );
  });

  it("combines two short sentences when first is under 100 chars", () => {
    const text = "Short first sentence here. And a second one here too.";
    const result = deriveDescription(text, "fallback");
    expect(result).toBe("Short first sentence here. And a second one here too.");
  });

  it("falls back when no sentence matches", () => {
    const result = deriveDescription("no punctuation", "my fallback");
    expect(result).toBe("my fallback");
  });

  it("does not exceed 240 chars when combining", () => {
    const text = `${"A".repeat(95)}. ${"B".repeat(150)}.`;
    const result = deriveDescription(text, "fallback");
    expect(result.length).toBeLessThanOrEqual(240);
  });
});

// ---------------------------------------------------------------------------
// cleanPageTitle
// ---------------------------------------------------------------------------

describe("cleanPageTitle", () => {
  it("strips ' | Karma' suffix", () => {
    expect(cleanPageTitle("My Page | Karma")).toBe("My Page");
  });

  it("leaves titles without suffix unchanged", () => {
    expect(cleanPageTitle("My Page")).toBe("My Page");
  });
});

// ---------------------------------------------------------------------------
// buildSnippet
// ---------------------------------------------------------------------------

describe("buildSnippet", () => {
  it("builds a snippet from long lines", () => {
    const text = "This is a long enough line for snippet.\nAnother long line with enough content.";
    const result = buildSnippet(text);
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThanOrEqual(700);
  });

  it("truncates to 700 chars max", () => {
    const text = Array(20)
      .fill("This is a long line with plenty of content for testing purposes.")
      .join("\n");
    const result = buildSnippet(text);
    expect(result.length).toBeLessThanOrEqual(703); // 700 + "..."
  });
});

// ---------------------------------------------------------------------------
// isMeaningfulTextCandidate
// ---------------------------------------------------------------------------

describe("isMeaningfulTextCandidate", () => {
  it("accepts a normal descriptive sentence", () => {
    expect(
      isMeaningfulTextCandidate(
        "Track project progress in real-time as grantees submit milestones."
      )
    ).toBe(true);
  });

  it("rejects short lines", () => {
    expect(isMeaningfulTextCandidate("short")).toBe(false);
  });

  it("rejects lines with JSX/code patterns", () => {
    expect(isMeaningfulTextCandidate("const result = useState(false)")).toBe(false);
  });

  it("rejects lines with URLs", () => {
    expect(isMeaningfulTextCandidate("Visit https://example.com for details on this.")).toBe(false);
  });

  it("rejects lines with Tailwind utility classes", () => {
    expect(isMeaningfulTextCandidate("flex items-center gap-2 text-blue-500")).toBe(false);
  });

  it("rejects boilerplate lines", () => {
    expect(isMeaningfulTextCandidate("Ready to get started?")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// dedupeLines
// ---------------------------------------------------------------------------

describe("dedupeLines", () => {
  it("removes exact duplicates", () => {
    const result = dedupeLines(["hello", "hello", "world"]);
    expect(result).toEqual(["hello", "world"]);
  });

  it("removes near-duplicates where one contains the other as substring", () => {
    // dedupeLines uses `includes()` — the longer line must literally contain the shorter
    const short = "Karma is a platform for builders and ecosystems";
    const long = "Karma is a platform for builders and ecosystems that enables funding programs";
    const result = dedupeLines([short, long]);
    expect(result).toHaveLength(1);
    // Keeps the longer one
    expect(result[0]).toBe(long);
  });

  it("keeps distinct lines", () => {
    const result = dedupeLines(["apples are red fruit", "bananas are yellow fruit"]);
    expect(result).toHaveLength(2);
  });

  it("strips empty/whitespace-only lines", () => {
    const result = dedupeLines(["hello", "  ", "", "world"]);
    expect(result).toEqual(["hello", "world"]);
  });
});

// ---------------------------------------------------------------------------
// isPersonNameLine / isJobTitleLine / isPricingLine
// ---------------------------------------------------------------------------

describe("isPersonNameLine", () => {
  it("matches 'John Smith'", () => {
    expect(isPersonNameLine("John Smith")).toBe(true);
  });

  it("matches 'Sarah Jane Lee'", () => {
    expect(isPersonNameLine("Sarah Jane Lee")).toBe(true);
  });

  it("rejects long sentences", () => {
    expect(isPersonNameLine("This is definitely not a person name")).toBe(false);
  });

  it("rejects lines ending with punctuation", () => {
    expect(isPersonNameLine("John Smith.")).toBe(false);
  });

  it("rejects lowercase starts", () => {
    expect(isPersonNameLine("john smith")).toBe(false);
  });
});

describe("isJobTitleLine", () => {
  it("matches 'CEO at Company'", () => {
    expect(isJobTitleLine("CEO at Company")).toBe(true);
  });

  it("matches 'Grants Council Lead'", () => {
    expect(isJobTitleLine("Grants Council Lead")).toBe(true);
  });

  it("matches 'Co-Founder'", () => {
    expect(isJobTitleLine("Co-Founder")).toBe(true);
  });

  it("rejects unrelated text", () => {
    expect(isJobTitleLine("Track milestones")).toBe(false);
  });
});

describe("isPricingLine", () => {
  it("matches 'Track up to 50 projects'", () => {
    expect(isPricingLine("Track up to 50 projects")).toBe(true);
  });

  it("matches 'Email support'", () => {
    expect(isPricingLine("Email support")).toBe(true);
  });

  it("matches 'Full API access'", () => {
    expect(isPricingLine("Full API access")).toBe(true);
  });

  it("matches 'Unlimited grants'", () => {
    expect(isPricingLine("Unlimited grants")).toBe(true);
  });

  it("rejects normal content", () => {
    expect(isPricingLine("Track project metrics automatically through GitHub.")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// detectBlockSkip
// ---------------------------------------------------------------------------

describe("detectBlockSkip", () => {
  it("skips live funding opportunities block", () => {
    const lines = [
      "Live Funding Opportunities",
      "Optimism Grants Round 4",
      "ends Dec 15",
      "3 grants available",
      "This is a real sentence that continues the discussion of grant milestones.",
    ];
    const skip = detectBlockSkip(lines, 0);
    expect(skip).toBe(4);
  });

  it("skips testimonial block with orphan quote", () => {
    const lines = [
      "\u201C",
      "Karma transformed our grant tracking.",
      "John Smith",
      "CEO at Company",
      "Next section content.",
    ];
    const skip = detectBlockSkip(lines, 0);
    expect(skip).toBe(4);
  });

  it("skips person name + job title pair", () => {
    const lines = ["John Smith", "Director of Grants"];
    const skip = detectBlockSkip(lines, 0);
    expect(skip).toBe(2);
  });

  it("skips pricing block triggered by 'Our Offering'", () => {
    const lines = [
      "Our Offering",
      "Starter",
      "Track up to 50 projects",
      "Email support",
      "Pro",
      "A real long sentence about something unrelated to pricing tables.",
    ];
    const skip = detectBlockSkip(lines, 0);
    expect(skip).toBeGreaterThanOrEqual(4);
  });

  it("returns 0 for normal content lines", () => {
    const lines = ["Karma is a platform for builders and ecosystems."];
    expect(detectBlockSkip(lines, 0)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// isStatLabelLine / isStatLabelBlock
// ---------------------------------------------------------------------------

describe("isStatLabelLine", () => {
  it("matches a 30-120 char line without terminal punctuation", () => {
    expect(isStatLabelLine("Builders using Karma to share progress, milestones, and impact")).toBe(
      true
    );
  });

  it("rejects lines ending with period", () => {
    expect(isStatLabelLine("This is a sentence that ends with a period.")).toBe(false);
  });

  it("rejects lines shorter than 30 chars", () => {
    expect(isStatLabelLine("Short line")).toBe(false);
  });

  it("rejects headings starting with #", () => {
    expect(isStatLabelLine("# This is a heading without punctuation")).toBe(false);
  });
});

describe("isStatLabelBlock", () => {
  it("returns true for 3+ consecutive stat label lines", () => {
    const lines = [
      "From Optimism to Celo, we've helped leading ecosystems",
      "Builders using Karma to share progress, milestones, and impact",
      "Verified milestones, endorsements, and evaluations across programs",
    ];
    expect(isStatLabelBlock(lines, 0)).toBe(true);
    expect(isStatLabelBlock(lines, 1)).toBe(true);
    expect(isStatLabelBlock(lines, 2)).toBe(true);
  });

  it("returns false for isolated stat label lines", () => {
    const lines = [
      "Builders using Karma to share progress, milestones, and impact",
      "This is a real sentence that ends with a period.",
      "Another regular sentence with proper punctuation.",
    ];
    expect(isStatLabelBlock(lines, 0)).toBe(false);
  });

  it("returns false for lines that are not stat labels", () => {
    const lines = ["Short.", "Also short.", "Tiny."];
    expect(isStatLabelBlock(lines, 0)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// cleanExtractedContent
// ---------------------------------------------------------------------------

describe("cleanExtractedContent", () => {
  it("truncates at FAQ section", () => {
    const input =
      "Real content about grants.\nMore content.\nFrequently Asked Questions\nWhat is Karma?\nHow does it work?";
    const result = cleanExtractedContent(input);
    expect(result).toContain("Real content");
    expect(result).not.toContain("What is Karma?");
  });

  it("removes orphan single-char lines", () => {
    const input = "Content before.\nA\nContent after this line.";
    const result = cleanExtractedContent(input);
    expect(result).toContain("Content before.");
    expect(result).toContain("Content after this line.");
    expect(result).not.toMatch(/^A$/m);
  });

  it("removes orphan curly quote marks", () => {
    const input = "Content before.\n\u201C\nContent after this line.";
    const result = cleanExtractedContent(input);
    expect(result).not.toMatch(/^\u201C$/m);
  });

  it("removes stat callout lines", () => {
    const input = "Real content here.\n3,600+ milestones completed\nMore real content here.";
    const result = cleanExtractedContent(input);
    expect(result).not.toContain("3,600+");
  });

  it("removes consecutive stat label blocks", () => {
    const input = [
      "Real content before this section.",
      "From Optimism to Celo, we've helped leading ecosystems",
      "Builders using Karma to share progress, milestones, and impact",
      "Verified milestones, endorsements, and evaluations across programs",
      "Real content after this section.",
    ].join("\n");
    const result = cleanExtractedContent(input);
    expect(result).toContain("Real content before");
    expect(result).toContain("Real content after");
    expect(result).not.toContain("Builders using Karma to share");
  });

  it("deduplicates near-identical lines", () => {
    const input = [
      "Karma is a platform where ecosystems allocate funding track milestones and measure impact.",
      "Karma is a platform where ecosystems allocate funding track milestones and measure real impact.",
    ].join("\n");
    const result = cleanExtractedContent(input);
    const lines = result.split("\n").filter(Boolean);
    expect(lines).toHaveLength(1);
  });

  it("preserves legitimate diverse content", () => {
    const input = [
      "Grant accountability turns funding promises into execution history.",
      "Ecosystems track milestones through public registries.",
      "Builders earn reputation by documenting progress.",
    ].join("\n");
    const result = cleanExtractedContent(input);
    expect(result).toContain("Grant accountability");
    expect(result).toContain("Ecosystems track");
    expect(result).toContain("Builders earn");
  });

  it("removes short standalone fragment lines", () => {
    const input = "Real content here.\nOne profile\nMore content.";
    const result = cleanExtractedContent(input);
    expect(result).not.toContain("One profile");
  });
});

// ---------------------------------------------------------------------------
// isNoisyLandingText
// ---------------------------------------------------------------------------

describe("isNoisyLandingText", () => {
  it("detects noisy text with multiple noise patterns", () => {
    const noisy = "created on Oct 15, 2024\nsort by\n1,000 projects found\nwallet · privy";
    expect(isNoisyLandingText(noisy)).toBe(true);
  });

  it("detects text with too many lines", () => {
    const lines = Array(150).fill("line of content").join("\n");
    expect(isNoisyLandingText(lines)).toBe(true);
  });

  it("accepts clean text", () => {
    const clean =
      "Karma is a platform for builders and ecosystems.\nTrack milestones and measure impact.";
    expect(isNoisyLandingText(clean)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// sentenceOverlap
// ---------------------------------------------------------------------------

describe("sentenceOverlap", () => {
  it("returns 1.0 for identical sentences", () => {
    expect(sentenceOverlap("hello world", "hello world")).toBe(1.0);
  });

  it("returns high overlap for near-identical sentences", () => {
    const a = "Ecosystems use Karma to fund projects transparently.";
    const b = "Ecosystems use Karma to fund projects transparently for more opportunities.";
    expect(sentenceOverlap(a, b)).toBeGreaterThan(0.8);
  });

  it("returns low overlap for different sentences", () => {
    const a = "Ecosystems use Karma to fund projects transparently.";
    const b = "Grant accountability is the practice of tracking funded work.";
    expect(sentenceOverlap(a, b)).toBeLessThan(0.4);
  });

  it("returns 0 for empty strings", () => {
    expect(sentenceOverlap("", "hello world")).toBe(0);
    expect(sentenceOverlap("hello world", "")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// sitemapUrlToLabel
// ---------------------------------------------------------------------------

describe("sitemapUrlToLabel", () => {
  it("maps known URLs to labels", () => {
    expect(sitemapUrlToLabel("https://karmahq.xyz/")).toBe("Home");
    expect(sitemapUrlToLabel("https://karmahq.xyz/funders")).toBe("For Funders");
    expect(sitemapUrlToLabel("https://karmahq.xyz/projects")).toBe("Projects");
  });

  it("derives label from knowledge article slug", () => {
    const result = sitemapUrlToLabel("https://karmahq.xyz/knowledge/grant-accountability");
    expect(result).toBe("Grant Accountability");
  });

  it("handles unknown paths by capitalizing slug", () => {
    const result = sitemapUrlToLabel("https://karmahq.xyz/some-new-page");
    expect(result).toBe("Some New Page");
  });
});

// ---------------------------------------------------------------------------
// groupByCategory
// ---------------------------------------------------------------------------

describe("groupByCategory", () => {
  it("groups articles by their category", () => {
    const articles = [
      makeArticle({ slug: "a1", category: "Core Concepts" }),
      makeArticle({ slug: "a2", category: "Capabilities" }),
      makeArticle({ slug: "a3", category: "Core Concepts" }),
    ];
    const grouped = groupByCategory(articles);
    expect(grouped["Core Concepts"]).toHaveLength(2);
    expect(grouped["Capabilities"]).toHaveLength(1);
  });

  it("returns empty object for empty array", () => {
    expect(groupByCategory([])).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// getPrimaryLandingMetadata
// ---------------------------------------------------------------------------

describe("getPrimaryLandingMetadata", () => {
  it("returns home page metadata when available", () => {
    const pages = [makeLandingPage({ path: "/", title: "Karma Home", description: "Home desc" })];
    const result = getPrimaryLandingMetadata(pages);
    expect(result.title).toBe("Karma Home");
    expect(result.description).toBe("Home desc");
  });

  it("returns fallback when no home page", () => {
    const pages = [makeLandingPage({ path: "/funders" })];
    const result = getPrimaryLandingMetadata(pages);
    expect(result.title).toContain("Karma");
  });
});

// ---------------------------------------------------------------------------
// mergeTextBlocks
// ---------------------------------------------------------------------------

describe("mergeTextBlocks", () => {
  it("merges and deduplicates two text blocks", () => {
    const result = mergeTextBlocks(
      "Karma helps ecosystems fund projects with transparency.",
      "Karma helps ecosystems fund projects with transparency.\nBuilders track milestones.",
      2000
    );
    // Should have both unique sentences but not duplicate
    expect(result).toContain("Builders track milestones.");
    const karmaCount = (result.match(/Karma helps/g) || []).length;
    expect(karmaCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// generateSitemapSection
// ---------------------------------------------------------------------------

describe("generateSitemapSection", () => {
  it("generates Site URL Index header", () => {
    const lines: string[] = [];
    generateSitemapSection(lines, [makeSitemapEntry()]);
    expect(lines[0]).toBe("## Site URL Index");
  });

  it("includes descriptions from SITEMAP_DESCRIPTION_MAP", () => {
    const lines: string[] = [];
    const entries = [makeSitemapEntry({ url: "https://karmahq.xyz/projects", priority: "0.8" })];
    generateSitemapSection(lines, entries);
    const projectLine = lines.find((l) => l.includes("/projects"));
    expect(projectLine).toContain("Discover projects with verified milestones");
  });

  it("excludes knowledge articles when option is set", () => {
    const lines: string[] = [];
    const entries = [
      makeSitemapEntry({ url: "https://karmahq.xyz/projects" }),
      makeSitemapEntry({ url: "https://karmahq.xyz/knowledge" }),
      makeSitemapEntry({ url: "https://karmahq.xyz/knowledge/grant-accountability" }),
    ];
    generateSitemapSection(lines, entries, { excludeKnowledgeArticles: true });
    const content = lines.join("\n");
    expect(content).toContain("/knowledge");
    expect(content).not.toContain("/knowledge/grant-accountability");
  });

  it("includes knowledge articles by default", () => {
    const lines: string[] = [];
    const entries = [
      makeSitemapEntry({ url: "https://karmahq.xyz/knowledge/grant-accountability" }),
    ];
    generateSitemapSection(lines, entries);
    expect(lines.join("\n")).toContain("/knowledge/grant-accountability");
  });

  it("sorts by priority descending then alphabetically", () => {
    const lines: string[] = [];
    const entries = [
      makeSitemapEntry({ url: "https://karmahq.xyz/b-page", priority: "0.5" }),
      makeSitemapEntry({ url: "https://karmahq.xyz/a-page", priority: "1.0" }),
    ];
    generateSitemapSection(lines, entries);
    const urlLines = lines.filter((l) => l.startsWith("- ["));
    expect(urlLines[0]).toContain("a-page");
    expect(urlLines[1]).toContain("b-page");
  });
});

// ---------------------------------------------------------------------------
// generateLlmsTxt — llms.txt spec compliance
// ---------------------------------------------------------------------------

describe("generateLlmsTxt", () => {
  const articles = [
    makeArticle({ category: "Core Concepts" }),
    makeArticle({
      slug: "ai-eval",
      title: "AI Evaluation",
      category: "Capabilities",
      description: "AI grant eval.",
    }),
  ];
  const landingPages = [
    makeLandingPage({ path: "/", label: "Home" }),
    makeLandingPage({
      path: "/funders",
      label: "For Funders",
      url: "https://karmahq.xyz/funders",
      description: "Funder tools.",
    }),
  ];
  const sitemapEntries = [
    makeSitemapEntry({ url: "https://karmahq.xyz" }),
    makeSitemapEntry({ url: "https://karmahq.xyz/funders" }),
  ];

  let output: string;

  beforeAll(() => {
    output = generateLlmsTxt(articles, landingPages, sitemapEntries, []);
  });

  it("starts with H1 using PROJECT_NAME only", () => {
    const firstLine = output.split("\n")[0];
    expect(firstLine).toBe(`# ${PROJECT_NAME}`);
  });

  it("has a blockquote on line 3", () => {
    const lines = output.split("\n");
    expect(lines[2]).toMatch(/^> .+/);
  });

  it("has a detail section paragraph (no heading)", () => {
    const lines = output.split("\n");
    // Line after blockquote and blank
    expect(lines[4]).toMatch(/^Karma is a platform/);
    expect(lines[4]).not.toMatch(/^#/);
  });

  it("includes supported network names in detail section", () => {
    expect(output).toContain("Optimism");
    expect(output).toContain("Arbitrum One");
    expect(output).toContain("Celo");
    expect(output).not.toContain("testnet");
  });

  it("has ## Landing Pages section", () => {
    expect(output).toContain("## Landing Pages");
  });

  it("has ## Developer Docs section", () => {
    expect(output).toContain("## Developer Docs");
  });

  it("has ## Site URL Index section with descriptions", () => {
    expect(output).toContain("## Site URL Index");
    // Site URL entries should have descriptions from SITEMAP_DESCRIPTION_MAP
    const siteUrlSection = output.split("## Site URL Index")[1].split("## ")[0];
    expect(siteUrlSection).toContain(":");
  });

  it("has ## Optional section", () => {
    expect(output).toContain("## Optional");
  });

  it("links to llms-full.txt in Optional", () => {
    expect(output).toContain("llms-full.txt");
  });

  it("uses flat list format in Optional (no nested lists)", () => {
    const optionalSection = output.split("## Optional")[1] || "";
    const lines = optionalSection.split("\n").filter((l) => l.trim().length > 0);
    for (const line of lines) {
      // Every item should start with "- [" (flat link) not "  - [" (nested)
      if (line.startsWith("-")) {
        expect(line).toMatch(/^- \[/);
      }
    }
  });

  it("includes category prefix in KB article descriptions", () => {
    expect(output).toContain("Core Concepts —");
    expect(output).toContain("Capabilities —");
  });

  it("includes Funding Map and Knowledge Base in Landing Pages", () => {
    const landingSection = output.split("## Landing Pages")[1].split("## ")[0];
    expect(landingSection).toContain("Funding Map");
    expect(landingSection).toContain("Knowledge Base");
  });

  it("does not have a ## Product Pages section", () => {
    expect(output).not.toContain("## Product Pages");
  });

  it("all link items use - [name](url) format", () => {
    const linkLines = output.split("\n").filter((l) => l.match(/^- \[/));
    for (const line of linkLines) {
      expect(line).toMatch(/^- \[[^\]]+\]\([^)]+\)/);
    }
  });
});

// ---------------------------------------------------------------------------
// generateLlmsFullTxt — structure validation
// ---------------------------------------------------------------------------

describe("generateLlmsFullTxt", () => {
  const articles = [makeArticle()];
  const sdkReadme: SdkReadmeData = {
    content: "# Karma GAP SDK\n\nSDK for attestations.",
    source: "github",
    sourcePath: "karma-gap-sdk/readme.md",
    lastUpdated: "2024-01-01T00:00:00Z",
  };
  const landingPages = [makeLandingPage()];
  const sitemapEntries = [makeSitemapEntry()];

  let output: string;

  beforeAll(() => {
    output = generateLlmsFullTxt(articles, sdkReadme, landingPages, sitemapEntries, []);
  });

  it("starts with H1 using PROJECT_NAME", () => {
    expect(output.split("\n")[0]).toBe(`# ${PROJECT_NAME}`);
  });

  it("has matching H1 between llms.txt and llms-full.txt", () => {
    const llmsTxt = generateLlmsTxt(articles, landingPages, sitemapEntries, []);
    expect(output.split("\n")[0]).toBe(llmsTxt.split("\n")[0]);
  });

  it("has a blockquote", () => {
    const lines = output.split("\n");
    expect(lines[2]).toMatch(/^> .+/);
  });

  it("has Table of Contents", () => {
    expect(output).toContain("## Table of Contents");
  });

  it("has Landing Pages with full content", () => {
    expect(output).toContain("## Landing Pages");
    expect(output).toContain("### Home");
  });

  it("has Supported Networks section", () => {
    expect(output).toContain("## Supported Networks");
    expect(output).toContain("Chain ID:");
  });

  it("has Developer Docs section", () => {
    expect(output).toContain("## Developer Docs");
  });

  it("includes SDK documentation when available", () => {
    expect(output).toContain("## Karma GAP SDK Documentation");
    expect(output).toContain("SDK for attestations");
  });

  it("omits SDK section when sdk is null", () => {
    const noSdk = generateLlmsFullTxt(articles, null, landingPages, sitemapEntries, []);
    expect(noSdk).not.toContain("## Karma GAP SDK Documentation");
  });

  it("has Knowledge Base sections", () => {
    expect(output).toContain("## Knowledge Base - Core Concepts");
  });

  it("has Site URL Index", () => {
    expect(output).toContain("## Site URL Index");
  });

  it("includes landing page full text (not just descriptions)", () => {
    // The full text should appear in the output under Landing Pages
    expect(output).toContain("Builders share progress");
  });
});

// ---------------------------------------------------------------------------
// categorizeDocsPage
// ---------------------------------------------------------------------------

describe("categorizeDocsPage", () => {
  it("categorizes root path as Overview", () => {
    expect(categorizeDocsPage("/")).toBe("Overview");
    expect(categorizeDocsPage("")).toBe("Overview");
  });

  it("categorizes /overview paths as Overview", () => {
    expect(categorizeDocsPage("/overview/how-does-it-work")).toBe("Overview");
    expect(categorizeDocsPage("/overview/supported-networks")).toBe("Overview");
  });

  it("categorizes builder paths", () => {
    expect(categorizeDocsPage("/how-to-guides/for-builders")).toBe("For Builders");
    expect(categorizeDocsPage("/how-to-guides/for-builders/create-project")).toBe("For Builders");
  });

  it("categorizes grant manager paths", () => {
    expect(categorizeDocsPage("/how-to-guides/for-grant-managers/impact-measurement")).toBe(
      "For Grant Managers"
    );
  });

  it("categorizes reviewer paths", () => {
    expect(categorizeDocsPage("/how-to-guides/for-reviewers/application-review-guide")).toBe(
      "For Reviewers"
    );
  });

  it("categorizes community member paths", () => {
    expect(categorizeDocsPage("/how-to-guides/for-community-members/endorse-project")).toBe(
      "For Community Members"
    );
  });

  it("categorizes developers path", () => {
    expect(categorizeDocsPage("/how-to-guides/developers")).toBe("Developers");
  });

  it("categorizes faqs path", () => {
    expect(categorizeDocsPage("/how-to-guides/faqs")).toBe("FAQs");
  });

  it("categorizes partner paths", () => {
    expect(categorizeDocsPage("/how-to-guides/partners")).toBe("Partners");
    expect(categorizeDocsPage("/how-to-guides/partners/filecoin")).toBe("Partners");
    expect(
      categorizeDocsPage("/how-to-guides/partners/filecoin/propgf-batch-1-grantee-guide")
    ).toBe("Partners");
  });

  it("returns Other for unknown paths", () => {
    expect(categorizeDocsPage("/some/unknown/path")).toBe("Other");
  });
});

// ---------------------------------------------------------------------------
// cleanDocsMarkdown
// ---------------------------------------------------------------------------

describe("cleanDocsMarkdown", () => {
  it("converts hint markers to bold labels", () => {
    const input = '{% hint style="info" %}\nImportant note\n{% endhint %}';
    const result = cleanDocsMarkdown(input);
    expect(result).toContain("**info:**");
    expect(result).not.toContain("{% hint");
    expect(result).not.toContain("{% endhint %}");
  });

  it("removes GitBook arrow-up-right artifacts", () => {
    const input = "Optimismarrow-up-right, Arbitrumarrow-up-right";
    const result = cleanDocsMarkdown(input);
    expect(result).toBe("Optimism, Arbitrum");
  });

  it("removes empty markdown links", () => {
    const input = "Some text [](https://example.com/anchor) more text";
    const result = cleanDocsMarkdown(input);
    expect(result).toBe("Some text  more text");
    expect(result).not.toContain("[](");
  });

  it("removes GitBook icon names", () => {
    expect(cleanDocsMarkdown("circle-info\nSome content")).toBe("Some content");
    expect(cleanDocsMarkdown("circle-check\nSome content")).toBe("Some content");
  });

  it("removes GitBook navigation links", () => {
    const input =
      "Content\n[PreviousWhy Karma](https://docs.gap.karmahq.xyz/) [NextSupported Networks](https://docs.gap.karmahq.xyz/overview/supported-networks)\nMore";
    const result = cleanDocsMarkdown(input);
    expect(result).not.toContain("Previous");
    expect(result).not.toContain("Next");
  });

  it("removes 'Last updated' timestamps", () => {
    const input = "Content\nLast updated 2 months ago\nMore";
    const result = cleanDocsMarkdown(input);
    expect(result).not.toContain("Last updated");
  });

  it("removes hashtag prefix", () => {
    const input = "hashtag Filecoin ProPGF Grantee Guide";
    const result = cleanDocsMarkdown(input);
    expect(result).toBe("Filecoin ProPGF Grantee Guide");
  });

  it("collapses excessive newlines", () => {
    const input = "Line one\n\n\n\n\nLine two";
    expect(cleanDocsMarkdown(input)).toBe("Line one\n\nLine two");
  });

  it("trims whitespace", () => {
    expect(cleanDocsMarkdown("  content  ")).toBe("content");
  });
});

// ---------------------------------------------------------------------------
// docsPageTitle
// ---------------------------------------------------------------------------

describe("docsPageTitle", () => {
  it("strips '| Karma GAP' suffix", () => {
    expect(docsPageTitle("/overview", "How It Works | Karma GAP")).toBe("How It Works");
  });

  it("strips '| Karma' suffix (without GAP)", () => {
    expect(docsPageTitle("/overview", "How It Works | Karma")).toBe("How It Works");
  });

  it("strips '- Karma GAP' suffix", () => {
    expect(docsPageTitle("/overview", "How It Works - Karma GAP")).toBe("How It Works");
  });

  it("returns extracted title when clean", () => {
    expect(docsPageTitle("/overview", "How Does It Work")).toBe("How Does It Work");
  });

  it("falls back to slug-derived title when extracted is empty", () => {
    expect(docsPageTitle("/how-to-guides/for-builders/create-project", "")).toBe("Create Project");
  });
});

// ---------------------------------------------------------------------------
// validateDocsDescription
// ---------------------------------------------------------------------------

describe("validateDocsDescription", () => {
  it("returns valid description unchanged", () => {
    expect(
      validateDocsDescription("Creating a project is the first big step.", "Create Project")
    ).toBe("Creating a project is the first big step.");
  });

  it("falls back to title when description starts lowercase", () => {
    expect(
      validateDocsDescription("al issues: Limited Accessibility: Currently...", "Why Karma")
    ).toBe("Why Karma");
  });

  it("falls back to title when description is too short", () => {
    expect(validateDocsDescription("Short.", "Create Project")).toBe("Create Project");
  });

  it("falls back to title when description equals title", () => {
    expect(validateDocsDescription("For Reviewers", "For Reviewers")).toBe("For Reviewers");
  });

  it("falls back to title when description is empty", () => {
    expect(validateDocsDescription("", "Filecoin")).toBe("Filecoin");
  });
});

// ---------------------------------------------------------------------------
// groupDocsByCategory
// ---------------------------------------------------------------------------

describe("groupDocsByCategory", () => {
  it("groups docs pages by category", () => {
    const pages = [
      makeDocsPage({ category: "Overview" }),
      makeDocsPage({ path: "/how-to-guides/for-builders", category: "For Builders" }),
      makeDocsPage({ path: "/overview/supported-networks", category: "Overview" }),
    ];
    const grouped = groupDocsByCategory(pages);
    expect(grouped["Overview"]).toHaveLength(2);
    expect(grouped["For Builders"]).toHaveLength(1);
  });

  it("returns empty object for empty array", () => {
    expect(groupDocsByCategory([])).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// generateLlmsTxt with docs pages
// ---------------------------------------------------------------------------

describe("generateLlmsTxt with docs pages", () => {
  const articles = [makeArticle()];
  const landingPages = [makeLandingPage()];
  const sitemapEntries = [makeSitemapEntry()];
  const docsPages = [
    makeDocsPage(),
    makeDocsPage({
      path: "/how-to-guides/for-builders/create-project",
      url: "https://docs.gap.karmahq.xyz/how-to-guides/for-builders/create-project",
      title: "Create Project",
      description: "Step-by-step guide to creating your project profile.",
      category: "For Builders",
    }),
  ];

  it("includes ## Documentation section when docs pages exist", () => {
    const output = generateLlmsTxt(articles, landingPages, sitemapEntries, docsPages);
    expect(output).toContain("## Documentation");
  });

  it("omits ## Documentation section when no docs pages", () => {
    const output = generateLlmsTxt(articles, landingPages, sitemapEntries, []);
    expect(output).not.toContain("## Documentation");
  });

  it("includes docs page titles and category prefixes", () => {
    const output = generateLlmsTxt(articles, landingPages, sitemapEntries, docsPages);
    expect(output).toContain("How Does It Work");
    expect(output).toContain("Overview —");
    expect(output).toContain("Create Project");
    expect(output).toContain("For Builders —");
  });

  it("links to docs.gap.karmahq.xyz", () => {
    const output = generateLlmsTxt(articles, landingPages, sitemapEntries, docsPages);
    expect(output).toContain("https://docs.gap.karmahq.xyz/");
  });
});

// ---------------------------------------------------------------------------
// generateLlmsFullTxt with docs pages
// ---------------------------------------------------------------------------

describe("generateLlmsFullTxt with docs pages", () => {
  const articles = [makeArticle()];
  const landingPages = [makeLandingPage()];
  const sitemapEntries = [makeSitemapEntry()];
  const docsPages = [
    makeDocsPage(),
    makeDocsPage({
      path: "/how-to-guides/for-builders/create-project",
      url: "https://docs.gap.karmahq.xyz/how-to-guides/for-builders/create-project",
      title: "Create Project",
      description: "Step-by-step guide to creating your project profile.",
      fullText: "# Create Project\n\nStep-by-step guide to creating your project profile.",
      category: "For Builders",
    }),
  ];

  it("includes ## Documentation section with full content", () => {
    const output = generateLlmsFullTxt(articles, null, landingPages, sitemapEntries, docsPages);
    expect(output).toContain("## Documentation");
    expect(output).toContain("### Overview");
    expect(output).toContain("### For Builders");
    expect(output).toContain("#### How Does It Work");
    expect(output).toContain("#### Create Project");
  });

  it("includes Documentation in Table of Contents", () => {
    const output = generateLlmsFullTxt(articles, null, landingPages, sitemapEntries, docsPages);
    const toc = output.split("## Table of Contents")[1].split("## ")[0];
    expect(toc).toContain("- Documentation");
  });

  it("omits Documentation section when no docs pages", () => {
    const output = generateLlmsFullTxt(articles, null, landingPages, sitemapEntries, []);
    expect(output).not.toContain("## Documentation");
  });

  it("includes inline content from docs pages", () => {
    const output = generateLlmsFullTxt(articles, null, landingPages, sitemapEntries, docsPages);
    expect(output).toContain("comprehensive information about their work");
  });

  it("strips duplicate H1 from docs content", () => {
    const output = generateLlmsFullTxt(articles, null, landingPages, sitemapEntries, docsPages);
    // The H1 "# How Does It Work" should be stripped since the #### title already shows it
    const docSection = output.split("## Documentation")[1].split("## ")[0];
    expect(docSection).not.toMatch(/^# How Does It Work$/m);
  });
});

// ---------------------------------------------------------------------------
// Constants integrity
// ---------------------------------------------------------------------------

describe("constants integrity", () => {
  it("SITEMAP_LABEL_MAP covers all SITEMAP_DESCRIPTION_MAP keys", () => {
    for (const key of Object.keys(SITEMAP_DESCRIPTION_MAP)) {
      expect(SITEMAP_LABEL_MAP).toHaveProperty(key);
    }
  });

  it("SITEMAP_DESCRIPTION_MAP has non-empty descriptions", () => {
    for (const [key, desc] of Object.entries(SITEMAP_DESCRIPTION_MAP)) {
      expect(desc.length).toBeGreaterThan(10);
    }
  });

  it("PROJECT_NAME is set", () => {
    expect(PROJECT_NAME).toBe("Karma");
  });

  it("SITE_URL is a valid HTTPS URL", () => {
    expect(SITE_URL).toMatch(/^https:\/\//);
  });

  it("DOCS_SITE_URL is a valid HTTPS URL", () => {
    expect(DOCS_SITE_URL).toMatch(/^https:\/\//);
  });

  it("DOCS_CATEGORY_ORDER has expected categories", () => {
    expect(DOCS_CATEGORY_ORDER).toContain("Overview");
    expect(DOCS_CATEGORY_ORDER).toContain("For Builders");
    expect(DOCS_CATEGORY_ORDER).toContain("Partners");
    expect(DOCS_CATEGORY_ORDER.length).toBeGreaterThanOrEqual(8);
  });
});
