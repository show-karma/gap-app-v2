import type { FundingProgram } from "@/types/whitelabel-entities";

export type Urgency = "open" | "closing" | "urgent" | "closed" | "upcoming";

export interface ProgramComputed {
  status: "open" | "closed" | "coming-soon" | "deadline-passed";
  urgency: Urgency;
  daysLeft: number | null;
  pool: number;
  maxGrant: number;
  applicants: number;
  category: string | null;
  accentClass: string;
}

const ACCENT_CLASS = "bg-brand-500";

function parseAmount(raw?: string | number): number {
  if (raw == null) return 0;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
  const cleaned = String(raw).replace(/[^0-9.]/g, "");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function computeProgramView(program: FundingProgram): ProgramComputed {
  const now = new Date();
  const startsAt = program.metadata?.startsAt ? new Date(program.metadata.startsAt) : null;
  const endsAt = program.metadata?.endsAt ? new Date(program.metadata.endsAt) : null;

  // Applications disabled (isEnabled=false) counts as closed, matching the
  // list filter's `matchesStatus`/canonical `getProgramStatusInfo` — otherwise a
  // disabled program lands in the "Ended" tab but the card still reads "Open".
  const applicationsEnabled = program.applicationConfig?.isEnabled ?? false;
  let status: ProgramComputed["status"] = "open";
  if (endsAt && now > endsAt) status = "deadline-passed";
  else if (startsAt && now < startsAt) status = "coming-soon";
  else if (program.metadata?.status === "inactive" || !applicationsEnabled) status = "closed";

  const daysLeft = endsAt
    ? Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  let urgency: Urgency = "open";
  if (status === "deadline-passed" || status === "closed") urgency = "closed";
  else if (status === "coming-soon") urgency = "upcoming";
  else if (daysLeft !== null && daysLeft <= 3) urgency = "urgent";
  else if (daysLeft !== null && daysLeft <= 7) urgency = "closing";

  const pool = parseAmount(program.metadata?.programBudget);
  const maxGrant = parseAmount(program.metadata?.maxGrantSize);
  const applicants = program.metrics?.totalApplications ?? program.metadata?.applicantsNumber ?? 0;
  const category = program.metadata?.categories?.[0] ?? program.metadata?.type ?? null;

  return {
    status,
    urgency,
    daysLeft,
    pool,
    maxGrant,
    applicants,
    category,
    accentClass: ACCENT_CLASS,
  };
}
