import type { Metadata } from "next";
import { JudgeAgentPage } from "@/src/features/judge-agent/components/judge-agent-page";

export const metadata: Metadata = {
  title: "Judge Agent | Karma",
  description:
    "AI-powered hackathon submission evaluator. Analyze demo videos and get detailed scoring with evidence-based feedback.",
};

export default function Page() {
  return <JudgeAgentPage />;
}
