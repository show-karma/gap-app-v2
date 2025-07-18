export type IAttestationStatsNames =
  | "milestones"
  | "projects"
  | "projectImpacts"
  | "projectEndorsements"
  | "grants"
  | "communities"
  | "grantUpdates"
  | "milestoneUpdates"
  | "totals";

export type StatPeriod = "Days" | "Weeks" | "Months" | "Years";
export interface StatChartData {
  name: IAttestationStatsNames;
  data: {
    [key: string]: string | number;
    Date: string;
  }[];
}
export interface IAttestationStats {
  name: IAttestationStatsNames;
  data: {
    date: string;
    value: number;
    timestamp: number;
  }[];
}
export type StatsResponse = IAttestationStats[];
