/**
 * AI-referrer (answer engine) classification and first-touch attribution.
 *
 * Answer engines send traffic in three shapes, and all three have to be handled:
 *   1. a normal `Referer` header (chat.openai.com, perplexity.ai, ...)
 *   2. no referrer at all, but a tagged landing URL (ChatGPT appends
 *      `utm_source=chatgpt.com`)
 *   3. no referrer and no tags — indistinguishable from direct traffic, so it
 *      is deliberately NOT attributed rather than guessed at.
 *
 * The resulting label is merged into every Mixpanel event (see
 * `utilities/mixpanelEvent.ts` / `hooks/useMixpanel.ts`) and set as GA4 user
 * properties (see `components/Utilities/AiReferrerTracker.tsx`), so a
 * conversion several navigations after the landing still carries its AI origin
 * in both tools.
 */

export type AiSource = "chatgpt" | "claude" | "perplexity" | "gemini" | "copilot" | "ai-generic";

export type AiReferrerMedium = "referral" | "utm";

export interface AiReferrerClassification {
  source: AiSource;
  medium: AiReferrerMedium;
}

export interface AiFirstTouch extends AiReferrerClassification {
  /** Pathname only — never the query string, so no identifiers are persisted. */
  landingPath: string;
  firstSeenAt: string;
}

export interface AiReferrerInput {
  referrer: string;
  url: string;
}

export interface CaptureAiFirstTouchResult {
  firstTouch: AiFirstTouch | null;
  /** True only for the visit that actually wrote the record. */
  isNew: boolean;
}

export const AI_FIRST_TOUCH_STORAGE_KEY = "karma-ai-first-touch";

const AI_SOURCES: readonly AiSource[] = [
  "chatgpt",
  "claude",
  "perplexity",
  "gemini",
  "copilot",
  "ai-generic",
];

const AI_MEDIUMS: readonly AiReferrerMedium[] = ["referral", "utm"];

/**
 * `utm_source` values, normalized to lowercase. Assistants are inconsistent:
 * ChatGPT tags `chatgpt.com`, hand-built campaigns tag `chatgpt`.
 */
const UTM_SOURCE_TO_AI_SOURCE: Readonly<Record<string, AiSource>> = {
  chatgpt: "chatgpt",
  "chatgpt.com": "chatgpt",
  "chat.openai.com": "chatgpt",
  openai: "chatgpt",
  "openai.com": "chatgpt",
  claude: "claude",
  "claude.ai": "claude",
  "claude.com": "claude",
  anthropic: "claude",
  "anthropic.com": "claude",
  perplexity: "perplexity",
  "perplexity.ai": "perplexity",
  pplx: "perplexity",
  "pplx.ai": "perplexity",
  gemini: "gemini",
  "gemini.google.com": "gemini",
  bard: "gemini",
  "bard.google.com": "gemini",
  copilot: "copilot",
  "copilot.microsoft.com": "copilot",
  "bing-chat": "copilot",
  bingchat: "copilot",
  "microsoft-copilot": "copilot",
  ai: "ai-generic",
  llm: "ai-generic",
  llms: "ai-generic",
  "ai-assistant": "ai-generic",
  "answer-engine": "ai-generic",
};

/** `utm_medium` values that mark a visit as AI-originated on their own. */
const AI_UTM_MEDIUMS: ReadonlySet<string> = new Set([
  "ai",
  "llm",
  "chatbot",
  "ai-referral",
  "answer-engine",
]);

/**
 * Referrer hostnames. Matching is exact or on a dot-suffix, so
 * `chat.openai.com` matches via `openai.com`.
 *
 * Deliberately absent: bare `bing.com` and bare `google.com`. Copilot and
 * Gemini answers sometimes arrive under the parent search domain, where they
 * are indistinguishable from organic search — classifying them would pollute
 * the AI cohort with organic traffic. Where the *path* disambiguates, the
 * host is picked up by PATH_SCOPED_REFERRER_RULES below instead.
 */
const REFERRER_HOST_TO_AI_SOURCE: Readonly<Record<string, AiSource>> = {
  "openai.com": "chatgpt",
  "chatgpt.com": "chatgpt",
  "claude.ai": "claude",
  "claude.com": "claude",
  "anthropic.com": "claude",
  "perplexity.ai": "perplexity",
  "pplx.ai": "perplexity",
  "gemini.google.com": "gemini",
  "bard.google.com": "gemini",
  "copilot.microsoft.com": "copilot",
  "copilot.cloud.microsoft": "copilot",
  "edgeservices.bing.com": "copilot",
  "poe.com": "ai-generic",
  "you.com": "ai-generic",
  "phind.com": "ai-generic",
  "meta.ai": "ai-generic",
  "duck.ai": "ai-generic",
  "grok.com": "ai-generic",
  "x.ai": "ai-generic",
  "chat.mistral.ai": "ai-generic",
  "chat.deepseek.com": "ai-generic",
};

interface PathScopedReferrerRule {
  /** Matched exactly or on a dot-suffix, like REFERRER_HOST_TO_AI_SOURCE. */
  host: string;
  /** Path prefixes that identify the assistant surface on a shared host. */
  pathPrefixes: readonly string[];
  /** Query parameters whose mere presence identifies the assistant surface. */
  markerParams: readonly string[];
  source: AiSource;
}

/**
 * Hosts that serve both organic search and an answer engine, where the path or
 * a marker query parameter tells the two apart. `www.bing.com/search` stays
 * unclassified, but `www.bing.com/chat` and the `showconv=1` conversation mode
 * are unambiguously Bing Chat / Copilot.
 */
const PATH_SCOPED_REFERRER_RULES: readonly PathScopedReferrerRule[] = [
  {
    host: "bing.com",
    pathPrefixes: ["/chat", "/copilotsearch"],
    markerParams: ["showconv"],
    source: "copilot",
  },
];

const parseUrl = (value: string): URL | null => {
  if (!value) return null;
  // A protocol-relative reference ("//chatgpt.com/c/abc") is a valid URL
  // reference but not a valid absolute URL, so `new URL` rejects it. Browsers
  // never serialize `document.referrer` that way, but callers can.
  const candidate = value.startsWith("//") ? `https:${value}` : value;
  try {
    return new URL(candidate);
  } catch {
    // SUPPRESSED: a malformed referrer or location is expected input here
    // (browsers pass through whatever the previous page set) and is treated
    // exactly like an absent one. Nothing actionable to report.
    return null;
  }
};

const normalizeHost = (host: string): string => host.toLowerCase().replace(/^www\./, "");

const hostMatches = (normalizedHost: string, candidate: string): boolean =>
  normalizedHost === candidate || normalizedHost.endsWith(`.${candidate}`);

const matchReferrerUrl = (referrerUrl: URL): AiSource | null => {
  const normalized = normalizeHost(referrerUrl.hostname);
  for (const [candidate, source] of Object.entries(REFERRER_HOST_TO_AI_SOURCE)) {
    if (hostMatches(normalized, candidate)) {
      return source;
    }
  }
  const path = referrerUrl.pathname.toLowerCase();
  for (const rule of PATH_SCOPED_REFERRER_RULES) {
    if (!hostMatches(normalized, rule.host)) continue;
    if (rule.pathPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
      return rule.source;
    }
    if (rule.markerParams.some((param) => referrerUrl.searchParams.has(param))) {
      return rule.source;
    }
  }
  return null;
};

const classifyByUtm = (url: URL | null): AiReferrerClassification | null => {
  if (!url) return null;
  const utmSource = (url.searchParams.get("utm_source") ?? "").trim().toLowerCase();
  const utmMedium = (url.searchParams.get("utm_medium") ?? "").trim().toLowerCase();

  const mappedSource = UTM_SOURCE_TO_AI_SOURCE[utmSource];
  if (mappedSource) {
    return { source: mappedSource, medium: "utm" };
  }
  if (AI_UTM_MEDIUMS.has(utmMedium)) {
    return { source: "ai-generic", medium: "utm" };
  }
  return null;
};

const classifyByReferrer = (
  referrerUrl: URL | null,
  currentUrl: URL | null
): AiReferrerClassification | null => {
  if (!referrerUrl) return null;
  // Internal navigation: the referrer is our own origin, which must never be
  // read as a new acquisition source.
  if (currentUrl && normalizeHost(referrerUrl.hostname) === normalizeHost(currentUrl.hostname)) {
    return null;
  }
  const source = matchReferrerUrl(referrerUrl);
  return source ? { source, medium: "referral" } : null;
};

/**
 * Classifies a landing as coming from an answer engine, or returns `null` when
 * there is no evidence of one. UTM tags win over the referrer header: an
 * assistant that both strips the referrer and tags the URL is the common case,
 * and an explicitly tagged campaign is the more specific signal.
 */
export const classifyAiReferrer = (input: AiReferrerInput): AiReferrerClassification | null => {
  const currentUrl = parseUrl(input.url);
  const utmClassification = classifyByUtm(currentUrl);
  if (utmClassification) return utmClassification;
  return classifyByReferrer(parseUrl(input.referrer), currentUrl);
};

const isAiFirstTouch = (value: unknown): value is AiFirstTouch => {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    AI_SOURCES.includes(candidate.source as AiSource) &&
    AI_MEDIUMS.includes(candidate.medium as AiReferrerMedium) &&
    typeof candidate.landingPath === "string" &&
    typeof candidate.firstSeenAt === "string"
  );
};

/**
 * Reads the persisted first touch. Anything unreadable or malformed (blocked
 * storage, hand-edited value, older shape) is treated as absent.
 */
export const readAiFirstTouch = (): AiFirstTouch | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AI_FIRST_TOUCH_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isAiFirstTouch(parsed) ? parsed : null;
  } catch {
    // SUPPRESSED: localStorage can throw when storage is disabled (Safari
    // private mode, blocked third-party contexts) and JSON.parse throws on a
    // corrupted value. Attribution is best-effort telemetry — degrading to
    // "no first touch" is the correct behavior, and reporting it would be noise.
    return null;
  }
};

const writeAiFirstTouch = (firstTouch: AiFirstTouch): void => {
  try {
    // Not gated on the analytics env. localStorage is origin-scoped and every
    // environment (localhost, preview, staging, production) is its own origin,
    // so a record written outside production can never be inherited by
    // production events — and gating would make the feature unverifiable in
    // exactly the preview deploys where it has to be QA'd.
    window.localStorage.setItem(AI_FIRST_TOUCH_STORAGE_KEY, JSON.stringify(firstTouch));
  } catch {
    // SUPPRESSED: same blocked-storage case as readAiFirstTouch. The in-memory
    // memo below still carries the classification for the rest of this page
    // load, so only the cross-page-load memory is lost.
  }
};

/**
 * Resolved-once-per-page-load memo. `{ value }` means resolved (possibly to
 * `null`); `null` means not resolved yet. It keeps attribution alive when
 * localStorage writes are blocked, and spares every tracked event a repeated
 * read-and-JSON.parse.
 */
let resolvedFirstTouch: { value: AiFirstTouch | null } | null = null;

/** Set when this page load created the record; consumed by the first reader. */
let landingReportPending = false;

/**
 * Resolves the visitor's first touch, capturing it from the current referrer
 * and URL if this page load is the landing itself.
 *
 * Resolution is lazy rather than driven solely by `AiReferrerTracker` on
 * purpose: the tracker is behind a deferred `ssr:false` chunk, so a page that
 * reports a view event from its own mount effect would otherwise beat it and
 * emit an unattributed event. Whichever caller runs first performs the capture.
 */
const resolveAiFirstTouch = (input?: AiReferrerInput): AiFirstTouch | null => {
  if (resolvedFirstTouch) return resolvedFirstTouch.value;
  if (typeof window === "undefined") return null;

  const existing = readAiFirstTouch();
  if (existing) {
    resolvedFirstTouch = { value: existing };
    return existing;
  }

  const resolved: AiReferrerInput = input ?? {
    referrer: window.document.referrer,
    url: window.location.href,
  };

  const classification = classifyAiReferrer(resolved);
  if (!classification) {
    resolvedFirstTouch = { value: null };
    return null;
  }

  const firstTouch: AiFirstTouch = {
    source: classification.source,
    medium: classification.medium,
    landingPath: parseUrl(resolved.url)?.pathname ?? "/",
    firstSeenAt: new Date().toISOString(),
  };

  writeAiFirstTouch(firstTouch);
  resolvedFirstTouch = { value: firstTouch };
  landingReportPending = true;
  return firstTouch;
};

/**
 * Write-once first-touch capture.
 *
 * An existing record is NEVER overwritten. That is what makes the attribution
 * survive everything that happens after the landing: internal hard navigations
 * (whose referrer is our own origin), later direct visits, and even a later
 * visit from a *different* answer engine all keep the original source.
 *
 * `isNew` is true exactly once per captured record, for whichever caller
 * reports the landing — it stays true even if `getAiFirstTouchProps` happened
 * to perform the capture first.
 */
export const captureAiFirstTouch = (input?: AiReferrerInput): CaptureAiFirstTouchResult => {
  if (typeof window === "undefined") return { firstTouch: null, isNew: false };

  const firstTouch = resolveAiFirstTouch(input);
  if (!firstTouch) return { firstTouch: null, isNew: false };

  const isNew = landingReportPending;
  landingReportPending = false;
  return { firstTouch, isNew };
};

/**
 * Analytics properties describing the AI origin of the current visitor, merged
 * into every tracked event. Empty when the visit has no AI first touch.
 */
export const getAiFirstTouchProps = (): Record<string, unknown> => {
  const firstTouch = resolveAiFirstTouch();
  if (!firstTouch) return {};
  return {
    ai_source: firstTouch.source,
    ai_source_medium: firstTouch.medium,
    ai_first_touch_at: firstTouch.firstSeenAt,
  };
};

/** Test-only reset of the per-page-load memo between test cases. */
export const __resetAiFirstTouchCacheForTests = (): void => {
  resolvedFirstTouch = null;
  landingReportPending = false;
};
