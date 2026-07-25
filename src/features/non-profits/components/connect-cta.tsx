"use client";

/**
 * Landing-page connector CTAs.
 *
 * /find-funders gets steady search traffic but very few Claude/ChatGPT
 * connections, so the "use it in your own AI tool" path needs to be visible
 * above the fold rather than only in section 05:
 *
 * - `ConnectFloatingCard` — a dismissable bottom-right card, present from page
 *   load and hidden only while the connector section is on screen.
 * - `ConnectLogos` — the bare brand marks, for the hero eyebrow.
 *
 * Both use the lp-* design system in styles/non-profits-landing.css. Plain
 * Tailwind colour utilities lose to the `.landing button/a` resets, which is
 * why these are CSS classes rather than utility strings.
 */

import Image from "next/image";
import { memo, useEffect, useState } from "react";
import { CONNECT_TARGETS } from "../lib/connect-targets";

const DISMISS_KEY = "np-connect-cta-dismissed";

/**
 * Opens in a new tab, matching the rail and inline CTAs: the setup guide is a
 * detour, and the reader should come back to where they were rather than lose
 * the page they were reading.
 */
const ConnectButton = memo(function ConnectButton({
  href,
  logo,
  name,
  className,
}: {
  href: string;
  logo: string;
  name: string;
  className: string;
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      <Image
        src={logo}
        alt=""
        width={16}
        height={16}
        aria-hidden="true"
        className="lp-connect-btn-logo dark:invert"
      />
      <span>Add to {name}</span>
    </a>
  );
});

/**
 * The two brand marks on their own — an at-a-glance "this runs in your AI
 * tool" signal for the hero eyebrow, which is the very first thing on the
 * page.
 */
export function ConnectLogos() {
  return (
    <span className="lp-brand-marks">
      {CONNECT_TARGETS.map((target) => (
        <Image
          key={target.href}
          src={target.logo}
          alt=""
          width={13}
          height={13}
          aria-hidden="true"
          className="lp-brand-mark-logo dark:invert"
        />
      ))}
    </span>
  );
}

function isDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function persistDismiss(): void {
  try {
    window.sessionStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // SUPPRESSED: sessionStorage throws in private mode / when storage is
    // disabled. Dismissal is best-effort cosmetic state — the CTA simply
    // reappears next load, which is not worth reporting.
  }
}

/**
 * Bottom-right floating connector card.
 *
 * Present from the moment the page loads — the whole problem with putting this
 * in the hero was that the CTA lived below the fold on a tall hero; a corner
 * card is on the first screen without spending any hero real estate.
 *
 * It hides only while the connector section (05 — ADD THE AGENT) is on screen,
 * since that section makes the same offer at full size and a floating
 * duplicate would sit on top of it. Scrolling away from that section brings
 * the card back — it tracks the section's current visibility rather than
 * latching on first sight.
 */
export function ConnectFloatingCard({ hideAtId = "connector" }: { hideAtId?: string }) {
  const [dismissed, setDismissed] = useState(true);
  const [atSection, setAtSection] = useState(false);

  // Start hidden and flip after mount: the landing page is client-only, but
  // reading sessionStorage during render would still make the first paint
  // depend on browser state.
  useEffect(() => {
    if (!isDismissed()) setDismissed(false);
  }, []);

  useEffect(() => {
    const target = document.getElementById(hideAtId);
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => setAtSection(entry.isIntersecting), {
      threshold: 0,
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [hideAtId]);

  if (dismissed || atSection) return null;

  const handleDismiss = () => {
    persistDismiss();
    setDismissed(true);
  };

  return (
    <aside className="lp-connect-float" aria-label="Add the agent to your AI tool">
      <div className="lp-connect-float-head">
        <span className="lp-connect-float-title">
          <ConnectLogos />
          Do it in your own AI tool
        </span>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="lp-connect-float-close"
        >
          &times;
        </button>
      </div>
      <div className="lp-connect-float-actions">
        {CONNECT_TARGETS.map((target) => (
          <ConnectButton
            key={target.href}
            href={target.href}
            logo={target.logo}
            name={target.name}
            className="lp-connect-btn lp-connect-btn-sm"
          />
        ))}
      </div>
    </aside>
  );
}
