import type { Meta, StoryObj } from "@storybook/react";
import { EfpFollowingSuggestions } from "@/components/EFP/EfpFollowingSuggestions";
import { useEFP } from "@/store/efp";

const meta: Meta<typeof EfpFollowingSuggestions> = {
  title: "EFP/EfpFollowingSuggestions",
  component: EfpFollowingSuggestions,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
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
