import type { Meta, StoryObj } from "@storybook/react";
import type { SocialMetrics } from "@/types/donor-research";
import { SocialPresence } from "@/src/features/donor-research/components/report-viewer/SocialPresence";

const meta: Meta<typeof SocialPresence> = {
  title: "Donor Research/SocialPresence",
  component: SocialPresence,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof SocialPresence>;

const daysAgo = (n: number): string => new Date(Date.now() - n * 86_400_000).toISOString();

const allFourChannels: SocialMetrics = {
  byChannel: [
    { channel: "linkedin", available: true, followers: 4200, postsInWindow: 9, lastPostAt: daysAgo(2), avgLikes: 63 },
    { channel: "facebook", available: true, followers: 9400, postsInWindow: 7, lastPostAt: daysAgo(3), avgLikes: 112 },
    { channel: "instagram", available: true, followers: 12800, postsInWindow: 14, lastPostAt: daysAgo(1), avgLikes: 540 },
    { channel: "x", available: true, followers: 3100, postsInWindow: 21, lastPostAt: daysAgo(0), avgLikes: 18 },
  ],
  lastPostAt: daysAgo(0),
  totalFollowers: 29500,
};

export const AllChannels: Story = {
  args: { metrics: allFourChannels },
};

export const PartialChannels: Story = {
  name: "Some channels unavailable",
  args: {
    metrics: {
      byChannel: [
        { channel: "instagram", available: true, followers: 3300, postsInWindow: 7, lastPostAt: daysAgo(24), avgLikes: 128 },
        { channel: "x", available: true, followers: 940, postsInWindow: 3, lastPostAt: daysAgo(31), avgLikes: 6 },
        { channel: "linkedin", available: false, followers: null, postsInWindow: 0, lastPostAt: null, avgLikes: null },
        { channel: "facebook", available: false, followers: null, postsInWindow: 0, lastPostAt: null, avgLikes: null },
      ],
      lastPostAt: daysAgo(24),
      totalFollowers: 4240,
    },
  },
};

export const InactiveButPresent: Story = {
  name: "Has accounts but no recent posts",
  args: {
    metrics: {
      byChannel: [
        { channel: "facebook", available: true, followers: 1800, postsInWindow: 0, lastPostAt: daysAgo(220), avgLikes: null },
      ],
      lastPostAt: daysAgo(220),
      totalFollowers: 1800,
    },
  },
};

export const NoData: Story = {
  name: "No social (renders nothing)",
  args: { metrics: null },
};
