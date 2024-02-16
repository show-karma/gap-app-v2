import { Question } from "./questions";

export type SortByOptions = "recent" | "completed" | "milestones";
export type StatusOptions = "all" | "to-complete" | "completed" | "starting";
export type Category = {
  id: number;
  name: string;
  questions?: Question[];
};
