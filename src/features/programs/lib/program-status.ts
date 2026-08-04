import type { FundingProgram, ProgramStatus } from "@/types/whitelabel-entities";

/**
 * Whether a program belongs to a status bucket (active / upcoming / ended).
 *
 * Shared between the client filter path (`usePrograms`) and the server render
 * of the funding-opportunities directory, so the JSON-LD ItemList emitted on
 * the server describes exactly the programs the default "active" view lists.
 */
export function matchesStatus(program: FundingProgram, status: ProgramStatus): boolean {
  const now = new Date();
  const endsAt = program.metadata?.endsAt ? new Date(program.metadata.endsAt) : null;
  const startsAt = program.metadata?.startsAt ? new Date(program.metadata.startsAt) : null;
  const isEnabled = program.applicationConfig?.isEnabled ?? false;
  const hasDeadlinePassed = !!endsAt && now > endsAt;
  const isUpcoming = !!startsAt && now < startsAt;

  switch (status) {
    case "ended":
      // A program is "ended" if its deadline has passed, or if applications are
      // closed (isEnabled=false) and it's not an upcoming program.
      return hasDeadlinePassed || (!isEnabled && !isUpcoming);
    case "upcoming":
      return isUpcoming;
    case "active":
      // A program is only "active" if it's within its date range AND accepting
      // applications (isEnabled). Programs with closed applications should not
      // appear in the active list.
      return !hasDeadlinePassed && !isUpcoming && isEnabled;
    default:
      return true;
  }
}
