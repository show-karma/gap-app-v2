export enum BadgeName {
  CLEAR_GOALS = "Clear Goals",
  SMOOTH_APPLICATION = "Smooth Application",
  FAIR_ROUNDS = "Fair Rounds",
  EASY_TEACH = "Easy Tech",
  SUPPORTIVE_TEAM = "Supportive Team",
  GREAT_REVIEWERS = "Great Reviewers",
  FAST_DISBURSEMENT = "Fast Disbursement",
}

export interface BadgeListProps {
  name: BadgeName;
  description: string;
  score: number;
}

export interface Review {
  id: number;
  date: number; // UNIX Timestamp
  averageScore: number;
  reviews: BadgeListProps[];
}

export const BadgeDescription: Record<BadgeName, string> = {
  [BadgeName.CLEAR_GOALS]:
    "Recognizes programs with well-defined goals. Every grant program has a goal, such as governance, impact, or education. Are these goals well explained so you can build a project aligned with them?",
  [BadgeName.SMOOTH_APPLICATION]:
    "Awards a seamless application process. Are they using a tech that facilitates the application process? Did they get back to you after the application, or was it just a poor form?",
  [BadgeName.FAIR_ROUNDS]:
    "Grant programs and funding rounds are conducted fairly, supporting a diverse range of projects, including new initiatives, while actively incorporating community feedback.",
  [BadgeName.EASY_TEACH]:
    "Awards programs with easily implementable technology. How hard is the tech? Are the docs easy to use or find?",
  [BadgeName.SUPPORTIVE_TEAM]:
    "Highlights programs with highly supportive teams. Whether technical or not, if you receive very helpful support after applying for a grant, issue this badge. – Post-Grant Support: Highlights strong post-grant support. How much do they help you after the application? Do they suggest related projects, possible connections, or interested people?",
  [BadgeName.GREAT_REVIEWERS]:
    "Recognizes top-quality grant reviewers. They are impartial, select well-written projects, set clear goals, and explain the application process well.",
  [BadgeName.FAST_DISBURSEMENT]:
    "Commends quick fund disbursement processes. Did they complete the payment as soon as you completed the milestones? If yes, issue this badge.",
};

export enum ReviewMode {
  READ = "READ",
  WRITE = "WRITE",
}
