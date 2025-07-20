export type SortByOptions = "recent" | "completed" | "milestones" | "txnCount";
export type StatusOptions = "all" | "to-complete" | "completed" | "starting" | "maturity-stage-0" | "maturity-stage-1" | "maturity-stage-2" | "maturity-stage-3" | "maturity-stage-4";
export type MaturityStageOptions = "all" | "0" | "1" | "2" | "3" | "4";
export type Category = {
  id: number;
  name: string;
};