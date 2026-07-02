/* eslint-disable @next/next/no-img-element */

import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import type { PublicScorecardPayload, ScanGrade } from "@/src/features/scanner/types";
import { categoryLabel, GRADE_LABEL } from "@/src/features/scanner/utils/labels";
import { envVars } from "@/utilities/enviromentVars";

// next/og renders via wasm in the edge runtime. nodejs runtime silently
// fails with empty responses under turbopack dev when sharp is not
// installed; edge is the canonical (and only well-supported) target.
export const runtime = "edge";

// Fetch the scorecard directly with fetch() rather than going through the
// shared axios-based fetchData. The app's fetchData has heavy dependencies
// (axios interceptors, error manager, toast) that fail silently inside
// the edge route handler. Plain fetch keeps this route hermetic.
async function fetchScorecard(slug: string): Promise<PublicScorecardPayload | null> {
  try {
    const url = `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL.replace(/\/$/, "")}/api/scanner/v1/s/${encodeURIComponent(slug)}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as PublicScorecardPayload;
  } catch {
    return null;
  }
}

// next/og's ImageResponse renders to a PNG via inline CSS; Tailwind classes
// and CSS variables are not honored, so these hex literals mirror the
// design-system tokens the in-app scorecard uses: the grade chip carries
// severity (A/B brand teal, C burnt amber warning-700, D/F destructive red),
// bars are always the brand accent, and the neutrals follow the KDS dark
// palette (pure-black background, pure-gray text ramp).
const GRADE_TONE: Record<ScanGrade, string> = {
  A: "#2ed1a8", // brand-500
  B: "#2ed1a8", // brand-500
  C: "#b45309", // warning-700
  D: "#dc2828", // destructive — hsl(0 72% 51%)
  F: "#dc2828", // destructive — hsl(0 72% 51%)
};
// Chip ink: A/B read with the dark brand ink (as in-app), warm bands on white.
const GRADE_INK: Record<ScanGrade, string> = {
  A: "#061d18", // brand-950
  B: "#061d18", // brand-950
  C: "white",
  D: "white",
  F: "white",
};
const COLOR_BRAND = "#2ed1a8"; // brand-500
const COLOR_BG_DARK = "#000000";
const COLOR_BG_BAR = "#292929"; // KDS dark border — hsl(0 0% 16%)
const COLOR_FG_PRIMARY = "white";
const COLOR_FG_MUTED = "#a3a3a3";
const COLOR_FG_SUBTLE = "#d4d4d4";
const COLOR_FG_LABEL = "#e5e5e5";

// Satori (next/og's renderer) requires display:flex on EVERY div that
// has multiple children. Even single-text divs render more predictably
// with display:flex set, so this is the project-wide convention.
function row(style: React.CSSProperties = {}): React.CSSProperties {
  return { display: "flex", flexDirection: "row", ...style };
}
function col(style: React.CSSProperties = {}): React.CSSProperties {
  return { display: "flex", flexDirection: "column", ...style };
}
function textRow(style: React.CSSProperties = {}): React.CSSProperties {
  return { display: "flex", ...style };
}

function renderFallback(message: string) {
  return new ImageResponse(
    <div
      style={col({
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        backgroundColor: COLOR_BG_DARK,
        color: COLOR_FG_PRIMARY,
      })}
    >
      <div style={textRow({ fontSize: 48, fontWeight: 700 })}>Karma AI-Readiness Checker</div>
      <div style={textRow({ fontSize: 24, marginTop: 16, color: COLOR_FG_MUTED })}>{message}</div>
    </div>,
    {
      width: 1200,
      height: 630,
      headers: { "Cache-Control": "public, max-age=600, s-maxage=3600" },
    }
  );
}

export async function GET(_request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const slug = (await context.params).slug;
  const scorecard = await fetchScorecard(slug);
  if (!scorecard) {
    return renderFallback("Scorecard not available");
  }
  if (!scorecard.grade || scorecard.totalScore === null) {
    return renderFallback("Scan still in progress");
  }

  const gradeBg = GRADE_TONE[scorecard.grade];
  const label = GRADE_LABEL[scorecard.grade];
  const orgName = scorecard.orgName || scorecard.url || `Scan ${scorecard.slug}`;
  const categories = scorecard.categoryScores ?? [];

  // OG image MUST stay public-tier per R12: grade + categories + org name
  // only. No top-3 fixes, evidence, or walkthrough notes here.
  return new ImageResponse(
    <div
      style={col({
        width: "100%",
        height: "100%",
        backgroundColor: COLOR_BG_DARK,
        color: COLOR_FG_PRIMARY,
        padding: 60,
      })}
    >
      <div style={col({ gap: 16 })}>
        <div style={textRow({ fontSize: 24, color: COLOR_FG_MUTED, letterSpacing: 1 })}>
          KARMA AI-READINESS CHECKER
        </div>
        <div style={textRow({ fontSize: 44, fontWeight: 700, color: COLOR_FG_PRIMARY })}>
          {orgName}
        </div>
      </div>

      <div style={row({ alignItems: "center", gap: 32, marginTop: 40 })}>
        <div
          style={row({
            alignItems: "center",
            justifyContent: "center",
            width: 180,
            height: 180,
            borderRadius: 36,
            backgroundColor: gradeBg,
            fontSize: 120,
            fontWeight: 800,
            color: GRADE_INK[scorecard.grade],
          })}
        >
          {scorecard.grade}
        </div>
        <div style={col({ gap: 8 })}>
          <div style={textRow({ fontSize: 80, fontWeight: 700 })}>
            {`${scorecard.totalScore} / 100`}
          </div>
          <div style={textRow({ fontSize: 32, color: COLOR_FG_SUBTLE })}>{label}</div>
        </div>
      </div>

      <div style={col({ gap: 12, marginTop: 40 })}>
        {categories.slice(0, 5).map((category) => {
          const pct =
            category.pointsPossible === 0
              ? 0
              : Math.max(
                  0,
                  Math.min(100, (category.pointsAwarded / category.pointsPossible) * 100)
                );
          return (
            <div key={category.category} style={col({ gap: 4 })}>
              <div style={row({ justifyContent: "space-between", fontSize: 18 })}>
                <div style={textRow({ color: COLOR_FG_LABEL })}>{categoryLabel(category)}</div>
                <div style={textRow({ color: COLOR_FG_MUTED })}>
                  {`${category.pointsAwarded} / ${category.pointsPossible}`}
                </div>
              </div>
              <div
                style={row({
                  width: "100%",
                  height: 10,
                  borderRadius: 999,
                  backgroundColor: COLOR_BG_BAR,
                })}
              >
                <div
                  style={row({
                    width: `${pct}%`,
                    height: "100%",
                    borderRadius: 999,
                    backgroundColor: COLOR_BRAND,
                  })}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      headers: { "Cache-Control": "public, max-age=600, s-maxage=3600" },
    }
  );
}
