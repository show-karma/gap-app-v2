"use client";

import { memo, useId } from "react";
import type { TeamRole } from "@/lib/ai-agent-client";
import { ROLE_PALETTES } from "./role-config";

export { ROLE_PALETTES };

interface Props {
  role: TeamRole;
  size?: number;
  className?: string;
}

// Refined character avatars from the design bundle. Each is a 56-unit
// viewBox so callers control display size without rebuilding the SVG.
// Same construction across all four (head + shoulders + eyes + blush +
// mouth) with role-specific accents on top — direction chevron for ED,
// top-knot bun for Fundraiser, headphones for Communications, antenna
// for Operations.
export const RoleAvatar = memo(function RoleAvatar({ role, size = 56, className }: Props) {
  const palette = ROLE_PALETTES[role];
  switch (role) {
    case "orchestrator":
      return <AvatarED size={size} palette={palette} className={className} />;
    case "fundraiser":
      return <AvatarFund size={size} palette={palette} className={className} />;
    case "communications":
      return <AvatarComms size={size} palette={palette} className={className} />;
    case "operations":
      return <AvatarOps size={size} palette={palette} className={className} />;
  }
});

interface AvatarProps {
  size: number;
  palette: (typeof ROLE_PALETTES)[TeamRole];
  className?: string;
}

function Eyes({
  cx1,
  cx2,
  cy,
  light,
  dark,
}: {
  cx1: number;
  cx2: number;
  cy: number;
  light: string;
  dark: string;
}) {
  return (
    <g>
      <ellipse cx={cx1} cy={cy} rx={2.3} ry={2.7} fill={light} />
      <ellipse cx={cx2} cy={cy} rx={2.3} ry={2.7} fill={light} />
      <circle cx={cx1} cy={cy + 0.4} r={1.05} fill={dark} />
      <circle cx={cx2} cy={cy + 0.4} r={1.05} fill={dark} />
      <circle cx={cx1 - 0.4} cy={cy - 0.2} r={0.35} fill={light} />
      <circle cx={cx2 - 0.4} cy={cy - 0.2} r={0.35} fill={light} />
    </g>
  );
}

function Blush({ cx, cy, color, r = 1.7 }: { cx: number; cy: number; color: string; r?: number }) {
  return <circle cx={cx} cy={cy} r={r} fill={color} fillOpacity={0.45} />;
}

function Shoulders({ ink, collar }: { ink: string; collar: string }) {
  return (
    <g>
      <path d="M9 56c1.5-8 8.5-12.5 19-12.5S45.5 48 47 56z" fill={ink} fillOpacity={0.92} />
      <path
        d="M24 44.5l4 5 4-5"
        stroke={collar}
        strokeWidth={1.4}
        strokeLinecap="round"
        fill="none"
        opacity={0.7}
      />
    </g>
  );
}

function AvatarED({ size, palette, className }: AvatarProps) {
  const { ink, bg, accent } = palette;
  const clipId = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      className={className}
      aria-hidden
    >
      <title>Executive Director avatar</title>
      <defs>
        <clipPath id={clipId}>
          <circle cx="28" cy="28" r="28" />
        </clipPath>
      </defs>
      <circle cx="28" cy="28" r="28" fill={bg} />
      <ellipse cx="28" cy="40" rx="22" ry="6" fill={accent} fillOpacity={0.1} />
      <g clipPath={`url(#${clipId})`}>
        <Shoulders ink={ink} collar={bg} />
        <path
          d="M15 25c0-7.5 5.8-12.5 13-12.5S41 17.5 41 25v5.2c0 7.5-5.8 12-13 12s-13-4.5-13-12z"
          fill={ink}
        />
        <path
          d="M16.5 22c2-4 7-7 11.5-7 5 0 9 2.5 11 6.5-3-1.5-7-2-11-1.6-4 .4-8 1.4-11.5 2.1z"
          fill="#000"
          fillOpacity={0.18}
        />
        <path
          d="M24 10l4-3 4 3"
          stroke={accent}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Eyes cx1={22.5} cx2={33.5} cy={28.5} light={bg} dark={ink} />
        <Blush cx={19} cy={33.5} color={accent} />
        <Blush cx={37} cy={33.5} color={accent} />
        <path
          d="M24 36q4 2.4 8 0"
          stroke={bg}
          strokeWidth={1.6}
          strokeLinecap="round"
          fill="none"
        />
      </g>
    </svg>
  );
}

function AvatarFund({ size, palette, className }: AvatarProps) {
  const { ink, bg, accent } = palette;
  const clipId = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      className={className}
      aria-hidden
    >
      <title>Fundraiser avatar</title>
      <defs>
        <clipPath id={clipId}>
          <circle cx="28" cy="28" r="28" />
        </clipPath>
      </defs>
      <circle cx="28" cy="28" r="28" fill={bg} />
      <ellipse cx="28" cy="40" rx="22" ry="6" fill={accent} fillOpacity={0.1} />
      <g clipPath={`url(#${clipId})`}>
        <Shoulders ink={ink} collar={bg} />
        <path
          d="M15 26c0-7.2 5.8-12 13-12s13 4.8 13 12v3.5c0 7.5-5.8 12.5-13 12.5s-13-5-13-12.5z"
          fill={ink}
        />
        <circle cx="28" cy="12.5" r="3.2" fill={ink} />
        <circle cx="28" cy="12.5" r="1.4" fill={accent} fillOpacity={0.7} />
        <path
          d="M16.5 23.5c1.5-4.5 6-7.5 11.5-7.5s10 3 11.5 7.5c-3.5-1.2-7.5-1.8-11.5-1.8s-8 .6-11.5 1.8z"
          fill="#000"
          fillOpacity={0.16}
        />
        <g transform="translate(45 16)">
          <path d="M0 -3.5 L1 -1 L3.5 0 L1 1 L0 3.5 L-1 1 L-3.5 0 L-1 -1 Z" fill={accent} />
        </g>
        <circle cx="9" cy="22" r={1.4} fill={accent} fillOpacity={0.7} />
        <Eyes cx1={22.5} cx2={33.5} cy={29} light={bg} dark={ink} />
        <Blush cx={19} cy={34} color={accent} r={2} />
        <Blush cx={37} cy={34} color={accent} r={2} />
        <path
          d="M23 36c1.5 2.5 8 2.5 10 0"
          stroke={bg}
          strokeWidth={1.6}
          strokeLinecap="round"
          fill="none"
        />
      </g>
    </svg>
  );
}

function AvatarComms({ size, palette, className }: AvatarProps) {
  const { ink, bg, accent } = palette;
  const clipId = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      className={className}
      aria-hidden
    >
      <title>Communications avatar</title>
      <defs>
        <clipPath id={clipId}>
          <circle cx="28" cy="28" r="28" />
        </clipPath>
      </defs>
      <circle cx="28" cy="28" r="28" fill={bg} />
      <ellipse cx="28" cy="40" rx="22" ry="6" fill={accent} fillOpacity={0.1} />
      <g clipPath={`url(#${clipId})`}>
        <Shoulders ink={ink} collar={bg} />
        <path
          d="M15 24c0-7.6 5.8-13 13-13s13 5.4 13 13v6.6c0 7.4-5.8 12-13 12s-13-4.6-13-12z"
          fill={ink}
        />
        <path
          d="M16 21c3-5 7.5-7.5 12-7.5s9 2 12 7c-3.5-1.4-7.5-2-12-2s-8.5.6-12 2.5z"
          fill="#000"
          fillOpacity={0.18}
        />
        <path
          d="M14.5 26c0-7.7 6-13.5 13.5-13.5S41.5 18.3 41.5 26"
          stroke={accent}
          strokeWidth={2.2}
          fill="none"
          strokeLinecap="round"
        />
        <rect x="12" y="25" width="5" height="9" rx="2.5" fill={accent} />
        <rect x="39" y="25" width="5" height="9" rx="2.5" fill={accent} />
        <Eyes cx1={23} cx2={33} cy={29} light={bg} dark={ink} />
        <Blush cx={19.5} cy={34} color={accent} />
        <Blush cx={36.5} cy={34} color={accent} />
        <ellipse cx="28" cy="36.5" rx={2.6} ry={1.6} fill={bg} />
      </g>
    </svg>
  );
}

function AvatarOps({ size, palette, className }: AvatarProps) {
  const { ink, bg, accent } = palette;
  const clipId = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      className={className}
      aria-hidden
    >
      <title>Operations avatar</title>
      <defs>
        <clipPath id={clipId}>
          <circle cx="28" cy="28" r="28" />
        </clipPath>
      </defs>
      <circle cx="28" cy="28" r="28" fill={bg} />
      <ellipse cx="28" cy="40" rx="22" ry="6" fill={accent} fillOpacity={0.1} />
      <g clipPath={`url(#${clipId})`}>
        <Shoulders ink={ink} collar={bg} />
        <path
          d="M14 26c0-7.5 6-13 14-13s14 5.5 14 13v4.5c0 7.5-6 12.5-14 12.5s-14-5-14-12.5z"
          fill={ink}
        />
        <path
          d="M14.5 23.5c1.5-6.5 7-10 13.5-10s12 3.5 13.5 10c-4-1.3-8.5-1.8-13.5-1.8s-9.5.5-13.5 1.8z"
          fill="#000"
          fillOpacity={0.2}
        />
        <line x1="28" y1="13" x2="28" y2="8" stroke={ink} strokeWidth={1.6} strokeLinecap="round" />
        <circle cx="28" cy="7" r={2.2} fill={accent} />
        <circle cx="28" cy="7" r={0.9} fill={bg} />
        <Eyes cx1={22.5} cx2={33.5} cy={29} light={bg} dark={ink} />
        <Blush cx={19} cy={34} color={accent} />
        <Blush cx={37} cy={34} color={accent} />
        <path
          d="M24.5 36.4q3.5 1.4 7 0"
          stroke={bg}
          strokeWidth={1.6}
          strokeLinecap="round"
          fill="none"
        />
      </g>
    </svg>
  );
}
