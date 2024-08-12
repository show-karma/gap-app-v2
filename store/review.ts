import { BadgeName } from "@/components/Icons/Badge";
import { BadgeListProps } from "@/components/Pages/Project/Review/CardReview";
import { create } from "zustand";

interface ReviewStore {
  newReview: BadgeListProps[];
  setNewReview: (newReview: BadgeListProps[]) => void;
  badgeList: BadgeListProps[][];
  setBadgeList: (badgeList: BadgeListProps[][]) => void;
}

const defaultInitialNewReviewList: BadgeListProps[] = [
  {
    name: BadgeName.CLEAR_GOALS,
    description:
      "Clear Goals: Recognizes programs with well-defined goals. Every grant program has a goal, such as governance, impact, or education. Are these goals well explained so you can build a project aligned with them?",
    score: 0,
  },
  {
    name: BadgeName.SMOOTH_APPLICATION,
    description:
      "Smooth Application: Awards a seamless application process. Are they using a tech that facilitates the application process? Did they get back to you after the application, ou foi apenas um formulário genérico?",
    score: 0,
  },
  {
    name: BadgeName.FAIR_ROUNDS,
    description:
      "Fair rounds: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla sem urna, sodales vel placerat sed, elementum a orci. Duis sit amet neque rutrum, suscipit enim tempus, dignissim erat. Etiam interdum dignissim pretium.",
    score: 0,
  },
  {
    name: BadgeName.EASY_TEACH,
    description:
      "Easy Tech: Awards programs with easily implementable technology. How hard is the tech? Are the docs easy to use or find?",
    score: 0,
  },
  {
    name: BadgeName.SUPPORTIVE_TEAM,
    description:
      "Supportive Team: Highlights programs with highly supportive teams. Whether technical or not, if you receive very helpful support after applying for a grant, issue this badge. – Post-Grant Support: Highlights strong post-grant support. How much do they help you after the application? Do they suggest related projects, possible connections, or interested people?",
    score: 0,
  },
  {
    name: BadgeName.GREAT_REVIEWERS,
    description:
      "Great Reviewers: Recognizes top-quality grant reviewers. They are impartial, select well-written projects, set clear goals, and explain the application process well.",
    score: 0,
  },
  {
    name: BadgeName.FAST_DISBURSEMENT,
    description:
      "Fast Disbursement: Commends quick fund disbursement processes. Did they complete the payment as soon as you completed the milestones? If yes, issue this badge.",
    score: 0,
  },
];

const initialBadgeList: BadgeListProps[][] = [
  [
    {
      name: BadgeName.CLEAR_GOALS,
      description:
        "Clear Goals: Recognizes programs with well-defined goals. Every grant program has a goal, such as governance, impact, or education. Are these goals well explained so you can build a project aligned with them?",
      score: 5,
    },
    {
      name: BadgeName.SMOOTH_APPLICATION,
      description:
        "Smooth Application: Awards a seamless application process. Are they using a tech that facilitates the application process? Did they get back to you after the application, or was it just a poor form?",
      score: 4,
    },
    {
      name: BadgeName.FAIR_ROUNDS,
      description:
        "Fair rounds: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla sem urna, sodales vel placerat sed, elementum a orci. Duis sit amet neque rutrum, suscipit enim tempus, dignissim erat. Etiam interdum dignissim pretium.",
      score: 4,
    },
    {
      name: BadgeName.EASY_TEACH,
      description:
        "Easy Tech: Awards programs with easily implementable technology. How hard is the tech? Are the docs easy to use or find?",
      score: 4,
    },
    {
      name: BadgeName.SUPPORTIVE_TEAM,
      description:
        "Supportive Team: Highlights programs with highly supportive teams. Whether technical or not, if you receive very helpful support after applying for a grant, issue this badge. – Post-Grant Support: Highlights strong post-grant support. How much do they help you after the application? Do they suggest related projects, possible connections, or interested people?",
      score: 4,
    },
    {
      name: BadgeName.GREAT_REVIEWERS,
      description:
        "Great Reviewers: Recognizes top-quality grant reviewers. They are impartial, select well-written projects, set clear goals, and explain the application process well.",
      score: 4,
    },
    {
      name: BadgeName.FAST_DISBURSEMENT,
      description:
        "Fast Disbursement: Commends quick fund disbursement processes. Did they complete the payment as soon as you completed the milestones? If yes, issue this badge.",
      score: 4,
    },
  ],
  [
    {
      name: BadgeName.CLEAR_GOALS,
      description:
        "Clear Goals: Recognizes programs with well-defined goals. Every grant program has a goal, such as governance, impact, or education. Are these goals well explained so you can build a project aligned with them?",
      score: 2,
    },
    {
      name: BadgeName.SMOOTH_APPLICATION,
      description:
        "Smooth Application: Awards a seamless application process. Are they using a tech that facilitates the application process? Did they get back to you after the application, or was it just a poor form?",
      score: 3,
    },
    {
      name: BadgeName.FAIR_ROUNDS,
      description:
        "Fair rounds: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla sem urna, sodales vel placerat sed, elementum a orci. Duis sit amet neque rutrum, suscipit enim tempus, dignissim erat. Etiam interdum dignissim pretium.",
      score: 5,
    },
    {
      name: BadgeName.EASY_TEACH,
      description:
        "Easy Tech: Awards programs with easily implementable technology. How hard is the tech? Are the docs easy to use or find?",
      score: 1,
    },
    {
      name: BadgeName.SUPPORTIVE_TEAM,
      description:
        "Supportive Team: Highlights programs with highly supportive teams. Whether technical or not, if you receive very helpful support after applying for a grant, issue this badge. – Post-Grant Support: Highlights strong post-grant support. How much do they help you after the application? Do they suggest related projects, possible connections, or interested people?",
      score: 1,
    },
    {
      name: BadgeName.GREAT_REVIEWERS,
      description:
        "Great Reviewers: Recognizes top-quality grant reviewers. They are impartial, select well-written projects, set clear goals, and explain the application process well.",
      score: 2,
    },
    {
      name: BadgeName.FAST_DISBURSEMENT,
      description:
        "Fast Disbursement: Commends quick fund disbursement processes. Did they complete the payment as soon as you completed the milestones? If yes, issue this badge.",
      score: 3,
    },
  ],
  [
    {
      name: BadgeName.CLEAR_GOALS,
      description:
        "Clear Goals: Recognizes programs with well-defined goals. Every grant program has a goal, such as governance, impact, or education. Are these goals well explained so you can build a project aligned with them?",
      score: 4,
    },
    {
      name: BadgeName.SMOOTH_APPLICATION,
      description:
        "Smooth Application: Awards a seamless application process. Are they using a tech that facilitates the application process? Did they get back to you after the application, or was it just a poor form?",
      score: 4,
    },
    {
      name: BadgeName.FAIR_ROUNDS,
      description:
        "Fair rounds: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla sem urna, sodales vel placerat sed, elementum a orci. Duis sit amet neque rutrum, suscipit enim tempus, dignissim erat. Etiam interdum dignissim pretium.",
      score: 2,
    },
    {
      name: BadgeName.EASY_TEACH,
      description:
        "Easy Tech: Awards programs with easily implementable technology. How hard is the tech? Are the docs easy to use or find?",
      score: 3,
    },
    {
      name: BadgeName.SUPPORTIVE_TEAM,
      description:
        "Supportive Team: Highlights programs with highly supportive teams. Whether technical or not, if you receive very helpful support after applying for a grant, issue this badge. – Post-Grant Support: Highlights strong post-grant support. How much do they help you after the application? Do they suggest related projects, possible connections, or interested people?",
      score: 5,
    },
    {
      name: BadgeName.GREAT_REVIEWERS,
      description:
        "Great Reviewers: Recognizes top-quality grant reviewers. They are impartial, select well-written projects, set clear goals, and explain the application process well.",
      score: 2,
    },
    {
      name: BadgeName.FAST_DISBURSEMENT,
      description:
        "Fast Disbursement: Commends quick fund disbursement processes. Did they complete the payment as soon as you completed the milestones? If yes, issue this badge.",
      score: 1,
    },
  ],
  [
    {
      name: BadgeName.CLEAR_GOALS,
      description:
        "Clear Goals: Recognizes programs with well-defined goals. Every grant program has a goal, such as governance, impact, or education. Are these goals well explained so you can build a project aligned with them?",
      score: 2,
    },
    {
      name: BadgeName.SMOOTH_APPLICATION,
      description:
        "Smooth Application: Awards a seamless application process. Are they using a tech that facilitates the application process? Did they get back to you after the application, or was it just a poor form?",
      score: 2,
    },
    {
      name: BadgeName.FAIR_ROUNDS,
      description:
        "Fair rounds: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla sem urna, sodales vel placerat sed, elementum a orci. Duis sit amet neque rutrum, suscipit enim tempus, dignissim erat. Etiam interdum dignissim pretium.",
      score: 3,
    },
    {
      name: BadgeName.EASY_TEACH,
      description:
        "Easy Tech: Awards programs with easily implementable technology. How hard is the tech? Are the docs easy to use or find?",
      score: 1,
    },
    {
      name: BadgeName.SUPPORTIVE_TEAM,
      description:
        "Supportive Team: Highlights programs with highly supportive teams. Whether technical or not, if you receive very helpful support after applying for a grant, issue this badge. – Post-Grant Support: Highlights strong post-grant support. How much do they help you after the application? Do they suggest related projects, possible connections, or interested people?",
      score: 1,
    },
    {
      name: BadgeName.GREAT_REVIEWERS,
      description:
        "Great Reviewers: Recognizes top-quality grant reviewers. They are impartial, select well-written projects, set clear goals, and explain the application process well.",
      score: 2,
    },
    {
      name: BadgeName.FAST_DISBURSEMENT,
      description:
        "Fast Disbursement: Commends quick fund disbursement processes. Did they complete the payment as soon as you completed the milestones? If yes, issue this badge.",
      score: 1,
    },
  ],
  [
    {
      name: BadgeName.CLEAR_GOALS,
      description:
        "Clear Goals: Recognizes programs with well-defined goals. Every grant program has a goal, such as governance, impact, or education. Are these goals well explained so you can build a project aligned with them?",
      score: 1,
    },
    {
      name: BadgeName.SMOOTH_APPLICATION,
      description:
        "Smooth Application: Awards a seamless application process. Are they using a tech that facilitates the application process? Did they get back to you after the application, or was it just a poor form?",
      score: 2,
    },
    {
      name: BadgeName.FAIR_ROUNDS,
      description:
        "Fair rounds: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla sem urna, sodales vel placerat sed, elementum a orci. Duis sit amet neque rutrum, suscipit enim tempus, dignissim erat. Etiam interdum dignissim pretium.",
      score: 2,
    },
    {
      name: BadgeName.EASY_TEACH,
      description:
        "Easy Tech: Awards programs with easily implementable technology. How hard is the tech? Are the docs easy to use or find?",
      score: 3,
    },
    {
      name: BadgeName.SUPPORTIVE_TEAM,
      description:
        "Supportive Team: Highlights programs with highly supportive teams. Whether technical or not, if you receive very helpful support after applying for a grant, issue this badge. – Post-Grant Support: Highlights strong post-grant support. How much do they help you after the application? Do they suggest related projects, possible connections, or interested people?",
      score: 5,
    },
    {
      name: BadgeName.GREAT_REVIEWERS,
      description:
        "Great Reviewers: Recognizes top-quality grant reviewers. They are impartial, select well-written projects, set clear goals, and explain the application process well.",
      score: 3,
    },
    {
      name: BadgeName.FAST_DISBURSEMENT,
      description:
        "Fast Disbursement: Commends quick fund disbursement processes. Did they complete the payment as soon as you completed the milestones? If yes, issue this badge.",
      score: 2,
    },
  ],
  [
    {
      name: BadgeName.CLEAR_GOALS,
      description:
        "Clear Goals: Recognizes programs with well-defined goals. Every grant program has a goal, such as governance, impact, or education. Are these goals well explained so you can build a project aligned with them?",
      score: 5,
    },
    {
      name: BadgeName.SMOOTH_APPLICATION,
      description:
        "Smooth Application: Awards a seamless application process. Are they using a tech that facilitates the application process? Did they get back to you after the application, or was it just a poor form?",
      score: 4,
    },
    {
      name: BadgeName.FAIR_ROUNDS,
      description:
        "Fair rounds: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla sem urna, sodales vel placerat sed, elementum a orci. Duis sit amet neque rutrum, suscipit enim tempus, dignissim erat. Etiam interdum dignissim pretium.",
      score: 3,
    },
    {
      name: BadgeName.EASY_TEACH,
      description:
        "Easy Tech: Awards programs with easily implementable technology. How hard is the tech? Are the docs easy to use or find?",
      score: 5,
    },
    {
      name: BadgeName.SUPPORTIVE_TEAM,
      description:
        "Supportive Team: Highlights programs with highly supportive teams. Whether technical or not, if you receive very helpful support after applying for a grant, issue this badge. – Post-Grant Support: Highlights strong post-grant support. How much do they help you after the application? Do they suggest related projects, possible connections, or interested people?",
      score: 5,
    },
    {
      name: BadgeName.GREAT_REVIEWERS,
      description:
        "Great Reviewers: Recognizes top-quality grant reviewers. They are impartial, select well-written projects, set clear goals, and explain the application process well.",
      score: 4,
    },
    {
      name: BadgeName.FAST_DISBURSEMENT,
      description:
        "Fast Disbursement: Commends quick fund disbursement processes. Did they complete the payment as soon as you completed the milestones? If yes, issue this badge.",
      score: 4,
    },
  ],
  [
    {
      name: BadgeName.CLEAR_GOALS,
      description:
        "Clear Goals: Recognizes programs with well-defined goals. Every grant program has a goal, such as governance, impact, or education. Are these goals well explained so you can build a project aligned with them?",
      score: 2,
    },
    {
      name: BadgeName.SMOOTH_APPLICATION,
      description:
        "Smooth Application: Awards a seamless application process. Are they using a tech that facilitates the application process? Did they get back to you after the application, or was it just a poor form?",
      score: 2,
    },
    {
      name: BadgeName.FAIR_ROUNDS,
      description:
        "Fair rounds: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla sem urna, sodales vel placerat sed, elementum a orci. Duis sit amet neque rutrum, suscipit enim tempus, dignissim erat. Etiam interdum dignissim pretium.",
      score: 1,
    },
    {
      name: BadgeName.EASY_TEACH,
      description:
        "Easy Tech: Awards programs with easily implementable technology. How hard is the tech? Are the docs easy to use or find?",
      score: 5,
    },
    {
      name: BadgeName.SUPPORTIVE_TEAM,
      description:
        "Supportive Team: Highlights programs with highly supportive teams. Whether technical or not, if you receive very helpful support after applying for a grant, issue this badge. – Post-Grant Support: Highlights strong post-grant support. How much do they help you after the application? Do they suggest related projects, possible connections, or interested people?",
      score: 5,
    },
    {
      name: BadgeName.GREAT_REVIEWERS,
      description:
        "Great Reviewers: Recognizes top-quality grant reviewers. They are impartial, select well-written projects, set clear goals, and explain the application process well.",
      score: 4,
    },
    {
      name: BadgeName.FAST_DISBURSEMENT,
      description:
        "Fast Disbursement: Commends quick fund disbursement processes. Did they complete the payment as soon as you completed the milestones? If yes, issue this badge.",
      score: 4,
    },
  ],
];

export const useReviewStore = create<ReviewStore>((set, get) => ({
  newReview: defaultInitialNewReviewList, 
  setNewReview: (newReview: BadgeListProps[]) => 
    set((state) => ({ ...state, newReview })), 
  badgeList: initialBadgeList, 
  setBadgeList: (badgeList: BadgeListProps[][]) => 
    set((state) => ({ ...state, badgeList })), 
}));
