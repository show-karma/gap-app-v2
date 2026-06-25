/* eslint-disable @next/next/no-img-element */

import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { getPublicScorecardBySlug } from "@/src/features/scanner/services/scanner.service";
import type { PublicScorecardPayload, ScanGrade } from "@/src/features/scanner/types";

export const runtime = "nodejs";

const GRADE_BG: Record<ScanGrade, string> = {
  A: "#10B981",
  B: "#84CC16",
  C: "#F59E0B",
  D: "#F97316",
  F: "#F43F5E",
};

const GRADE_LABEL: Record<ScanGrade, string> = {
  A: "AI-ready",
  B: "Mostly ready",
  C: "Partially ready",
  D: "Significant gaps",
  F: "Not AI-ready",
};

function renderFallback(message: string) {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        backgroundColor: "#0F172A",
        color: "white",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ fontSize: 48, fontWeight: 700 }}>Karma AI-Readiness Checker</div>
      <div style={{ fontSize: 24, marginTop: 16, color: "#94A3B8" }}>{message}</div>
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
  let scorecard: PublicScorecardPayload;
  try {
    scorecard = await getPublicScorecardBySlug(slug);
  } catch {
    return renderFallback("Scorecard not available");
  }

  if (!scorecard.grade || scorecard.totalScore === null) {
    return renderFallback("Scan still in progress");
  }

  const gradeBg = GRADE_BG[scorecard.grade];
  const label = GRADE_LABEL[scorecard.grade];
  const orgName = scorecard.orgName || scorecard.url;

  // OG image MUST stay public-tier per R12: grade + categories + org name only.
  // Never include top-3 fixes, evidence, or walkthrough notes in the rendered
  // image, even if the calling service is logged in.
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: "#0F172A",
        color: "white",
        padding: 60,
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 24, color: "#94A3B8", letterSpacing: 1 }}>
          KARMA AI-READINESS CHECKER
        </div>
        <div style={{ fontSize: 44, fontWeight: 700, color: "white" }}>{orgName}</div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 32,
          marginTop: 40,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 180,
            height: 180,
            borderRadius: 36,
            backgroundColor: gradeBg,
            fontSize: 120,
            fontWeight: 800,
            color: "white",
          }}
        >
          {scorecard.grade}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 80, fontWeight: 700 }}>{scorecard.totalScore} / 100</div>
          <div style={{ fontSize: 32, color: "#CBD5E1" }}>{label}</div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 40 }}>
        {scorecard.categories.slice(0, 5).map((category) => {
          const pct =
            category.pointsPossible === 0
              ? 0
              : Math.max(
                  0,
                  Math.min(100, (category.pointsAwarded / category.pointsPossible) * 100)
                );
          return (
            <div
              key={category.category}
              style={{ display: "flex", flexDirection: "column", gap: 4 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18 }}>
                <span style={{ color: "#E2E8F0" }}>{category.category}</span>
                <span style={{ color: "#94A3B8" }}>
                  {category.pointsAwarded} / {category.pointsPossible}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  width: "100%",
                  height: 10,
                  borderRadius: 999,
                  backgroundColor: "#1E293B",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    width: `${pct}%`,
                    height: "100%",
                    borderRadius: 999,
                    backgroundColor: gradeBg,
                  }}
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
