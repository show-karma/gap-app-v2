"use client";

/**
 * Find-funders landing hero — the eyebrow, <h1>, lead copy, search box and
 * example chips.
 *
 * The interactive twin of the static hero in the route's loading.tsx
 * fallback: same markup, same classes, and the copy comes from
 * ../lib/hero-content so the two can never drift. See that loading.tsx for
 * why the FALLBACK carries the crawler-visible version of the hero
 * (DEV-586).
 *
 * Owns its own search submission (session store + router) so the page can
 * render it as a sibling of LandingPageClient without prop-drilling.
 */
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { NON_PROFITS_PAGES } from "@/utilities/pages";
import { HERO_CHIPS, HERO_SUB, HERO_TITLE_LINE_1, HERO_TITLE_LINE_2 } from "../lib/hero-content";
import { FILINGS_STATS } from "../lib/stats";
import { useSearchSessionStore } from "../store/search-session";
import { ConnectLogos } from "./connect-cta";
import { ArrowIcon, SearchIcon } from "./landing-icons";

// ————————————————————————— Rotating Placeholder —————————————————————————

const PLACEHOLDER_EXAMPLES = [
  "Find foundations funding youth literacy in Ohio under $10M…",
  "Draft an LOI to the Hewlett Foundation for our climate program…",
  "Family foundations in Georgia that funded peers like us…",
  "Funders of refugee resettlement giving over $250k since 2024…",
  "Build me a prospect list for a $2M capital campaign…",
];

function RotatingPlaceholder({ visible }: { visible: boolean }) {
  const [i, setI] = useState(0);
  const [sub, setSub] = useState("");
  const [phase, setPhase] = useState<"typing" | "holding" | "deleting">("typing");

  useEffect(() => {
    if (!visible) return;
    const full = PLACEHOLDER_EXAMPLES[i];
    let t: ReturnType<typeof setTimeout>;
    if (phase === "typing") {
      if (sub.length < full.length) {
        t = setTimeout(() => setSub(full.slice(0, sub.length + 1)), 35 + Math.random() * 30);
      } else {
        t = setTimeout(() => setPhase("holding"), 1800);
      }
    } else if (phase === "holding") {
      t = setTimeout(() => setPhase("deleting"), 900);
    } else if (phase === "deleting") {
      if (sub.length > 0) {
        t = setTimeout(() => setSub(sub.slice(0, -1)), 18);
      } else {
        setPhase("typing");
        setI((i + 1) % PLACEHOLDER_EXAMPLES.length);
      }
    }
    return () => clearTimeout(t);
  }, [sub, phase, i, visible]);

  if (!visible) return <div className="lp-search-placeholder" />;
  return (
    <div className="lp-search-placeholder">
      <span>{sub}</span>
      <span className="lp-typing-cursor" />
    </div>
  );
}

// ————————————————————————— Hero —————————————————————————

export function LandingHero() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [animating, setAnimating] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const onSearch = useCallback(
    (rawQuery: string) => {
      const trimmed = rawQuery.trim();
      if (!trimmed) return;
      // Persist the query so the workbench (ChatView) can read it via
      // getSession(searchId) and run it; skipping this drops the query.
      const sessionId = useSearchSessionStore.getState().createSession(trimmed);
      router.push(NON_PROFITS_PAGES.SEARCH(sessionId), { scroll: false });
    },
    [router]
  );

  const onChipClick = useCallback(
    (text: string, e: React.MouseEvent<HTMLButtonElement>) => {
      const chipEl = e.currentTarget;
      const inputEl = inputRef.current;
      if (!chipEl || !inputEl) return;

      if (intervalRef.current) clearInterval(intervalRef.current);

      const chipRect = chipEl.getBoundingClientRect();
      const inputRect = inputEl.getBoundingClientRect();
      const dx = inputRect.left + 20 - chipRect.left;
      const dy = inputRect.top + inputRect.height / 2 - chipRect.height / 2 - chipRect.top;
      chipEl.style.setProperty("--fly-transform", `translate(${dx}px, ${dy}px)`);
      chipEl.classList.add("flying");

      setAnimating(true);
      inputEl.focus();
      let charIdx = 0;
      setQuery("");
      intervalRef.current = setInterval(() => {
        charIdx++;
        if (charIdx <= text.length) {
          setQuery(text.slice(0, charIdx));
        } else {
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;
          setAnimating(false);
          onSearch(text);
        }
      }, 16);
      timeoutRef.current = setTimeout(() => chipEl.classList.remove("flying"), 600);
    },
    [onSearch]
  );

  const handleSubmit = () => {
    if (query.trim()) onSearch(query.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && query.trim()) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const showPlaceholder = !focused && query.length === 0 && !animating;

  return (
    <section className="lp-hero" id="hero">
      <div className="lp-hero-grid" />
      <div className="lp-container lp-hero-inner lp-fade-in">
        <div className="lp-eyebrow">
          <span className="lp-eyebrow-dot" />
          <span>AI Agents for Funder Research &middot; Works in</span>
          <ConnectLogos />
          <span>Claude &amp; ChatGPT</span>
        </div>
        <h1 className="lp-hero-title">
          {HERO_TITLE_LINE_1}
          <br />
          <span className="italic">{HERO_TITLE_LINE_2}</span>
        </h1>
        <p className="lp-hero-sub">{HERO_SUB}</p>

        <div className="lp-search-shell">
          <div className="lp-search-meta">
            <div className="lp-search-meta-left">
              <span className="lp-search-meta-chip">
                <span className="lp-status-dot" style={{ background: "var(--lp-accent)" }} />
                <span>ASK IN PLAIN ENGLISH</span>
              </span>
              <span>&middot;</span>
              <span>{FILINGS_STATS.indexedShortLabel}</span>
            </div>
            <span>&#8984; K</span>
          </div>

          <div className="lp-search-box">
            <div className="lp-search-row">
              <span className="lp-search-icon">
                <SearchIcon />
              </span>
              <div className="lp-search-input-wrap">
                <Input
                  ref={inputRef}
                  className="lp-search-input h-auto rounded-none border-0 bg-transparent px-0 py-3 text-base shadow-none focus-visible:ring-0 md:text-base"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  onKeyDown={handleKeyDown}
                  aria-label="Ask the prospecting agent"
                />
                <RotatingPlaceholder visible={showPlaceholder} />
              </div>
              <div className="lp-search-actions">
                <span className="lp-search-kbd">&crarr;</span>
                <button
                  className="lp-search-submit"
                  disabled={query.length === 0}
                  onClick={handleSubmit}
                  type="button"
                >
                  Ask agent <ArrowIcon />
                </button>
              </div>
            </div>
          </div>

          <div className="lp-chips">
            <div className="lp-chips-label">TRY AN EXAMPLE</div>
            <div className="lp-chips-grid">
              {HERO_CHIPS.map((c, idx) => (
                <button
                  key={`${c.cat}-${idx}`}
                  className="lp-chip"
                  onClick={(e) => onChipClick(c.text, e)}
                  type="button"
                >
                  <div className="lp-chip-content">
                    <span className="lp-chip-category">{`// ${c.cat}`}</span>
                    <span className="lp-chip-text">{c.text}</span>
                  </div>
                  <span className="lp-chip-arrow">
                    <ArrowIcon />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
