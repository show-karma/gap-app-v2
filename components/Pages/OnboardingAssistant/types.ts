export interface OnboardingProjectData {
  title: string;
  description: string;
  problem: string;
  solution: string;
  missionSummary: string;
  locationOfImpact?: string;
  businessModel?: string;
  stageIn?: string;
  raisedMoney?: string;
  pathToTake?: string;
  links?: {
    twitter?: string;
    github?: string;
    discord?: string;
    website?: string;
    linkedin?: string;
    pitchDeck?: string;
    demoVideo?: string;
    farcaster?: string;
  };
}

export interface OnboardingMilestoneData {
  title: string;
  description: string;
}

export interface OnboardingGrantData {
  title: string;
  amount?: string;
  community?: string;
  milestones: OnboardingMilestoneData[];
}

export interface OnboardingData {
  type: "onboarding_data";
  project: OnboardingProjectData;
  grants: OnboardingGrantData[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}
