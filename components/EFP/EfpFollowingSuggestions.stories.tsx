import type { Meta, StoryObj } from "@storybook/react";
import type { Hex } from "viem";
import { EfpFollowingSuggestions } from "@/components/EFP/EfpFollowingSuggestions";
import { useProjectStore } from "@/store";
import { useEFP } from "@/store/efp";

const TEAM_OWNER = "0x1111111111111111111111111111111111111111" as Hex;
const TEAM_MEMBER = "0x2222222222222222222222222222222222222222" as Hex;

const storyProject = {
  uid: "0x1234567890123456789012345678901234567890" as Hex,
  owner: TEAM_OWNER,
  details: { title: "Storybook Project", slug: "storybook-project" },
  members: [{ address: TEAM_MEMBER }],
};

function withEfpStoryContext(Story: () => JSX.Element) {
  useProjectStore.setState({ project: storyProject });
  return <Story />;
}

const meta: Meta<typeof EfpFollowingSuggestions> = {
  title: "EFP/EfpFollowingSuggestions",
  component: EfpFollowingSuggestions,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
  decorators: [withEfpStoryContext],
};

export default meta;
type Story = StoryObj<typeof EfpFollowingSuggestions>;

export const Loading: Story = {
  decorators: [
    (Story) => {
      useEFP.setState({ isFetchingFollowing: true, viewerFollowing: undefined });
      return <Story />;
    },
  ],
};

export const Empty: Story = {
  decorators: [
    (Story) => {
      useEFP.setState({
        isFetchingFollowing: false,
        followingError: false,
        viewerFollowing: [],
      });
      return <Story />;
    },
  ],
};

export const Error: Story = {
  decorators: [
    (Story) => {
      useEFP.setState({
        isFetchingFollowing: false,
        followingError: true,
        viewerFollowing: undefined,
      });
      return <Story />;
    },
  ],
};

export const WithSuggestions: Story = {
  decorators: [
    (Story) => {
      useEFP.setState({
        isFetchingFollowing: false,
        followingError: false,
        viewerFollowing: [
          {
            version: 1,
            record_type: "address",
            data: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            tags: [],
          },
          {
            version: 1,
            record_type: "address",
            data: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            address: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            tags: [],
          },
        ],
      });
      return <Story />;
    },
  ],
};
