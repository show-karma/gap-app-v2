import type { ScanGrade } from "../types";
import { BAND_BG, gradeBand } from "../utils/labels";

interface GradeBadgeProps {
  readonly grade: ScanGrade;
  readonly size?: number;
}

// The rounded-rect grade letter — the report/scorecard centrepiece, and the
// only severity-coloured surface bigger than text. Coloured by the shared
// grade band (A/B brand teal, C the app's warning amber, D/F destructive
// red). The bright teal and amber chips take dark same-hue ink; the red
// failing chips take white.
const GRADE_INK: Record<ReturnType<typeof gradeBand>, string> = {
  strong: "text-brand-950",
  ok: "text-warning-900",
  weak: "text-white",
  critical: "text-white",
};

export function GradeBadge({ grade, size = 128 }: GradeBadgeProps) {
  const band = gradeBand(grade);
  const ink = GRADE_INK[band];
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
