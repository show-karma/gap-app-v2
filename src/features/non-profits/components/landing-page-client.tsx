"use client";

/**
 * LandingPageClient — non-profits landing page.
 *
 * Ported from grant-atlas src/features/grant-atlas/components/landing-page.tsx.
 *
 * Phase 2 changes:
 * - Router: useNavigate (TanStack Router) → useRouter (next/navigation)
 * - Search: createSession(query) in the store, then navigate to SEARCH(id)
 * - Nav: lp-nav section removed — renders inside gap-app-v2 global chrome
 * - Clipboard: navigator.clipboard → useCopyToClipboard hook
 * - CSS: lp-* classes from styles/non-profits-landing.css (route-scoped import)
 * - No streaming in Phase 2; streaming wired in Phase 3
 */

import "../../../../styles/non-profits-landing.css";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { Link } from "@/src/components/navigation/Link";
import { NON_PROFITS_PAGES } from "@/utilities/pages";
import { INSTALL_CONFIGS, type InstallTab } from "../lib/install-configs";
import { FILINGS_STATS } from "../lib/stats";
import { useSearchSessionStore } from "../store/search-session";

// ————————————————————————— Icons —————————————————————————

const Icon = {
  search: (p: React.SVGProps<SVGSVGElement>) => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...p}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  ),
  arrow: (p: React.SVGProps<SVGSVGElement>) => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...p}
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  ),
};

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

// ————————————————————————— Chip Data —————————————————————————

const CHIP_DATA = [
  {
    cat: "PROSPECTING",
    text: "Family foundations under $50M that funded youth literacy in the Midwest",
  },
  {
    cat: "PROSPECTING",
    text: "Funders of refugee resettlement giving over $250k since 2024",
  },
  {
    cat: "PROSPECTING",
    text: "Foundations that funded our peers in the climate justice space last year",
  },
  {
    cat: "RESEARCH",
    text: "Top 10 foundations by total grants paid in 2025",
  },
  {
    cat: "PROSPECTING",
    text: "Build a tiered prospect list for a $2M environmental capital campaign",
  },
  {
    cat: "RESEARCH",
    text: "Foundations with a history of multi-year general operating support",
  },
] as const;

// ————————————————————————— Hero —————————————————————————

function Hero({ onSearch }: { onSearch: (query: string) => void }) {
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
          <span>AI Agents for Funder Research &middot; Works in Claude &amp; ChatGPT</span>
        </div>
        <h1 className="lp-hero-title">
          Stop hunting for funders.
          <br />
          <span className="italic">Ask an agent.</span>
        </h1>
        <p className="lp-hero-sub">
          AI agents that find the right foundations and funders for your mission, grounded in every
          IRS 990 on record. Ask in plain English, get a cited prospect list. Use it here, or take
          the agent with you to Claude or ChatGPT.
        </p>

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
                <Icon.search />
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
                  Ask agent <Icon.arrow />
                </button>
              </div>
            </div>
          </div>

          <div className="lp-chips">
            <div className="lp-chips-label">TRY AN EXAMPLE</div>
            <div className="lp-chips-grid">
              {CHIP_DATA.map((c, idx) => (
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
                    <Icon.arrow />
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="lp-hero-foot">
            <span>Prefer to stay in your AI tool?</span>
            <Link href={NON_PROFITS_PAGES.CONNECT_CLAUDE} className="lp-hero-foot-link">
              Add to Claude <Icon.arrow />
            </Link>
            <Link href={NON_PROFITS_PAGES.CONNECT_CHATGPT} className="lp-hero-foot-link">
              Add to ChatGPT <Icon.arrow />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ————————————————————————— The Shift (pitch) —————————————————————————

function TheShift() {
  return (
    <section id="shift">
      <div className="lp-container">
        <div className="lp-section-head">
          <div>
            <div className="lp-section-label">01 &mdash; THE SHIFT</div>
            <h2 className="lp-section-title">
              Agents handle the research.
              <br />
              <span className="italic">You handle the relationships.</span>
            </h2>
          </div>
          <p className="lp-section-desc">
            Finding the right funders is hours of database wrangling, 990 archaeology, and
            spreadsheet upkeep. All of it before you write a single line of outreach. That&apos;s
            grunt work an agent should be doing for you, so your team can spend its hours on the
            work only you can do.
          </p>
        </div>

        <div className="lp-caps">
          <div className="lp-cap">
            <div className="lp-cap-num">01</div>
            <div className="lp-cap-title">Your team is not being replaced.</div>
            <div className="lp-cap-desc">
              You still build the relationships. You still tell the story. You still close the
              grants. The agents just do the funder research and prep so you can show up ready.
            </div>
          </div>
          <div className="lp-cap">
            <div className="lp-cap-num">02</div>
            <div className="lp-cap-title">Talk to it, don&apos;t configure it.</div>
            <div className="lp-cap-desc">
              No filters, no dropdowns, no boolean gymnastics. Ask &ldquo;who funded our peers last
              year?&rdquo; and the agent figures the rest out.
            </div>
          </div>
          <div className="lp-cap">
            <div className="lp-cap-num">03</div>
            <div className="lp-cap-title">Lives where you already work.</div>
            <div className="lp-cap-desc">
              Use it inside Claude or ChatGPT. No 13th tool to log into. No new interface to learn.
            </div>
          </div>
          <div className="lp-cap">
            <div className="lp-cap-num">04</div>
            <div className="lp-cap-title">Grounded in real filings.</div>
            <div className="lp-cap-desc">
              Every funder, every grant, every dollar figure links back to the actual 990-PF.
              Nothing hallucinated.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ————————————————————————— Meet the Agents —————————————————————————

const SUPPORTING_AGENTS = [
  {
    num: "02",
    tag: "RESEARCH AGENT",
    status: "live" as const,
    title: "Deep-dive any foundation in seconds.",
    desc: "Pull a funder's giving history, officers, peer co-funders, and historical priorities from the 990 record. Skip the PDF scavenger hunt before your first call.",
    qs: [
      "Summarize the Hewlett Foundation's last 5 years of climate giving",
      "Who sits on the board of the Mott Foundation and what else do they fund?",
    ],
  },
  {
    num: "03",
    tag: "GRANTS AGENT",
    status: "soon" as const,
    title: "Find open RFPs and grant opportunities.",
    desc: "Surfaces live grant opportunities aligned to your cause area, geography, and stage. Not just funders, but the actual RFPs they have open right now.",
    qs: [
      "Open RFPs for youth education in California closing in the next 60 days",
      "Bridge funding opportunities for nonprofits under $1M budget",
    ],
  },
  {
    num: "04",
    tag: "WATCHER AGENT",
    status: "soon" as const,
    title: "Get pinged the moment a fit appears.",
    desc: "Stand a watch for new 990 filings, funder priority shifts, and fresh RFPs. The agent surfaces only the ones that match your work, the moment they land.",
    qs: [
      "Ping me when funders open climate RFPs in the Bay Area",
      "Alert me on new local family foundations under $50M",
    ],
  },
  {
    num: "05",
    tag: "PEOPLE AGENT",
    status: "soon" as const,
    title: "Find the right human at every foundation.",
    desc: "Program officers, trustees, and grants managers tied to your cause area, with their giving signal, recent moves, and who in your network already knows them.",
    qs: [
      "Who is the climate program officer at the Kresge Foundation?",
      "Trustees of Bay Area family foundations active in housing",
    ],
  },
  {
    num: "06",
    tag: "OUTREACH AGENT",
    status: "soon" as const,
    title: "Warm intros and first-touch emails, drafted.",
    desc: "Hand the agent a short list and it drafts the first email to each funder, cited to their priorities, in your voice, ready for you to review and send.",
    qs: [
      "Draft an intro email to the Walton Family Foundation for our literacy program",
      "Rewrite this LOI to match the Surdna Foundation's funding lens",
    ],
  },
] as const;

function StatusBadge({ status }: { status: "live" | "soon" }) {
  if (status === "live") {
    return (
      <span className="lp-badge lp-badge-live">
        <span className="lp-status-dot" /> LIVE
      </span>
    );
  }
  return <span className="lp-badge lp-badge-soon">COMING SOON</span>;
}

function Agents() {
  return (
    <section id="agents">
      <div className="lp-container">
        <div className="lp-section-head">
          <div>
            <div className="lp-section-label">02 &mdash; YOUR AGENT TEAM</div>
            <h2 className="lp-section-title">
              Two agents live today.
              <br />
              <span className="italic">Four more shipping soon.</span>
            </h2>
          </div>
          <p className="lp-section-desc">
            Each agent owns one part of the funder-research lifecycle, namely the grunt-work parts.
            They run inside Claude, ChatGPT, or right here. We&apos;re shipping in the open: live
            means you can use it today.
          </p>
        </div>

        {/* Hero agent: Prospecting */}
        <div className="lp-agent-hero">
          <div className="lp-agent-hero-left">
            <div className="lp-aud-head">
              <span>{`// PROSPECTING AGENT`}</span>
              <span className="lp-aud-num">01</span>
            </div>
            <StatusBadge status="live" />
            <div className="lp-agent-hero-title">Find funders who actually fund what you do.</div>
            <div className="lp-agent-hero-desc">
              Built on every IRS 990-PF filing on record. Ask in plain English &mdash; by cause
              area, geography, check size, peer-funder networks &mdash; and get a ranked, cited
              prospect list in seconds. Skip the database wrangling.
            </div>
            <div className="lp-aud-qs">
              <div className="lp-aud-q">
                Family foundations under $50M that funded youth literacy in the Midwest
              </div>
              <div className="lp-aud-q">
                Foundations that funded our peers in the climate justice space last year
              </div>
              <div className="lp-aud-q">
                Build a tiered prospect list for a $2M capital campaign
              </div>
            </div>
          </div>
          <div className="lp-agent-hero-right">
            <div className="lp-chat-preview">
              <div className="lp-chat-head">
                <span>{"// CLAUDE · prospecting agent active"}</span>
                <span>LIVE</span>
              </div>
              <div className="lp-chat-body">
                <div className="lp-chat-user">
                  Who funds literacy programs in Ohio under $10M in assets?
                </div>
                <div className="lp-chat-tool">
                  <span>&rarr;</span>
                  <span>
                    <span className="accent">funders.search</span>(
                    {`{geo: "OH", cause: "literacy", assets_lt: 10_000_000}`})
                  </span>
                </div>
                <div className="lp-chat-assist">
                  Found <strong>23 foundations</strong>. Top three by recent giving:{" "}
                  <strong>Cleveland Foundation</strong> ($842k, 2024),{" "}
                  <strong>George Gund Foundation</strong> ($640k, 2023), and{" "}
                  <strong>Nord Family Foundation</strong> ($480k, 2024). Each figure links to its
                  990-PF. Want me to draft outreach for the top five?
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lp-audience-grid lp-agents-grid">
          {SUPPORTING_AGENTS.map((a) => (
            <div key={a.num} className="lp-aud">
              <div className="lp-aud-head">
                <span>{`// ${a.tag}`}</span>
                <span className="lp-aud-num">{a.num}</span>
              </div>
              <StatusBadge status={a.status} />
              <div className="lp-aud-title">{a.title}</div>
              <div className="lp-aud-desc">{a.desc}</div>
              <div className="lp-aud-qs">
                {a.qs.map((q) => (
                  <div key={q} className="lp-aud-q">
                    {q}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ————————————————————————— How It Works —————————————————————————

function HowItWorks() {
  return (
    <section id="how">
      <div className="lp-container">
        <div className="lp-section-head">
          <div>
            <div className="lp-section-label">03 &mdash; HOW IT WORKS</div>
            <h2 className="lp-section-title">
              Three steps to
              <br />
              <span className="italic">get an agent working for you.</span>
            </h2>
          </div>
          <p className="lp-section-desc">
            No new dashboard to learn. The agents live inside the AI tools you already use &mdash;
            so the workflow is just a chat.
          </p>
        </div>

        <div className="lp-how-grid">
          <div className="lp-how-step">
            <div className="lp-how-step-num">&rarr; STEP 01 / CONNECT</div>
            <div className="lp-how-step-viz lp-how-step-viz-screenshot">
              <div className="lp-screenshot-placeholder">
                <div className="lp-screenshot-label">SCREENSHOT</div>
                <div className="lp-screenshot-hint">
                  Claude &rarr; Settings &rarr; Connectors &rarr; Add Karma Find Funders
                </div>
              </div>
            </div>
            <div>
              <div className="lp-how-step-title">Add the connector. One time.</div>
              <div className="lp-how-step-body">
                In Claude or ChatGPT: paste the MCP URL into Connectors and sign in once. The agent
                shows up in every chat from then on.
              </div>
            </div>
          </div>

          <div className="lp-how-step">
            <div className="lp-how-step-num">&rarr; STEP 02 / ASK</div>
            <div className="lp-how-step-viz">
              <div className="lp-viz-line">
                <span className="dim">you</span>{" "}
                <span>&ldquo;Find funders for our youth literacy program in Ohio&rdquo;</span>
              </div>
              <div className="lp-viz-line">
                <span className="dim">you</span>{" "}
                <span>
                  &ldquo;Filter to under $10M assets and recent giving in this space&rdquo;
                </span>
              </div>
              <div className="lp-viz-line">
                <span className="dim">you</span>{" "}
                <span>
                  &ldquo;Pull the program officer and last 3 years of giving for the top 5&rdquo;
                </span>
              </div>
              <div style={{ flex: 1 }} />
              <div className="lp-viz-line">
                <span className="dim">no forms &middot; no filters &middot; no dropdowns</span>
              </div>
            </div>
            <div>
              <div className="lp-how-step-title">Talk like you would to a colleague.</div>
              <div className="lp-how-step-body">
                The agent understands fundraising vocabulary. &ldquo;Small foundations&rdquo; means
                &lt;$10M. &ldquo;Recent&rdquo; means last 24 months. Edit any assumption inline.
              </div>
            </div>
          </div>

          <div className="lp-how-step">
            <div className="lp-how-step-num">&rarr; STEP 03 / DONE</div>
            <div className="lp-how-step-viz">
              <div className="lp-viz-line">
                <span className="kw">prospect_list.csv</span>{" "}
                <span className="dim">&middot; 23 funders, ranked &amp; cited</span>
              </div>
              <div className="lp-viz-line">
                <span className="kw">funder_briefs.md</span>{" "}
                <span className="dim">&middot; top 5, with officers &amp; giving history</span>
              </div>
              <div className="lp-viz-line">
                <span className="kw">peer_overlap</span>{" "}
                <span className="dim">&middot; who else funds your space</span>
              </div>
              <div style={{ flex: 1 }} />
              <div className="lp-viz-line">
                <span className="dim">every figure cited &middot; every source linked</span>
              </div>
            </div>
            <div>
              <div className="lp-how-step-title">
                The agent does the research, you make the call.
              </div>
              <div className="lp-how-step-body">
                Ranked lists, funder briefs, and peer overlap, delivered in the chat. Take them
                straight into your outreach with a clear picture of who&apos;s worth pursuing.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ————————————————————————— No 13th Tool —————————————————————————

function NoNewTool() {
  return (
    <section id="no-new-tool" className="lp-anti">
      <div className="lp-container">
        <div className="lp-section-head">
          <div>
            <div className="lp-section-label">04 &mdash; NO NEW LOGIN</div>
            <h2 className="lp-section-title">
              You already have 12 tools.
              <br />
              <span className="italic">We&apos;re not the 13th.</span>
            </h2>
          </div>
          <p className="lp-section-desc">
            Most fundraising software wants to be the place you live. We don&apos;t. Karma Find
            Funders lives inside Claude and ChatGPT &mdash; the AI tool already open in your
            browser. No new tab, no new interface, no migration.
          </p>
        </div>

        <div className="lp-anti-grid">
          <div className="lp-anti-row">
            <span className="lp-anti-x">&times;</span>
            <span className="lp-anti-old">Yet another dashboard with filters and exports</span>
            <span className="lp-anti-arrow">&rarr;</span>
            <span className="lp-anti-new">Just chat in Claude or ChatGPT</span>
          </div>
          <div className="lp-anti-row">
            <span className="lp-anti-x">&times;</span>
            <span className="lp-anti-old">A login your team will forget</span>
            <span className="lp-anti-arrow">&rarr;</span>
            <span className="lp-anti-new">Connect once, agent is always there</span>
          </div>
          <div className="lp-anti-row">
            <span className="lp-anti-x">&times;</span>
            <span className="lp-anti-old">Training sessions and onboarding decks</span>
            <span className="lp-anti-arrow">&rarr;</span>
            <span className="lp-anti-new">If you can text, you can use it</span>
          </div>
          <div className="lp-anti-row">
            <span className="lp-anti-x">&times;</span>
            <span className="lp-anti-old">Copy-pasting between tabs</span>
            <span className="lp-anti-arrow">&rarr;</span>
            <span className="lp-anti-new">Search, brief, compare in one chat</span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ————————————————————————— Connector / Install —————————————————————————

function CopyButton({ text }: { text: string }) {
  const [, copy] = useCopyToClipboard();
  const [state, setState] = useState<"idle" | "copied">("idle");

  const handleCopy = () => {
    copy(text, "Copied!")
      .then((ok) => {
        if (ok) {
          setState("copied");
          setTimeout(() => setState("idle"), 1400);
        }
      })
      .catch((error) => {
        console.warn("Copy install snippet failed", error);
      });
  };

  return (
    <button
      type="button"
      className={`lp-copy-btn ${state === "copied" ? "copied" : ""}`}
      onClick={handleCopy}
      aria-live="polite"
    >
      {state === "copied" ? "COPIED" : "COPY"}
    </button>
  );
}

function Connector() {
  const [tab, setTab] = useState<InstallTab>("claude");
  const cfg = INSTALL_CONFIGS[tab];

  return (
    <section id="connector" className="lp-connector">
      <div className="lp-container lp-connector-inner">
        <div>
          <div className="lp-section-label">05 &mdash; ADD THE AGENT</div>
          <h2 className="lp-connector-title">
            One connector,
            <br />
            <span className="italic">and the agents are yours.</span>
          </h2>
          <p className="lp-connector-sub">
            Add Karma Find Funders to Claude or ChatGPT in under a minute. From then on, every
            funder question you ask in any chat goes through the agents.
          </p>
          <div className="lp-connector-hosts">
            {["CLAUDE DESKTOP", "CLAUDE.AI", "CHATGPT", "CURSOR", "REST / SDK"].map((h) => (
              <span key={h} className="lp-host-chip">
                <span className="lp-status-dot" /> {h}
              </span>
            ))}
          </div>
          <div className="lp-connector-stats">
            <div className="lp-conn-stat">
              <div className="lp-conn-stat-num">~60s</div>
              <div className="lp-conn-stat-label">To set up</div>
            </div>
            <div className="lp-conn-stat">
              <div className="lp-conn-stat-num">0</div>
              <div className="lp-conn-stat-label">New logins</div>
            </div>
            <div className="lp-conn-stat">
              <div className="lp-conn-stat-num">100%</div>
              <div className="lp-conn-stat-label">Cited answers</div>
            </div>
          </div>

          <div className="lp-chat-preview">
            <div className="lp-chat-head">
              <span>{"// CHATGPT · karma find funders agent active"}</span>
              <span>LIVE</span>
            </div>
            <div className="lp-chat-body">
              <div className="lp-chat-user">
                Find foundations that funded our peers in climate justice last year, then brief me
                on the top three.
              </div>
              <div className="lp-chat-tool">
                <span>&rarr;</span>
                <span>
                  <span className="accent">funders.search</span> &rarr;{" "}
                  <span className="accent">funder.brief</span>
                </span>
              </div>
              <div className="lp-chat-assist">
                Pulled <strong>14 peer-funded foundations</strong>. Briefs on the top three include
                last three years of climate giving, program officers, and check-size patterns. Each
                figure cited back to the 990 it came from.
              </div>
            </div>
          </div>
        </div>

        <div className="lp-install">
          <div className="lp-install-tabs">
            {(
              Object.entries(INSTALL_CONFIGS) as [
                InstallTab,
                (typeof INSTALL_CONFIGS)[InstallTab],
              ][]
            ).map(([k, v]) => (
              <button
                key={k}
                type="button"
                className={`lp-install-tab ${tab === k ? "active" : ""}`}
                onClick={() => setTab(k)}
              >
                <span>{v.label.toUpperCase()}</span>
              </button>
            ))}
          </div>
          <div className="lp-install-body">
            {cfg.steps.map((s) => (
              <div key={s.badge} className="lp-step-row">
                <div className="lp-step-badge">{s.badge}</div>
                <div className="lp-step-content">
                  <div className="lp-step-text">{s.text}</div>
                  {"code" in s && s.code && (
                    <div className="lp-code-block">
                      <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{s.code}</pre>
                      <CopyButton text={s.code} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="lp-install-foot">
            <span>{cfg.foot}</span>
            {tab !== "api" && (
              <Link
                href={
                  tab === "claude"
                    ? NON_PROFITS_PAGES.CONNECT_CLAUDE
                    : NON_PROFITS_PAGES.CONNECT_CHATGPT
                }
                className="lp-hero-foot-link"
              >
                Open full {cfg.label} setup guide <Icon.arrow />
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ————————————————————————— The Data —————————————————————————

function TheData() {
  return (
    <section id="data">
      <div className="lp-container">
        <div className="lp-section-head">
          <div>
            <div className="lp-section-label">06 &mdash; THE DATA</div>
            <h2 className="lp-section-title">
              Every 990-PF.
              <br />
              <span className="italic">Every foundation. Every grant.</span>
            </h2>
          </div>
          <p className="lp-section-desc">
            Every U.S. private foundation files a 990-PF each year. We&apos;ve indexed all of them
            &mdash; and we keep it current. Every answer the agent gives is grounded in a real
            filing you can open and verify.
          </p>
        </div>

        <div className="lp-data-grid">
          <div className="lp-data-stat">
            <div className="lp-data-stat-num">{FILINGS_STATS.countShort}</div>
            <div className="lp-data-stat-label">990 filings indexed</div>
          </div>
          <div className="lp-data-stat">
            <div className="lp-data-stat-num">{FILINGS_STATS.dollarsTracked}</div>
            <div className="lp-data-stat-label">In philanthropic assets tracked</div>
          </div>
          <div className="lp-data-stat">
            <div className="lp-data-stat-num">7yrs</div>
            <div className="lp-data-stat-label">Of historical giving</div>
          </div>
          <div className="lp-data-stat">
            <div className="lp-data-stat-num">100%</div>
            <div className="lp-data-stat-label">Cited back to source</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ————————————————————————— Audience —————————————————————————

const AUDIENCES = [
  {
    num: "01",
    tag: "EXECUTIVE DIRECTORS",
    title: "EDs running small to mid-size nonprofits",
    desc: "You wear five hats. Fundraising is one of them. Hand the prospecting and drafting grunt work to an agent and put your hours back into program, board, and team.",
    qs: [
      "Find funders we should be talking to this quarter",
      "Draft a board memo on our top three prospects",
    ],
  },
  {
    num: "02",
    tag: "DEVELOPMENT OFFICERS",
    title: "Development officers and grant writers",
    desc: "More throughput, same headcount. Run prospect research overnight, get drafts to review in the morning, spend your day on the relationships only you can build.",
    qs: [
      "Build a prospect list for the youth program in Q2",
      "Draft an LOI to the Hewlett Foundation in our voice",
    ],
  },
  {
    num: "03",
    tag: "SOLO NONPROFITS",
    title: "Founders and one-person fundraising shops",
    desc: "You don&apos;t have a development team. The agents are it. Start with prospecting and drafting today; let the rest of the team show up as they ship.",
    qs: [
      "What funders should I approach for a $250k operating grant?",
      "Help me write a compelling LOI in 30 minutes",
    ],
  },
] as const;

function Audience() {
  return (
    <section id="audience">
      <div className="lp-container">
        <div className="lp-section-head">
          <div>
            <div className="lp-section-label">07 &mdash; BUILT FOR</div>
            <h2 className="lp-section-title">
              For the people who
              <br />
              <span className="italic">need this most.</span>
            </h2>
          </div>
          <p className="lp-section-desc">
            Lean teams and solo operators benefit the most from delegating grunt work. If
            you&apos;re three people doing the work of ten, this is for you.
          </p>
        </div>
        <div className="lp-audience-grid lp-audience-grid-3">
          {AUDIENCES.map((a) => (
            <div key={a.num} className="lp-aud">
              <div className="lp-aud-head">
                <span>{`// ${a.tag}`}</span>
                <span className="lp-aud-num">{a.num}</span>
              </div>
              <div className="lp-aud-title">{a.title}</div>
              <div className="lp-aud-desc">{a.desc}</div>
              <div className="lp-aud-qs">
                {a.qs.map((q) => (
                  <div key={q} className="lp-aud-q">
                    {q}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ————————————————————————— Final CTA —————————————————————————

function FinalCTA({ onSearchFocus }: { onSearchFocus: () => void }) {
  return (
    <section id="cta" className="lp-final-cta">
      <div className="lp-container">
        <div className="lp-section-head">
          <div>
            <div className="lp-section-label">08 &mdash; START</div>
            <h2 className="lp-section-title">
              Two ways in.
              <br />
              <span className="italic">Both take less than a minute.</span>
            </h2>
          </div>
        </div>

        <div className="lp-cta-grid">
          <button type="button" className="lp-cta-card" onClick={onSearchFocus}>
            <div className="lp-cta-card-eyebrow">PATH 01 &middot; INSTANT</div>
            <div className="lp-cta-card-title">Try the prospecting agent right here.</div>
            <div className="lp-cta-card-body">
              No signup. Type a question, get a ranked, cited list in seconds. The fastest way to
              see if it&apos;s real.
            </div>
            <div className="lp-cta-card-action">
              Start a search <Icon.arrow />
            </div>
          </button>
          <Link href={NON_PROFITS_PAGES.CONNECT_CLAUDE} className="lp-cta-card lp-cta-card-alt">
            <div className="lp-cta-card-eyebrow">PATH 02 &middot; INTEGRATED</div>
            <div className="lp-cta-card-title">Add the agents to Claude or ChatGPT.</div>
            <div className="lp-cta-card-body">
              About 60 seconds to connect. From then on, every funder question in your AI tool has
              the agents ready.
            </div>
            <div className="lp-cta-card-action">
              See setup steps <Icon.arrow />
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}

// ————————————————————————— Main Export —————————————————————————

export function LandingPageClient() {
  const router = useRouter();

  const handleSearch = useCallback(
    (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) return;
      // Persist the query so the workbench (ChatView) can read it via
      // getSession(searchId) and run it; skipping this drops the query.
      const sessionId = useSearchSessionStore.getState().createSession(trimmed);
      router.push(NON_PROFITS_PAGES.SEARCH(sessionId), { scroll: false });
    },
    [router]
  );

  const scrollToHero = useCallback(() => {
    const el = document.getElementById("hero");
    if (el) el.scrollIntoView({ behavior: "smooth" });
    const input = document.querySelector<HTMLInputElement>(".lp-search-input");
    if (input) setTimeout(() => input.focus(), 400);
  }, []);

  return (
    <div className="landing">
      <Hero onSearch={handleSearch} />
      <TheShift />
      <Agents />
      <HowItWorks />
      <NoNewTool />
      <Connector />
      <TheData />
      <Audience />
      <FinalCTA onSearchFocus={scrollToHero} />
    </div>
  );
}
