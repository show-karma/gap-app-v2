import type { Meta, StoryObj } from "@storybook/react";
import type { Hex } from "viem";
import { AddressEfpHoverCard } from "@/components/EFP/AddressEfpHoverCard";
import { useEFP } from "@/store/efp";

const TEST_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678" as Hex;

const meta: Meta<typeof AddressEfpHoverCard> = {
  title: "EFP/AddressEfpHoverCard",
  component: AddressEfpHoverCard,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
};

export default meta;
type Story = StoryObj<typeof AddressEfpHoverCard>;

export const HoverCardOpen: Story = {
  args: {
    address: TEST_ADDRESS,
    open: true,
    children: (
      <button type="button" className="text-sm font-semibold underline">
        alice.eth
      </button>
    ),
  },
  decorators: [
    (Story) => {
      useEFP.setState({
        efpData: {
          [TEST_ADDRESS]: {
            followers_count: 12,
            following_count: 3,
            commonFollowersLength: 2,
            isFetching: false,
          },
        },
      });
      return <Story />;
    },
  ],
};

export const HoverCardLoading: Story = {
  args: {
    address: TEST_ADDRESS,
    open: true,
    children: (
      <button type="button" className="text-sm font-semibold underline">
        alice.eth
      </button>
    ),
  },
  decorators: [
    (Story) => {
      useEFP.setState({
        efpData: {
          [TEST_ADDRESS]: { isFetching: true },
        },
      });
      return <Story />;
    },
  ],
};
