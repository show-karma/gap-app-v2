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
import { NON_PROFITS_PAGES } from "@/utilities/pages";
import { useSearchSessionStore } from "../store/search-session";

// ————————————————————————— Landing stats —————————————————————————
// Keep in sync with the indexer until an index-stats endpoint exists.

const INDEXED_SHORT_LABEL = "140,221 filings · $1.2T tracked";

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
          <span>AI Agents for Nonprofit Fundraising &middot; Works in Claude &amp; ChatGPT</span>
        </div>
        <h1 className="lp-hero-title">
          Stop hunting for grants.
          <br />
          <em>Ask an agent.</em>
        </h1>
        <p className="lp-hero-sub">
          AI agents that find funders, draft proposals, and handle the grant grunt work &mdash;
          inside the AI tools you already use. Try it right here, then take it with you to Claude or
          ChatGPT.
        </p>

        <div className="lp-search-shell">
          <div className="lp-search-meta">
            <div className="lp-search-meta-left">
              <span className="lp-search-meta-chip">
                <span className="lp-status-dot" style={{ background: "var(--lp-accent)" }} />
                <span>ASK IN PLAIN ENGLISH</span>
              </span>
              <span>&middot;</span>
              <span>{INDEXED_SHORT_LABEL}</span>
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
            <a href="#connector" className="lp-hero-foot-link">
              Add the agent to Claude or ChatGPT <Icon.arrow />
            </a>
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
              AI handles the busywork.
              <br />
              <em>You handle what matters.</em>
            </h2>
          </div>
          <p className="lp-section-desc">
            Fundraising is relationships, storytelling, and judgement &mdash; work only your team
            can do. Everything around it &mdash; the searching, the drafting, the tracking, the
            follow-ups &mdash; is grunt work an agent should be doing for you.
          </p>
        </div>

        <div className="lp-caps">
          <div className="lp-cap">
            <div className="lp-cap-num">01</div>
            <div className="lp-cap-title">Your team is not being replaced.</div>
            <div className="lp-cap-desc">
              You still build the relationships. You still tell the story. You still close the
              grants. The agents just handle everything before and after.
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
    tag: "WRITING AGENT",
    status: "live" as const,
    title: "Draft proposals and LOIs in your voice.",
    desc: "Turn your program details into LOIs, narratives, and full proposals. The agent learns your past submissions and matches the funder's priorities.",
    qs: ["Draft an LOI to the Hewlett Foundation", "Tighten this proposal for a family funder"],
  },
  {
    num: "03",
    tag: "MANAGEMENT AGENT",
    status: "soon" as const,
    title: "Track every application, never miss a deadline.",
    desc: "A pipeline that updates itself. Statuses, deadlines, decisions, renewals &mdash; all maintained by the agent so your team never has to babysit a spreadsheet again.",
    qs: ["Show me what's due this week", "Which proposals haven't heard back?"],
  },
  {
    num: "04",
    tag: "WATCHER AGENT",
    status: "soon" as const,
    title: "Get pinged the moment a fit appears.",
    desc: "The agent watches for new RFPs, fresh 990 filings, and funder priority shifts &mdash; and surfaces only the ones that match your work.",
    qs: ["Ping me when funders open climate RFPs", "Alert me on new local family foundations"],
  },
  {
    num: "05",
    tag: "REPORTER AGENT",
    status: "soon" as const,
    title: "Milestone reports, drafted for you.",
    desc: "Pulls your program data, matches it to the grant agreement, and drafts the report. You review, edit, send.",
    qs: ["Draft our Q3 report to the Ford Foundation", "Summarize milestone progress for funders"],
  },
  {
    num: "06",
    tag: "DONATIONS AGENT",
    status: "soon" as const,
    title: "Accept donations through ChatGPT and Claude.",
    desc: "Donors give in the same chat where they discovered you. No checkout pages, no friction &mdash; the agent handles intent, payment, and receipts.",
    qs: ["Donate $50 to this nonprofit", "Set up a recurring gift through Claude"],
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
              <em>Four more shipping soon.</em>
            </h2>
          </div>
          <p className="lp-section-desc">
            Each agent owns one part of the fundraising lifecycle &mdash; the grunt-work parts. They
            run inside Claude, ChatGPT, or right here. We&apos;re shipping in the open: live means
            you can use it today.
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
                    <span className="accent">grow.prospect</span>(
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
              <em>get an agent working for you.</em>
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
                  Claude &rarr; Settings &rarr; Connectors &rarr; Add Grow Nonprofit
                </div>
              </div>
            </div>
            <div>
              <div className="lp-how-step-title">Add the connector. One time.</div>
              <div className="lp-how-step-body">
                In Claude: paste the MCP URL into Connectors. In ChatGPT: install the Grow Nonprofit
                app from the directory. Sign in once and you&apos;re done.
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
                <span>&ldquo;Now draft an LOI to the top three&rdquo;</span>
              </div>
              <div className="lp-viz-line">
                <span className="dim">you</span>{" "}
                <span>&ldquo;Remind me to follow up in two weeks&rdquo;</span>
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
                <span className="dim">&middot; 23 funders</span>
              </div>
              <div className="lp-viz-line">
                <span className="kw">loi_hewlett.docx</span>{" "}
                <span className="dim">&middot; draft</span>
              </div>
              <div className="lp-viz-line">
                <span className="kw">followup</span>{" "}
                <span className="dim">&middot; scheduled 2 weeks</span>
              </div>
              <div style={{ flex: 1 }} />
              <div className="lp-viz-line">
                <span className="dim">every figure cited &middot; every source linked</span>
              </div>
            </div>
            <div>
              <div className="lp-how-step-title">The agent does the work, you do the review.</div>
              <div className="lp-how-step-body">
                Lists, drafts, reminders, follow-ups &mdash; delivered in the chat. You review,
                edit, send. The grunt work is done before you sit down to think.
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
              <em>We&apos;re not the 13th.</em>
            </h2>
          </div>
          <p className="lp-section-desc">
            Most fundraising software wants to be the place you live. We don&apos;t. Grow Nonprofit
            lives inside Claude and ChatGPT &mdash; the AI tool already open in your browser. No new
            tab, no new interface, no migration.
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
            <span className="lp-anti-new">Prospect, draft, follow up &mdash; same chat</span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ————————————————————————— Connector / Install —————————————————————————

const INSTALL_CONFIGS = {
  claude: {
    label: "Claude",
    steps: [
      {
        badge: "01",
        text: (
          <>
            Open Claude &rarr; <code>Settings</code> &rarr; <code>Connectors</code> &rarr;{" "}
            <code>Add custom connector</code>.
          </>
        ),
      },
      {
        badge: "02",
        text: (
          <>
            Paste the MCP server URL below. You&apos;ll be prompted to sign in with your Grow
            Nonprofit account.
          </>
        ),
        code: "https://mcp.grant-atlas.example/v1/sse",
      },
      {
        badge: "03",
        text: (
          <>
            Start a chat. Ask &ldquo;find funders for &hellip;&rdquo; or &ldquo;draft an LOI for
            &hellip;&rdquo; &mdash; the agent takes it from there.
          </>
        ),
      },
    ],
    foot: "Supports Claude 3.5 Sonnet and newer · MCP spec 2025-03",
  },
  chatgpt: {
    label: "ChatGPT",
    steps: [
      {
        badge: "01",
        text: (
          <>
            In ChatGPT, open <code>Settings</code> &rarr; <code>Connectors</code> &rarr;{" "}
            <code>Browse</code> and search for &ldquo;Grow Nonprofit&rdquo;.
          </>
        ),
      },
      {
        badge: "02",
        text: (
          <>
            Click <code>Connect</code>, sign in with your Grow Nonprofit account, and authorize the
            agent.
          </>
        ),
      },
      {
        badge: "03",
        text: (
          <>
            Toggle the connector on inside any chat &mdash; or pin it so every fundraising
            conversation has the agent ready by default.
          </>
        ),
      },
    ],
    foot: "Available on ChatGPT Plus, Pro, Team, and Enterprise plans",
  },
  api: {
    label: "API / Other tools",
    steps: [
      {
        badge: "01",
        text: (
          <>
            Generate a key under <code>Settings &rarr; API</code>. Free tier includes 500
            queries/month.
          </>
        ),
      },
      {
        badge: "02",
        text: (
          <>
            POST a natural-language query. Every response includes <code>citations[]</code> pointing
            to the exact filing page.
          </>
        ),
        code: `curl https://api.grant-atlas.example/v1/ask \\\n  -H "Authorization: Bearer $GA_KEY" \\\n  -d '{"q": "Family foundations funding literacy in Ohio under $10M"}'`,
      },
      {
        badge: "03",
        text: (
          <>
            Or pull it into Cursor, Raycast, or your own agent stack &mdash; anything that speaks
            MCP.
          </>
        ),
      },
    ],
    foot: "REST · JSON · Streaming SSE · MCP-compatible",
  },
} as const;

type InstallTab = keyof typeof INSTALL_CONFIGS;

function CopyButton({ text }: { text: string }) {
  const [, copy] = useCopyToClipboard();
  const [state, setState] = useState<"idle" | "copied">("idle");

  const handleCopy = async () => {
    const ok = await copy(text, "Copied!");
    if (ok) {
      setState("copied");
      setTimeout(() => setState("idle"), 1400);
    }
  };

  return (
    <button
      type="button"
      className={`lp-copy-btn ${state === "copied" ? "copied" : ""}`}
      onClick={handleCopy}
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
            <em>and the agents are yours.</em>
          </h2>
          <p className="lp-connector-sub">
            Add Grow Nonprofit to Claude or ChatGPT in under a minute. From then on, every
            fundraising question you ask &mdash; in any chat &mdash; goes through the agents.
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
              <span>{"// CHATGPT · grow nonprofit agent active"}</span>
              <span>LIVE</span>
            </div>
            <div className="lp-chat-body">
              <div className="lp-chat-user">
                Find foundations that funded our peers in climate justice last year, then draft an
                LOI to the top three.
              </div>
              <div className="lp-chat-tool">
                <span>&rarr;</span>
                <span>
                  <span className="accent">grow.prospect</span> &rarr;{" "}
                  <span className="accent">grow.draft_loi</span>
                </span>
              </div>
              <div className="lp-chat-assist">
                Pulled <strong>14 peer-funded foundations</strong>. Drafted three LOIs in your
                voice, tailored to each funder&apos;s priorities. Review them here, or have me push
                to Google Docs.
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
              <em>Every foundation. Every grant.</em>
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
            <div className="lp-data-stat-num">140,221</div>
            <div className="lp-data-stat-label">990-PF filings indexed</div>
          </div>
          <div className="lp-data-stat">
            <div className="lp-data-stat-num">$1.2T</div>
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
              <em>need this most.</em>
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
              <em>Both take less than a minute.</em>
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
          <a href="#connector" className="lp-cta-card lp-cta-card-alt">
            <div className="lp-cta-card-eyebrow">PATH 02 &middot; INTEGRATED</div>
            <div className="lp-cta-card-title">Add the agents to Claude or ChatGPT.</div>
            <div className="lp-cta-card-body">
              About 60 seconds to connect. From then on, every fundraising chat in your AI tool has
              the agents ready.
            </div>
            <div className="lp-cta-card-action">
              See setup steps <Icon.arrow />
            </div>
          </a>
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
