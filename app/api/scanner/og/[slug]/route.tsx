/* eslint-disable @next/next/no-img-element */

import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { envVars } from "@/utilities/enviromentVars";
import { categoryLabel, GRADE_LABEL } from "@/src/features/scanner/utils/labels";
import type { PublicScorecardPayload, ScanGrade } from "@/src/features/scanner/types";

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
// and CSS variables are not honored. Hex literals are the only option.
const GRADE_TONE: Record<ScanGrade, string> = {
  A: "#10B981",
  B: "#84CC16",
  C: "#F59E0B",
  D: "#F97316",
  F: "#F43F5E",
};
const COLOR_BG_DARK = "#0F172A";
const COLOR_BG_BAR = "#1E293B";
const COLOR_FG_PRIMARY = "white";
const COLOR_FG_MUTED = "#94A3B8";
const COLOR_FG_SUBTLE = "#CBD5E1";
const COLOR_FG_LABEL = "#E2E8F0";

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
      <div style={textRow({ fontSize: 48, fontWeight: 700 })}>
        Karma AI-Readiness Checker
      </div>
      <div style={textRow({ fontSize: 24, marginTop: 16, color: COLOR_FG_MUTED })}>
        {message}
      </div>
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
            color: COLOR_FG_PRIMARY,
          })}
        >
          {scorecard.grade}
        </div>
        <div style={col({ gap: 8 })}>
          <div style={textRow({ fontSize: 80, fontWeight: 700 })}>
            {`${scorecard.totalScore} / 100`}
          </div>
          <div style={textRow({ fontSize: 32, color: COLOR_FG_SUBTLE })}>
            {label}
          </div>
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
                <div style={textRow({ color: COLOR_FG_LABEL })}>
                  {categoryLabel(category)}
                </div>
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
                    backgroundColor: gradeBg,
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
