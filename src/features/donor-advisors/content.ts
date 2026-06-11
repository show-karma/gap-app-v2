/**
 * Canonical Donor Research marketing copy for the /donor-advisors
 * features section.
 */

interface MarketingFeature {
  label: string;
  title: string;
  description: string;
}

export const donorResearchFeatures: MarketingFeature[] = [
  {
    label: "Compliance verified",
    title: "Every pick passes the IRS check",
    description:
      "Karma verifies 501(c)(3) status against IRS Pub 78, pulls the most recent 990, and checks state charity registries before any nonprofit shows up in your brief.",
  },
  {
    label: "Activity scored",
    title: "See who's actually still doing the work",
    description:
      "Each recommendation comes with recent public mentions, a freshness score, and a last-active date. Quiet nonprofits don't slip onto your shortlist by accident.",
  },
  {
    label: "Mission matched",
    title: "Tell Karma the cause, get aligned nonprofits",
    description:
      "Set cause, geography, and grant size. Karma surfaces nonprofits whose recent work matches what you want to fund, with a transparent composite score.",
  },
  {
    label: "Fast and Deep modes",
    title: "10 minutes for a shortlist, 3 days for diligence",
    description:
      "Fast mode delivers ranked recommendations with EIN and address on every row. Deep mode adds outreach calls and emails so you can vet before you wire.",
  },
];

export const donorResearchBriefPreview = {
  src: "/images/homepage/karma-donor-research-brief.png",
  alt: "Karma Donor Research brief: lead recommendation Northcoast Environmental Center with composite match 74/100, score breakdown across mission match, online presence, and IRS 990 recency, plus three-year financials and recent press coverage",
  width: 1500,
  height: 1049,
  caption: "From a recent research brief.",
};
