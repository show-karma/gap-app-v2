/**
 * Normalize SHOUTED IRS-derived text and other display strings without
 * duplicating the helpers that live inside `CandidateCard.tsx`. The
 * brief view consumes the same wire shape but renders in an editorial
 * register, so it needs the same normalization.
 */

const TITLE_CASE_LOWERCASE = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "but",
  "by",
  "for",
  "from",
  "in",
  "into",
  "nor",
  "of",
  "on",
  "onto",
  "or",
  "per",
  "the",
  "to",
  "up",
  "via",
  "vs",
  "vs.",
  "with",
]);

const KEEP_AS_IS = new Set([
  "USA",
  "U.S.",
  "U.S.A.",
  "UK",
  "EU",
  "NYC",
  "LA",
  "SF",
  "DC",
  "IRS",
  "LLC",
  "LLP",
  "Inc.",
  "Inc",
  "Co.",
  "Co",
  "Corp.",
  "Corp",
  "Ltd.",
  "Ltd",
  "II",
  "III",
  "IV",
  "VI",
  "VII",
  "VIII",
  "IX",
  "XI",
  "501c3",
  "STEM",
  "LGBT",
  "LGBTQ",
  "LGBTQ+",
  "HIV",
  "AIDS",
  "CDC",
  "FBI",
  "CIA",
  "NASA",
  "MIT",
]);

export function humanizeCase(input: string, mode: "title" | "sentence"): string {
  if (!input) return input;
  const letters = input.replace(/[^A-Za-z]/g, "");
  if (letters.length === 0) return input;
  const upper = letters.replace(/[^A-Z]/g, "").length;
  const ratio = upper / letters.length;
  if (ratio < 0.7) return input;
  return mode === "title" ? toTitleCase(input) : toSentenceCase(input);
}

function toTitleCase(input: string): string {
  const tokens = input.split(/(\s+|[-—–/])/);
  const wordIndices: number[] = [];
  tokens.forEach((tok, i) => {
    if (/^[A-Za-z]/.test(tok)) wordIndices.push(i);
  });
  const firstWord = wordIndices[0] ?? -1;
  const lastWord = wordIndices[wordIndices.length - 1] ?? -1;

  return tokens
    .map((tok, i) => {
      if (!/^[A-Za-z]/.test(tok)) return tok;
      if (KEEP_AS_IS.has(tok)) return tok;
      const lower = tok.toLowerCase();
      const isFirst = i === firstWord;
      const isLast = i === lastWord;
      if (!isFirst && !isLast && TITLE_CASE_LOWERCASE.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join("");
}

function toSentenceCase(input: string): string {
  const lower = input.toLowerCase();
  const sentenced = lower.replace(
    /(^|[.!?]\s+)([a-z])/g,
    (_, lead, ch) => `${lead}${ch.toUpperCase()}`
  );
  const withI = sentenced.replace(/\bi\b/g, "I");
  let result = withI;
  for (const token of KEEP_AS_IS) {
    const safe = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(`\\b${safe}\\b`, "gi"), token);
  }
  return result;
}

export function formatEin(ein: string): string {
  const digits = ein.replace(/[^0-9]/g, "");
  if (digits.length !== 9) return ein;
  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
}

export function formatLocale(city: string | null, state: string | null): string | null {
  const cityH = city ? humanizeCase(city, "title") : null;
  if (cityH && state) return `${cityH}, ${state}`;
  return cityH ?? state ?? null;
}

export function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");
  return `${slice.slice(0, lastSpace > 0 ? lastSpace : max).trimEnd()}…`;
}

/**
 * "12 days ago", "2 weeks ago", "8 months ago", "over a year ago".
 * Editorial register — drops the "approximately" hedge.
 */
export function relativeDays(ms: number | null): string | null {
  if (ms === null) return null;
  const days = Math.max(0, Math.floor((Date.now() - ms) / 86_400_000));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  if (days < 540) return `${Math.round(days / 30)} months ago`;
  return "over a year ago";
}

/**
 * Compact follower/like counts: 68247 → "68.2K", 2000 → "2K",
 * 1_300_000 → "1.3M". Trailing ".0" is dropped.
 */
export function formatCompactNumber(value: number | null): string {
  if (value === null) return "—";
  const trim = (n: number) => n.toFixed(1).replace(/\.0$/, "");
  if (value >= 1_000_000) return `${trim(value / 1_000_000)}M`;
  if (value >= 1_000) return `${trim(value / 1_000)}K`;
  return String(value);
}

export function mostRecentMentionDate(
  mentions: readonly { publishedDate: string | null }[] | null
): number | null {
  if (!mentions) return null;
  let best: number | null = null;
  for (const m of mentions) {
    if (!m.publishedDate) continue;
    const t = Date.parse(m.publishedDate);
    if (Number.isNaN(t)) continue;
    if (best === null || t > best) best = t;
  }
  return best;
}
