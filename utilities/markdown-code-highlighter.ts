import type { CodeHighlighterPlugin, HighlightResult } from "@streamdown/code";
import type { BundledLanguage, BundledTheme, HighlighterCore, LanguageInput } from "shiki";
import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

/**
 * Syntax highlighting for Streamdown code blocks, with the same interface as `@streamdown/code`.
 *
 * `@streamdown/code` imports Shiki's full bundle (`shiki`), which references ~200 grammars and every
 * theme as lazy imports. A server bundler cannot tell which of them a page will ask for, so all of
 * them ship: ~9.7 MB of the Cloudflare Worker bundle (docs/cloudflare-opennext-feasibility.md),
 * where the limit is 64 MiB. This plugin registers only the languages below; a fence in any other
 * language renders as plain text, which is what `@streamdown/code` already did for unknown ones.
 */
const LANGUAGES = {
  javascript: () => import("shiki/langs/javascript.mjs"),
  typescript: () => import("shiki/langs/typescript.mjs"),
  jsx: () => import("shiki/langs/jsx.mjs"),
  tsx: () => import("shiki/langs/tsx.mjs"),
  json: () => import("shiki/langs/json.mjs"),
  shellscript: () => import("shiki/langs/shellscript.mjs"),
  python: () => import("shiki/langs/python.mjs"),
  solidity: () => import("shiki/langs/solidity.mjs"),
  rust: () => import("shiki/langs/rust.mjs"),
  go: () => import("shiki/langs/go.mjs"),
  yaml: () => import("shiki/langs/yaml.mjs"),
  toml: () => import("shiki/langs/toml.mjs"),
  sql: () => import("shiki/langs/sql.mjs"),
  html: () => import("shiki/langs/html.mjs"),
  css: () => import("shiki/langs/css.mjs"),
  diff: () => import("shiki/langs/diff.mjs"),
} satisfies Record<string, () => Promise<{ default: LanguageInput }>>;

type SupportedLanguage = keyof typeof LANGUAGES;

const ALIASES: Record<string, SupportedLanguage> = {
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  ts: "typescript",
  mts: "typescript",
  cts: "typescript",
  sh: "shellscript",
  bash: "shellscript",
  zsh: "shellscript",
  shell: "shellscript",
  console: "shellscript",
  py: "python",
  sol: "solidity",
  rs: "rust",
  golang: "go",
  yml: "yaml",
  jsonc: "json",
  json5: "json",
  htm: "html",
  patch: "diff",
};

const THEMES = {
  "github-light": () => import("shiki/themes/github-light.mjs"),
  "github-dark": () => import("shiki/themes/github-dark.mjs"),
} as const;

type SupportedTheme = keyof typeof THEMES;

const DEFAULT_THEMES: [SupportedTheme, SupportedTheme] = ["github-light", "github-dark"];

const engine = createJavaScriptRegexEngine({ forgiving: true });

function resolveLanguage(language: string): string {
  const normalized = language.trim().toLowerCase();
  return ALIASES[normalized] ?? normalized;
}

function isSupportedLanguage(language: string): language is SupportedLanguage {
  return Object.hasOwn(LANGUAGES, language);
}

function resolveTheme(theme: string, fallback: SupportedTheme): SupportedTheme {
  return Object.hasOwn(THEMES, theme) ? (theme as SupportedTheme) : fallback;
}

const highlighters = new Map<string, Promise<HighlighterCore>>();

function getHighlighter(themes: [SupportedTheme, SupportedTheme]): Promise<HighlighterCore> {
  const key = themes.join(":");
  let highlighter = highlighters.get(key);
  if (!highlighter) {
    highlighter = createHighlighterCore({
      themes: themes.map((theme) => THEMES[theme]()),
      langs: [],
      engine,
    });
    highlighters.set(key, highlighter);
  }
  return highlighter;
}

const results = new Map<string, HighlightResult>();
const waiting = new Map<string, Set<(result: HighlightResult) => void>>();

// Same key shape as `@streamdown/code`: long blocks are identified by length plus both ends.
function resultKey(code: string, language: string, themes: [string, string]): string {
  const head = code.slice(0, 100);
  const tail = code.length > 100 ? code.slice(-100) : "";
  return `${language}:${themes[0]}:${themes[1]}:${code.length}:${head}:${tail}`;
}

export function createCodePlugin(): CodeHighlighterPlugin {
  return {
    name: "shiki",
    type: "code-highlighter",
    supportsLanguage(language) {
      return isSupportedLanguage(resolveLanguage(language));
    },
    getSupportedLanguages() {
      return Object.keys(LANGUAGES) as BundledLanguage[];
    },
    getThemes() {
      return DEFAULT_THEMES as [BundledTheme, BundledTheme];
    },
    highlight({ code, language, themes }, callback) {
      const resolved = resolveLanguage(language);
      const key = resultKey(code, resolved, themes);
      const cached = results.get(key);
      if (cached) return cached;

      // Highlighting is asynchronous, so a server render only ever gets `null` here; skip the work
      // there instead of loading grammars for a result nobody reads.
      if (typeof window === "undefined") return null;

      if (callback) {
        const callbacks = waiting.get(key) ?? new Set();
        callbacks.add(callback);
        waiting.set(key, callbacks);
      }

      const lightDark: [SupportedTheme, SupportedTheme] = [
        resolveTheme(themes[0], DEFAULT_THEMES[0]),
        resolveTheme(themes[1], DEFAULT_THEMES[1]),
      ];

      getHighlighter(lightDark)
        .then(async (highlighter) => {
          const lang = isSupportedLanguage(resolved) ? resolved : "text";
          if (lang !== "text" && !highlighter.getLoadedLanguages().includes(lang)) {
            await highlighter.loadLanguage(LANGUAGES[lang]());
          }
          const result = highlighter.codeToTokens(code, {
            lang,
            themes: { light: lightDark[0], dark: lightDark[1] },
          });
          results.set(key, result);
          for (const notify of waiting.get(key) ?? []) notify(result);
          waiting.delete(key);
        })
        .catch((error: unknown) => {
          console.error("[markdown-code-highlighter] Failed to highlight code:", error);
          waiting.delete(key);
        });

      return null;
    },
  };
}

export const code = createCodePlugin();
