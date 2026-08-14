import type { Metadata } from "next";
import { DonorRewardsApp } from "@/src/features/donor-rewards/components/donor-rewards-app";
import { customMetadata } from "@/utilities/meta";

export const metadata: Metadata = customMetadata({
  title: "Your Giving Journey: streaks, quests, and verified impact",
  description:
    "A rewards experience for DAF donors. Keep your giving streak alive, complete monthly quests, and watch verified impact roll in from your grantees.",
  path: "/donor-rewards",
});

export default function DonorRewardsPage() {
  return <DonorRewardsApp />;
}
