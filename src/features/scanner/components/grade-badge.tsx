import type { ScanGrade } from "../types";
import { BAND_BG, gradeBand } from "../utils/labels";

interface GradeBadgeProps {
  readonly grade: ScanGrade;
  readonly size?: number;
}

// The rounded-rect grade letter — the report/scorecard centrepiece. Coloured
// by the shared grade band (A/B brand, C amber, D orange, F rose). A/B use the
// dark brand ink; the warmer bands read on white.
export function GradeBadge({ grade, size = 128 }: GradeBadgeProps) {
  const band = gradeBand(grade);
  const ink = band === "strong" ? "text-brand-950" : "text-white";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className={`absolute inset-0 ${BAND_BG[band]} shadow-lg`}
        style={{ borderRadius: size * 0.22 }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={`font-bold leading-none tracking-tight ${ink}`}
          style={{ fontSize: size * 0.5 }}
        >
          <span className="sr-only">Grade </span>
          {grade}
        </span>
      </div>
    </div>
  );
}
