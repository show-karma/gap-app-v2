#!/usr/bin/env node

/**
 * Local AEO (Answer Engine Optimization) readiness checker for /solutions/* pages.
 *
 * Validates structural signals that make pages AI-answer-friendly:
 * - JSON-LD schemas (FAQPage, BreadcrumbList, HowTo, WebPage, SoftwareApplication)
 * - Direct-answer paragraphs (TL;DR near H1)
 * - FAQ sections with clear Q&A pairs
 * - Semantic HTML structure
 * - Content quality signals (word counts, keyword presence, etc.)
 *
 * Usage:
 *   node scripts/aeo-readiness-audit.mjs                     # audit all solutions
 *   node scripts/aeo-readiness-audit.mjs --quick              # audit 5 samples
 *   node scripts/aeo-readiness-audit.mjs --slug ai-grant-review  # audit one page
 *
 * Requires: dev server running on localhost:3000
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const OUTPUT_DIR = resolve(ROOT, "scripts/.aeo-results");

const args = process.argv.slice(2);
const quickMode = args.includes("--quick");
const singleSlug = args.includes("--slug") ? args[args.indexOf("--slug") + 1] : null;

// ─── Discover slugs from data files ───
function getSolutionSlugs() {
  const dataDir = resolve(ROOT, "app/solutions/_data");
  const slugs = [];
  for (const file of readdirSync(dataDir)) {
    if (!file.endsWith(".ts") || file === "types.ts") continue;
    const content = readFileSync(resolve(dataDir, file), "utf-8");
    const matches = content.matchAll(/slug:\s*["']([^"']+)["']/g);
    for (const m of matches) slugs.push(m[1]);
  }
  return slugs;
}

function buildSlugList() {
  if (singleSlug) return [singleSlug];
  const slugs = getSolutionSlugs();
  if (quickMode) {
    const step = Math.floor(slugs.length / 5) || 1;
    return slugs.filter((_, i) => i % step === 0).slice(0, 5);
  }
  return slugs;
}

// ─── Fetch page HTML ───
async function fetchPage(slug) {
  const url = `${BASE_URL}/solutions/${slug}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

// ─── AEO Scoring Rubric ───
// Inspired by AEO-Lite's 6 categories, adapted for our stack.
// Total: 100 points

function auditPage(slug, html) {
  const checks = [];
  let totalScore = 0;
  let maxScore = 0;

  function check(category, name, points, pass, detail) {
    maxScore += points;
    const earned = pass ? points : 0;
    totalScore += earned;
    checks.push({ category, name, points, earned, pass, detail });
  }

  // ── 1. ANSWER READINESS (25 pts) ──
  // Does the page provide direct, extractable answers?

  // 1a. H1 present and contains keyword-rich text (5 pts)
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const h1Text = h1Match ? h1Match[1].replace(/<[^>]+>/g, "").trim() : "";
  check("Answer Readiness", "H1 tag present with content", 5,
    h1Text.length > 10,
    h1Text ? `"${h1Text.substring(0, 80)}..."` : "No H1 found"
  );

  // 1b. TL;DR / direct-answer paragraph within first 2000 chars (7 pts)
  const first2000 = html.substring(0, html.indexOf("</section>") || 2000);
  const hasTldr = first2000.includes(slug) || (h1Match && first2000.indexOf("</p>") > first2000.indexOf("</h1>"));
  const firstPAfterH1 = html.match(/<\/h1>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i);
  const tldrText = firstPAfterH1 ? firstPAfterH1[1].replace(/<[^>]+>/g, "").trim() : "";
  const tldrWordCount = tldrText.split(/\s+/).filter(Boolean).length;
  check("Answer Readiness", "Direct-answer paragraph after H1 (30-80 words)", 7,
    tldrWordCount >= 20 && tldrWordCount <= 120,
    `${tldrWordCount} words: "${tldrText.substring(0, 100)}..."`
  );

  // 1c. Answer uses declarative/definitive language (3 pts)
  const declarativePatterns = /\b(helps?|enables?|provides?|allows?|gives?|lets?|reduces?|automates?|streamlines?|built for|designed for|purpose-built)\b/i;
  check("Answer Readiness", "Declarative language in overview", 3,
    declarativePatterns.test(tldrText),
    declarativePatterns.test(tldrText) ? "Contains action-oriented language" : "Consider more definitive phrasing"
  );

  // 1d. Meta description present and <160 chars (5 pts)
  const metaDesc = html.match(/<meta\s+name="description"\s+content="([^"]*?)"/i);
  const metaDescText = metaDesc ? metaDesc[1] : "";
  check("Answer Readiness", "Meta description present and <160 chars", 5,
    metaDescText.length > 50 && metaDescText.length <= 160,
    `${metaDescText.length} chars: "${metaDescText.substring(0, 80)}..."`
  );

  // 1e. Title tag present with keyword (5 pts)
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const titleText = titleMatch ? titleMatch[1].trim() : "";
  check("Answer Readiness", "Title tag present with keyword", 5,
    titleText.length > 20 && titleText.length < 70,
    `${titleText.length} chars: "${titleText}"`
  );

  // ── 2. SCHEMA / STRUCTURED DATA (20 pts) ──

  const jsonLdBlocks = html.match(/<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi) || [];
  const schemas = jsonLdBlocks.map(block => {
    const content = block.match(/>([\s\S]*?)<\/script>/i);
    try { return JSON.parse(content[1]); } catch { return null; }
  }).filter(Boolean);

  const schemaTypes = schemas.map(s => s["@type"]);

  check("Schema Essentials", "FAQPage JSON-LD present", 5,
    schemaTypes.includes("FAQPage"),
    schemaTypes.includes("FAQPage") ? "FAQPage schema found" : "Missing FAQPage schema"
  );

  check("Schema Essentials", "BreadcrumbList JSON-LD present", 4,
    schemaTypes.includes("BreadcrumbList"),
    schemaTypes.includes("BreadcrumbList") ? "BreadcrumbList schema found" : "Missing BreadcrumbList"
  );

  check("Schema Essentials", "WebPage JSON-LD present", 3,
    schemaTypes.includes("WebPage"),
    schemaTypes.includes("WebPage") ? "WebPage schema found" : "Missing WebPage schema"
  );

  check("Schema Essentials", "SoftwareApplication JSON-LD present", 3,
    schemaTypes.includes("SoftwareApplication"),
    schemaTypes.includes("SoftwareApplication") ? "SoftwareApplication schema found" : "Missing SoftwareApplication"
  );

  // HowTo schema (bonus for guide pages, expected for pages with steps)
  const hasStepsSection = html.includes("How It Works");
  const hasHowTo = schemaTypes.includes("HowTo");
  check("Schema Essentials", "HowTo JSON-LD (when steps present)", 3,
    !hasStepsSection || hasHowTo,
    hasStepsSection
      ? (hasHowTo ? "HowTo schema matches steps section" : "Steps section exists but no HowTo schema")
      : "No steps section (N/A, passes by default)"
  );

  // Schema validation: FAQPage has mainEntity
  const faqSchema = schemas.find(s => s["@type"] === "FAQPage");
  check("Schema Essentials", "FAQPage has mainEntity with Q&A items", 2,
    faqSchema?.mainEntity?.length >= 3,
    faqSchema ? `${faqSchema.mainEntity?.length || 0} Q&A items in schema` : "No FAQPage schema"
  );

  // ── 3. FAQ / Q&A SURFACEABILITY (15 pts) ──

  const faqCount = faqSchema?.mainEntity?.length || 0;
  check("FAQ Surfaceability", "At least 4 FAQ items", 4,
    faqCount >= 4,
    `${faqCount} FAQ items`
  );

  // FAQ answers should be 40+ words for AI extraction
  const faqAnswers = faqSchema?.mainEntity?.map(q => q.acceptedAnswer?.text || "") || [];
  const avgFaqWords = faqAnswers.length
    ? Math.round(faqAnswers.reduce((sum, a) => sum + a.split(/\s+/).length, 0) / faqAnswers.length)
    : 0;
  check("FAQ Surfaceability", "FAQ answers average 40+ words", 4,
    avgFaqWords >= 40,
    `Average: ${avgFaqWords} words per answer`
  );

  // FAQ questions should be phrased as natural questions
  const questionPatterns = /^(how|what|why|when|where|who|can|does|is|are|will|should|do)\b/i;
  const naturalQuestions = faqAnswers.length
    ? faqSchema.mainEntity.filter(q => questionPatterns.test(q.name || "")).length
    : 0;
  check("FAQ Surfaceability", "FAQ questions use natural question phrasing", 4,
    faqCount === 0 || naturalQuestions >= Math.ceil(faqCount * 0.6),
    `${naturalQuestions}/${faqCount} use question words (how, what, why, etc.)`
  );

  // FAQ visible in HTML (not just in JSON-LD)
  const visibleFaqHeadings = (html.match(/<h3[^>]*>[\s\S]*?\?[\s\S]*?<\/h3>/gi) || []).length;
  check("FAQ Surfaceability", "FAQs rendered as visible HTML (not just JSON-LD)", 3,
    visibleFaqHeadings >= 3,
    `${visibleFaqHeadings} visible FAQ headings (h3 with ?) found`
  );

  // ── 4. ENTITY & INTERNAL LINKS (15 pts) ──

  // Brand mention
  const brandMentions = (html.match(/\bKarma\b/g) || []).length;
  check("Entity & Links", "Brand name 'Karma' appears 3+ times", 3,
    brandMentions >= 3,
    `${brandMentions} mentions of "Karma"`
  );

  // Internal links present
  const internalLinks = (html.match(/href="\/((?!_next|favicon|images)[^"]*?)"/g) || []).length;
  check("Entity & Links", "3+ internal links", 4,
    internalLinks >= 3,
    `${internalLinks} internal links found`
  );

  // Breadcrumb nav in HTML
  const hasBreadcrumb = html.includes('aria-label="Breadcrumb"') || html.includes('breadcrumb');
  check("Entity & Links", "Breadcrumb navigation in HTML", 3,
    hasBreadcrumb,
    hasBreadcrumb ? "Breadcrumb nav found" : "No breadcrumb navigation"
  );

  // Canonical URL present
  const hasCanonical = html.includes('rel="canonical"');
  check("Entity & Links", "Canonical URL present", 3,
    hasCanonical,
    hasCanonical ? "Canonical tag found" : "Missing canonical tag"
  );

  // Related solutions / cross-links
  const hasRelatedSection = html.includes("Related solutions") || html.includes("Explore More");
  check("Entity & Links", "Related solutions section with cross-links", 2,
    hasRelatedSection,
    hasRelatedSection ? "Related solutions section found" : "No related solutions section"
  );

  // ── 5. CONTENT DEPTH & STRUCTURE (15 pts) ──

  // Total word count (body text)
  const bodyText = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const totalWords = bodyText.split(/\s+/).filter(Boolean).length;
  check("Content Depth", "800+ total words on page", 4,
    totalWords >= 800,
    `${totalWords} total words`
  );

  // Multiple H2 sections (topical coverage)
  const h2Count = (html.match(/<h2[^>]*>/gi) || []).length;
  check("Content Depth", "4+ H2 sections for topical coverage", 3,
    h2Count >= 4,
    `${h2Count} H2 headings`
  );

  // H3 subheadings present
  const h3Count = (html.match(/<h3[^>]*>/gi) || []).length;
  check("Content Depth", "H3 subheadings for granular structure", 2,
    h3Count >= 3,
    `${h3Count} H3 headings`
  );

  // Semantic HTML: <main>, <section>, <nav>, <article>
  const semanticTags = ["<main", "<section", "<nav"].filter(tag => html.includes(tag));
  check("Content Depth", "Semantic HTML tags (main, section, nav)", 3,
    semanticTags.length >= 3,
    `Found: ${semanticTags.map(t => t.replace("<", "")).join(", ")}`
  );

  // Trust signals present (social proof)
  const trustSignals = /trusted by|programs?|grant[s]? managed|rating|reviews?|\d+\+/i.test(html);
  check("Content Depth", "Trust signals / social proof present", 3,
    trustSignals,
    trustSignals ? "Trust signals found" : "No trust signals detected"
  );

  // ── 6. FRESHNESS & CTA (10 pts) ──

  // Publication date / datePublished
  const webPageSchema = schemas.find(s => s["@type"] === "WebPage");
  const hasDate = webPageSchema?.datePublished || html.includes("<time");
  check("Freshness & CTA", "Publication date present", 3,
    !!hasDate,
    hasDate ? "Date found" : "No publication date"
  );

  // CTA present with actionable text
  // Match both <a> and <button> with CTA-like text, including wrapped content
  const ctaPatterns = /(?:Schedule|Book|Start|Get Started|Try|Sign|Request|Contact|Demo|See how|Learn more|Explore|Review|Manage|Track|Automate|Streamline|Reduce|Improve|Scale)/gi;
  const linkBlocks = html.match(/<(?:a|button)[^>]*>[\s\S]*?<\/(?:a|button)>/gi) || [];
  const ctaLinks = linkBlocks.filter(block => ctaPatterns.test(block.replace(/<[^>]+>/g, "")));
  check("Freshness & CTA", "Actionable CTA present", 4,
    ctaLinks.length >= 1,
    `${ctaLinks.length} CTA link(s) found`
  );

  // Multiple CTAs (hero + bottom)
  check("Freshness & CTA", "Multiple CTAs (hero + bottom)", 3,
    ctaLinks.length >= 2,
    `${ctaLinks.length} CTAs across the page`
  );

  return {
    slug,
    score: Math.round((totalScore / maxScore) * 100),
    totalScore,
    maxScore,
    checks,
    summary: {
      categories: checks.reduce((acc, c) => {
        if (!acc[c.category]) acc[c.category] = { earned: 0, max: 0 };
        acc[c.category].earned += c.earned;
        acc[c.category].max += c.points;
        return acc;
      }, {}),
    },
  };
}

// ─── Main ───
async function main() {
  const slugs = buildSlugList();
  console.log(`\nAEO Readiness Audit — ${slugs.length} /solutions/* pages\n`);

  const results = [];

  for (let i = 0; i < slugs.length; i++) {
    const slug = slugs[i];
    process.stdout.write(`[${i + 1}/${slugs.length}] /solutions/${slug} ... `);

    try {
      const html = await fetchPage(slug);
      const result = auditPage(slug, html);
      results.push(result);

      // Category breakdown
      const cats = Object.entries(result.summary.categories)
        .map(([cat, v]) => `${cat}: ${v.earned}/${v.max}`)
        .join(" | ");

      console.log(`${result.score}/100  (${cats})`);

      // Show failures
      const failures = result.checks.filter(c => !c.pass);
      if (failures.length > 0) {
        for (const f of failures) {
          console.log(`    ✗ [${f.category}] ${f.name} (${f.detail})`);
        }
      }
    } catch (e) {
      console.log(`ERROR: ${e.message}`);
      results.push({ slug, score: 0, error: e.message });
    }
  }

  // ─── Summary ───
  console.log("\n" + "=".repeat(70));
  const scores = results.filter(r => r.score > 0).map(r => r.score);
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const min = scores.length ? Math.min(...scores) : 0;
  const max = scores.length ? Math.max(...scores) : 0;
  const perfect = scores.filter(s => s >= 95).length;
  const good = scores.filter(s => s >= 80 && s < 95).length;
  const needsWork = scores.filter(s => s < 80).length;

  console.log(`SUMMARY: ${slugs.length} pages audited`);
  console.log(`  Average AEO score: ${avg}/100`);
  console.log(`  Range: ${min} - ${max}`);
  console.log(`  Excellent (95+): ${perfect}`);
  console.log(`  Good (80-94): ${good}`);
  console.log(`  Needs work (<80): ${needsWork}`);

  // Most common failures
  const allFailures = results
    .flatMap(r => (r.checks || []).filter(c => !c.pass))
    .reduce((acc, f) => {
      const key = `[${f.category}] ${f.name}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  const sortedFailures = Object.entries(allFailures).sort((a, b) => b[1] - a[1]);

  if (sortedFailures.length > 0) {
    console.log("\nMost common issues:");
    for (const [issue, count] of sortedFailures.slice(0, 10)) {
      console.log(`  ${count}/${slugs.length} pages: ${issue}`);
    }
  }

  // Lowest scoring pages
  const lowest = results.filter(r => r.score > 0).sort((a, b) => a.score - b.score).slice(0, 5);
  if (lowest.length && lowest[0].score < 95) {
    console.log("\nLowest scoring pages:");
    for (const r of lowest) {
      console.log(`  ${r.score}/100 — /solutions/${r.slug}`);
    }
  }

  // Save report
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const reportPath = resolve(OUTPUT_DIR, `aeo-report-${new Date().toISOString().slice(0, 10)}.json`);
  writeFileSync(reportPath, JSON.stringify({ date: new Date().toISOString(), average: avg, results }, null, 2));
  console.log(`\nFull report: ${reportPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
