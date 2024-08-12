import { BadgeName } from "@/components/Icons/Badge";
import { BadgeListProps } from "@/components/Pages/Project/Review/CardReview";
import { create } from "zustand";

export interface Review {
  id: number;
  date: number; // UNIX Timestamp
  averageScore: number;
  reviews: BadgeListProps[]
}
interface ReviewStore {
  review: Review[];
  setReview: (review: Review[]) => void;
  badgeList: BadgeListProps[][];
  setBadgeList: (badgeList: BadgeListProps[][]) => void;
}

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

const defaultReviews: Review[] = [
  {
    id: 0,
    date: 1620414884, // 07 May, 2021 in Unix timestamp
    averageScore: 4.6,
    reviews: initialBadgeList[0]
  },
  {
    id: 1,
    date: 1673723684, // 14 January, 2023 in Unix timestamp
    averageScore: 4.4,
    reviews: initialBadgeList[1]

  },
  {
    id: 2,
    date: 1498072484, // 21 Jun 2017 in Unix timestamp
    averageScore: 4.1,
    reviews: initialBadgeList[2]
  },
  {
    id: 3,
    date: 1351188884, // 25 Oct 2012 in Unix timestamp
    averageScore: 4.9,
    reviews: initialBadgeList[3]
  },
  {
    id: 4,
    date: 1719792000, // 1 July, 2024 in Unix timestamp
    averageScore: 4.9,
    reviews: initialBadgeList[4]
  },
  {
    id: 5,
    date: 1672531200, // 1 January, 2023 in Unix timestamp
    averageScore: 4.9,
    reviews: initialBadgeList[5]
  },
  {
    id: 6,
    date: 1356998400, // 1 January, 2013 in Unix timestamp
    averageScore: 4.9,
    reviews: initialBadgeList[6]
  },
];

export const useReviewStore = create<ReviewStore>((set, get) => ({
  review: defaultReviews,
  setReview: (review:Review[] ) => 
    set((state) => ({...state, review}) ),
  badgeList: initialBadgeList, 
  setBadgeList: (badgeList: BadgeListProps[][]) => 
    set((state) => ({ ...state, badgeList })), 
}));
