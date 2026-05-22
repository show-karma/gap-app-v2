import { NON_PROFITS_PAGES } from "@/utilities/pages";
import type { RankedEntity } from "../types/philanthropy";

const PUNCTUATION = /[.,'"()[\]{}!?;:]/g;
const LEADING_ARTICLES = new Set(["the", "a", "an"]);
const TRAILING_NOISE = new Set([
  "inc",
  "incorporated",
  "llc",
  "ltd",
  "co",
  "corp",
  "corporation",
  "company",
]);

interface Token {
  readonly text: string;
  readonly start: number;
  readonly end: number;
  readonly norm: string;
}

interface EntityCandidate {
  readonly entity: RankedEntity;
  readonly tokens: readonly string[];
}

interface Match {
  readonly start: number;
  readonly end: number;
  readonly entity: RankedEntity;
}

function normalizeToken(raw: string): string {
  return raw.toLowerCase().replace(PUNCTUATION, "");
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  const re = /\S+/g;
  let match: RegExpExecArray | null = re.exec(source);
  while (match !== null) {
    const norm = normalizeToken(match[0]);
    if (norm) {
      tokens.push({
        text: match[0],
        start: match.index,
        end: match.index + match[0].length,
        norm,
      });
    }
    match = re.exec(source);
  }
  return tokens;
}

function canonicalizeEntityName(name: string): string[] {
  const tokens = name.split(/\s+/).map(normalizeToken).filter(Boolean);

  // Drop leading article(s): "The Ford Foundation" → "Ford Foundation"
  while (tokens.length > 1 && LEADING_ARTICLES.has(tokens[0])) {
    tokens.shift();
  }

  // Drop trailing legal-entity noise while keeping at least 2 tokens of signal:
  // "Annie E Casey Foundation Inc" → "Annie E Casey Foundation"
  while (tokens.length > 2 && TRAILING_NOISE.has(tokens[tokens.length - 1])) {
    tokens.pop();
  }

  return tokens;
}

function getEntityPath(entity: RankedEntity): string {
  switch (entity.entityType) {
    case "foundation":
      return NON_PROFITS_PAGES.FOUNDATION(entity.id);
    case "nonprofit":
      return NON_PROFITS_PAGES.NONPROFIT(entity.id);
    case "grant":
      return NON_PROFITS_PAGES.GRANT(entity.id);
  }
}

function inExistingMarkdownLink(source: string, index: number): boolean {
  // Heuristic: if the next `]` before the next `[` is followed by `(`,
  // we are inside an existing [text](url) link. Fast scan.
  const close = source.indexOf("]", index);
  if (close === -1) return false;
  const open = source.indexOf("[", index);
  if (open !== -1 && open < close) return false;
  return source[close + 1] === "(";
}

/**
 * Wraps entity mentions in a narrative with markdown links to their detail pages.
 *
 * Matching is tolerant to casing, punctuation, leading articles ("The ..."),
 * and trailing legal-entity suffixes ("... Inc"). Longest entity names are
 * preferred and matches cannot overlap.
 */
export function linkifyNarrative(narrative: string, entities: readonly RankedEntity[]): string {
  if (!narrative || entities.length === 0) return narrative;

  const candidates: EntityCandidate[] = [];
  const seen = new Set<string>();
  for (const entity of entities) {
    if (!entity.name) continue;
    const tokens = canonicalizeEntityName(entity.name);
    if (tokens.length < 2) continue; // avoid single-word false positives
    const key = tokens.join(" ");
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push({ entity, tokens });
  }
  if (candidates.length === 0) return narrative;

  // Prefer longer names first so "Ford Foundation" doesn't shadow
  // "Henry Ford Foundation".
  candidates.sort((a, b) => b.tokens.length - a.tokens.length);

  const narrativeTokens = tokenize(narrative);
  const used = new Array<boolean>(narrativeTokens.length).fill(false);
  const matches: Match[] = [];

  for (let i = 0; i < narrativeTokens.length; i++) {
    if (used[i]) continue;

    // Let the match optionally start with a skippable leading article.
    // Only include it in the anchor when capitalized ("The Ford Foundation").
    // A lowercase "the" is part of surrounding prose, not the proper name,
    // so we skip over it without pulling it into the link.
    const hasLeadingArticle = LEADING_ARTICLES.has(narrativeTokens[i].norm);
    const leadingArticleCapitalized = hasLeadingArticle && /^[A-Z]/.test(narrativeTokens[i].text);
    const bodyStart = hasLeadingArticle ? i + 1 : i;
    const anchorStart = leadingArticleCapitalized ? i : bodyStart;

    for (const candidate of candidates) {
      const lastIndex = bodyStart + candidate.tokens.length - 1;
      if (lastIndex >= narrativeTokens.length) continue;

      let matched = true;
      for (let k = 0; k < candidate.tokens.length; k++) {
        if (narrativeTokens[bodyStart + k].norm !== candidate.tokens[k]) {
          matched = false;
          break;
        }
      }
      if (!matched) continue;

      let overlapping = false;
      for (let k = anchorStart; k <= lastIndex; k++) {
        if (used[k]) {
          overlapping = true;
          break;
        }
      }
      if (overlapping) break;

      matches.push({
        start: narrativeTokens[anchorStart].start,
        end: narrativeTokens[lastIndex].end,
        entity: candidate.entity,
      });
      for (let k = anchorStart; k <= lastIndex; k++) used[k] = true;
      break;
    }
  }

  if (matches.length === 0) return narrative;

  // Apply in reverse so earlier indices stay valid.
  matches.sort((a, b) => b.start - a.start);

  let result = narrative;
  for (const m of matches) {
    if (inExistingMarkdownLink(result, m.start)) continue;
    const anchor = result.slice(m.start, m.end);
    result = `${result.slice(0, m.start)}[${anchor}](${getEntityPath(m.entity)})${result.slice(m.end)}`;
  }
  return result;
}
