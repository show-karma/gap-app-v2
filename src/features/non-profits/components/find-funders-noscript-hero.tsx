import { HERO_CHIPS, HERO_SUB, HERO_TITLE_LINE_1, HERO_TITLE_LINE_2 } from "../lib/hero-content";

/**
 * The find-funders hero for readers that do not execute JavaScript — rendered
 * by the ROOT layout, and only for /nonprofits/find-funders (the proxy tags
 * that request with an `x-pathname` header the layout checks).
 *
 * Why the root layout, of all places: every route in this app renders
 * dynamically (the root layout reads request headers for whitelabel
 * detection), and with a loading.tsx anywhere above a page, Next streams the
 * page's HTML as a `<div hidden id="S:n">` chunk that only client-side script
 * reveals — the visible part of the response is a loading fallback. Which
 * ancestor's fallback ends up visible is decided by module-chunk timing and
 * shifts between builds (measured: the same route flushed at the find-funders
 * boundary in one build and at the /nonprofits boundary in the next, purely
 * from unrelated import changes). The ONLY region of the response that React
 * guarantees into the initial visible HTML is the part outside every Suspense
 * boundary: the root layout's own output. So the crawler-facing hero renders
 * there (DEV-586).
 *
 * `<noscript>` keeps it honest and duplicate-free: a JavaScript-executing
 * visitor (or Googlebot's renderer) never displays it — they get the real,
 * interactive hero once hydration reveals the page — while a no-JS reader
 * renders exactly this block. The copy comes from lib/hero-content, the same
 * source the interactive hero uses, so the two cannot drift; the test suite
 * additionally pins the rendered <h1> of both to be identical.
 *
 * Pure Server Component by design — anything imported here loads eagerly with
 * the root layout, outside any Suspense boundary.
 */
export function FindFundersNoscriptHero() {
  return (
    <noscript>
      {/* .landing scopes the lp-* CSS custom properties; the stylesheet
          itself ships with the route (find-funders/layout.tsx imports it). */}
      <div className="landing">
        <section className="lp-hero">
          <div className="lp-container lp-hero-inner">
            <h1 className="lp-hero-title">
              {HERO_TITLE_LINE_1}
              <br />
              <span className="italic">{HERO_TITLE_LINE_2}</span>
            </h1>
            <p className="lp-hero-sub">{HERO_SUB}</p>
            <div className="lp-chips">
              <div className="lp-chips-label">TRY AN EXAMPLE</div>
              <ul>
                {HERO_CHIPS.map((chip) => (
                  <li key={chip.text} className="lp-aud-q">
                    {chip.text}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </noscript>
  );
}
