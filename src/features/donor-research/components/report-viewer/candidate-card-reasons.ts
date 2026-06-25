import pluralize from "pluralize";
import type { CompositeWeights, ResearchReportCandidate } from "@/types/donor-research";
import {
  onlinePresenceScore,
  resolvedWeightsDecimals,
  socialPresenceScore,
} from "../report-brief/scoring";

export type ReasonTone = "good" | "neutral" | "weak";

export interface MatchReason {
  key: "donorMatch" | "impact" | "onlinePresence" | "socialPresence" | "compliance";
  label: string;
  /** Component score in `[0, 1]`, already resolved across legacy/new shapes. */
  score: number;
  /** One-line explanation surfaced on hover via title attribute. */
  help: string;
  weight: number;
  tone: ReasonTone;
  text: string;
}

/**
 * Build the per-component "why this matches" rows shown on a candidate card.
 * Pure data assembly (no rendering): resolves the score + weight for each
 * dimension and a plain-language blurb. Social presence is a DEV-418
 * five-dimension axis, so its row only appears on weighted reports.
 */
export function buildMatchReasons(
  candidate: ResearchReportCandidate,
  weights: CompositeWeights | null
): MatchReason[] {
  const { components } = candidate;
  const w = resolvedWeightsDecimals(weights);
  const online = onlinePresenceScore(candidate);

  const reasons: MatchReason[] = [
    {
      key: "donorMatch",
      label: "Match to your criteria",
      score: components.donorMatch,
      help: "How closely the nonprofit's mission and location match your donor's stated cause, geography, and amount range.",
      weight: w.donorMatch,
      tone: toneFor(components.donorMatch),
      text: phraseDonorMatch(components.donorMatch),
    },
    {
      key: "impact",
      label: "IRS 990 recency",
      score: components.impactRecency,
      help: "How recent the nonprofit's latest indexed IRS 990 filing is. This is a proxy for whether the organization is still operating.",
      weight: w.impactRecency,
      tone: toneFor(components.impactRecency),
      text: phraseImpact(components.impactRecency, candidate.complianceChecks),
    },
    {
      key: "onlinePresence",
      label: "Online presence",
      score: online,
      help: "Whether the nonprofit has recently published content or appeared in news coverage. Based on a web search disambiguated against IRS facts (EIN, name, locale).",
      weight: w.onlinePresence,
      tone: toneFor(online),
      text: phraseFreshness(online, candidate.activitySignalStatus, candidate.recentMentions),
    },
  ];

  // Social presence is a DEV-418 five-dimension axis. Legacy reports bundle
  // it into online presence, so the row only appears for weighted reports.
  if (weights) {
    const social = socialPresenceScore(candidate);
    reasons.push({
      key: "socialPresence",
      label: "Social presence",
      score: social,
      help: "Recent posting activity across the nonprofit's linked social channels (LinkedIn, Facebook, Instagram, X), aggregated into a single signal.",
      weight: w.socialPresence,
      tone: toneFor(social),
      text: phraseSocial(social, candidate.socialMetrics),
    });
  }

  reasons.push({
    key: "compliance",
    label: "Compliance",
    score: components.compliance,
    help: "Whether the nonprofit passes the IRS Pub 78 active-501(c)(3) check, has a recent 990 on file, and (for California orgs) is current on the state charity registry.",
    weight: w.compliance,
    tone: toneFor(components.compliance),
    text: phraseCompliance(
      components.compliance,
      candidate.complianceVerdict,
      candidate.complianceChecks,
      candidate.stateRegistrationStatus
    ),
  });

  return reasons;
}

export function toneFor(score: number): ReasonTone {
  if (score >= 0.6) return "good";
  if (score >= 0.3) return "neutral";
  return "weak";
}

/** Plain-language read of the aggregated social-activity signal. */
function phraseSocial(
  score: number,
  socialMetrics: ResearchReportCandidate["socialMetrics"]
): string {
  const channels = socialMetrics?.byChannel.filter((c) => c.available) ?? [];
  if (channels.length === 0) {
    return "No linked social channels with recent activity were found for this nonprofit.";
  }
  const channelCount = channels.length;
  const channelNoun = pluralize("channel", channelCount);
  if (score >= 0.65)
    return `Active across ${channelCount} social ${channelNoun} with recent posts.`;
  if (score >= 0.35) return `Some recent social activity across ${channelCount} ${channelNoun}.`;
  return `Light social activity across ${channelCount} ${channelNoun}; most posts are older.`;
}

function phraseCompliance(
  score: number,
  verdict: ResearchReportCandidate["complianceVerdict"],
  checks: readonly ResearchReportCandidate["complianceChecks"][number][],
  stateRegistrationStatus: ResearchReportCandidate["stateRegistrationStatus"]
): string {
  const failed = checks.filter((check) => check.status === "failed");
  if (failed.length > 0) {
    const label = failed[0]?.label ?? "Compliance";
    return `${label} failed — review the compliance breakdown below.`;
  }
  const unknown = checks.filter((check) => check.status === "unknown");
  const caCheck = checks.find((check) => check.name === "ca_ag");
  const recent990 = checks.find((check) => check.name === "recent_990");
  const pub78 = checks.find((check) => check.name === "pub78");

  if (verdict === "verified") {
    const stateText = stateRegistrationPhrase(stateRegistrationStatus, caCheck);
    if (unknown.length > 0) {
      return `IRS checks passed, but ${unknown.length} compliance ${unknown.length === 1 ? "item is" : "items are"} unverified. ${stateText}`;
    }
    return `IRS checks passed. ${stateText}`;
  }
  if (verdict === "partial") return "Mostly verified with one caveat — see the breakdown below.";
  if (verdict === "flagged") return "Compliance flags surfaced — review carefully before outreach.";
  if (pub78?.status === "passed" || recent990?.status === "passed") {
    return "IRS checks have partial support; review state and governance details below.";
  }
  if (score >= 0.6) return "Compliance checks passed.";
  return "Limited compliance signal — review the breakdown below.";
}

function phraseDonorMatch(score: number): string {
  if (score >= 0.65) return "Their mission and location match your criteria closely.";
  if (score >= 0.4) return "Their mission and location are a solid match for your criteria.";
  if (score >= 0.2) return "Adjacent to your criteria but not a central match.";
  return "Limited overlap with your criteria — consider broadening cause or geography.";
}

function phraseImpact(
  score: number,
  checks: readonly ResearchReportCandidate["complianceChecks"][number][]
): string {
  const recent990 = checks.find((check) => check.name === "recent_990");
  if (recent990) return recent990.detail;
  if (score >= 0.65) return "Filed a recent 990 and shows active grant activity.";
  if (score >= 0.4)
    return "Filed a 990 in the last couple of years; some recent grant activity on record.";
  if (score >= 0.2)
    return "Their most recent IRS 990 is a few years old — they may still be running, just quieter on the record.";
  return "No recent IRS filing or grant activity in our index — may have wound down.";
}

function phraseFreshness(
  score: number,
  activity: ResearchReportCandidate["activitySignalStatus"],
  mentions: ResearchReportCandidate["recentMentions"] | undefined
): string {
  // When we have a validated mention, lead with the concrete date —
  // it's more useful than a generic band phrase ("a few weeks").
  const mentionList = mentions ?? [];
  const mostRecent = pickMostRecentDateMs(mentionList);
  if (mostRecent !== null) {
    const days = Math.max(0, Math.floor((Date.now() - mostRecent) / 86400_000));
    const count = mentionList.length;
    const proof = `Found ${count} validated ${count === 1 ? "mention" : "mentions"}; proof links are listed below.`;
    if (days <= 7) return `Latest public activity was in the last week. ${proof}`;
    if (days <= 30) return `Latest public activity was about ${days} days ago. ${proof}`;
    if (days <= 90)
      return `Latest public activity was about ${Math.round(days / 7)} weeks ago. ${proof}`;
    if (days <= 365)
      return `Latest public activity was about ${Math.round(days / 30)} months ago. ${proof}`;
    return `Latest saved public activity is over a year old. ${proof}`;
  }
  if (activity === "no_signal") {
    return "No validated recent web or news mentions were saved for this score.";
  }
  if (score >= 0.65)
    return "Scored as recently active, but no source links were saved with this report.";
  if (score >= 0.4)
    return "Some recent web or news activity was detected, but no proof links were saved.";
  if (score >= 0.2) return "Light recent activity — most signals are months old.";
  return "No fresh public mentions surfaced.";
}

function stateRegistrationPhrase(
  status: ResearchReportCandidate["stateRegistrationStatus"],
  caCheck: ResearchReportCandidate["complianceChecks"][number] | undefined
): string {
  if (status === "verified") return "State registration is verified.";
  if (status === "suspended") return "State registration is suspended.";
  if (status === "revoked") return "State registration is revoked.";
  if (status === "data_not_yet_indexed") return "State registry data is not indexed yet.";
  if (caCheck?.status === "not_applicable") return "State registry was not checked for this state.";
  return "State registry was not verified for this state.";
}

function pickMostRecentDateMs(mentions: ResearchReportCandidate["recentMentions"]): number | null {
  let best: number | null = null;
  for (const m of mentions) {
    if (!m.publishedDate) continue;
    const t = Date.parse(m.publishedDate);
    if (Number.isNaN(t)) continue;
    if (best === null || t > best) best = t;
  }
  return best;
}
