"use client";

import { MessageSquare, PenLine, Puzzle } from "lucide-react";
import Link from "next/link";
import { memo } from "react";
import { useProfileSkills } from "@/hooks/useSkills";
import {
  TEAM_ROLE_DESCRIPTIONS,
  TEAM_ROLE_LABELS,
  TEAM_ROLE_LONG_LABELS,
  type TeamRole,
} from "@/lib/hermes-client";
import { PAGES } from "@/utilities/pages";
import { ROLE_PALETTES, RoleAvatar } from "./RoleAvatar";

interface Props {
  role: TeamRole;
  slug: string;
}

// Variation B "Crew Card" from the design bundle, with two changes for
// production: skills count is live (from useProfileSkills) instead of
// hardcoded, and the whole card is a Next link rather than a synthetic
// click handler so right-click / cmd-click / accessibility all work.
export const CrewCard = memo(function CrewCard({ role, slug }: Props) {
  const palette = ROLE_PALETTES[role];
  const { data: skills } = useProfileSkills(slug, role);
  const skillCount = skills?.length;
  const href = PAGES.TEAM.MEMBER(slug, role);
  const initial = TEAM_ROLE_LABELS[role].charAt(0);

  return (
    <Link
      href={href}
      className="group relative block overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      {/* Hero band: pastel fill, dot pattern, big serif letter backdrop, avatar inset. */}
      <div
        className="relative h-[110px] overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${palette.bg} 0%, ${palette.bg} 60%, ${palette.bgDeep} 100%)`,
        }}
      >
        <svg
          className="absolute inset-0 h-full w-full opacity-[0.18]"
          aria-hidden
          role="presentation"
        >
          <defs>
            <pattern id={`crew-dots-${role}`} width={14} height={14} patternUnits="userSpaceOnUse">
              <circle cx={2} cy={2} r={1} fill={palette.ink} />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#crew-dots-${role})`} />
        </svg>

        <span
          className="absolute font-serif font-extrabold leading-none"
          style={{
            left: 22,
            bottom: -10,
            fontSize: 88,
            letterSpacing: "-0.05em",
            color: palette.ink,
            opacity: 0.13,
          }}
          aria-hidden
        >
          {initial}
        </span>

        <span className="absolute right-[18px] top-1/2 -translate-y-1/2 transition-transform group-hover:scale-[1.04]">
          <RoleAvatar role={role} size={72} />
        </span>
      </div>

      {/* Body: title row, description, action row. */}
      <div className="px-[18px] pt-4 pb-[18px]">
        <div className="mb-1.5 flex items-center justify-between gap-2.5">
          <div className="flex min-w-0 items-baseline gap-2.5">
            <h3 className="text-[20px] font-bold tracking-tight text-gray-900">
              {TEAM_ROLE_LABELS[role]}
            </h3>
            <span className="truncate text-[12.5px] text-gray-500">
              {TEAM_ROLE_LONG_LABELS[role]}
            </span>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 text-[11.5px] text-gray-500">
            <Puzzle className="h-[11px] w-[11px]" aria-hidden />
            {typeof skillCount === "number" ? skillCount : "—"}
          </span>
        </div>

        <p className="mb-[18px] min-h-[42px] text-[13.5px] leading-[1.55] text-gray-600">
          {TEAM_ROLE_DESCRIPTIONS[role]}
        </p>

        <div className="flex items-center gap-2">
          <span className="inline-flex flex-1 items-center justify-center gap-2 rounded-[10px] bg-gray-900 px-[14px] py-[10px] text-[13.5px] font-medium text-white">
            <MessageSquare className="h-[13px] w-[13px]" aria-hidden />
            Chat with {TEAM_ROLE_LABELS[role]}
          </span>
          <IconStep label={`Edit ${TEAM_ROLE_LABELS[role]} About`}>
            <PenLine className="h-3.5 w-3.5" aria-hidden />
          </IconStep>
          <IconStep label={`Manage ${TEAM_ROLE_LABELS[role]} skills`}>
            <Puzzle className="h-3.5 w-3.5" aria-hidden />
          </IconStep>
        </div>
      </div>
    </Link>
  );
});

// Pure visual button-shaped element. Real navigation happens via the parent
// Link click — these are affordances signaling "you can do this here" and
// the destination tab is the same agent page (which has Chat/About/Skills
// tabs). Keeping them non-interactive avoids nested anchors.
function IconStep({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <span
      title={label}
      className="grid h-9 w-9 place-items-center rounded-[10px] border border-gray-200 bg-white text-gray-500"
    >
      <span className="sr-only">{label}</span>
      {children}
    </span>
  );
}
