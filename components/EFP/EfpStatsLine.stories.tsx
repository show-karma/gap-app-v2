import type { Meta, StoryObj } from "@storybook/react";
import type { Hex } from "viem";
import { EfpStatsLine } from "@/components/EFP/EfpStatsLine";
import { useEFP } from "@/store/efp";

const TEST_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678" as Hex;

const meta: Meta<typeof EfpStatsLine> = {
  title: "EFP/EfpStatsLine",
  component: EfpStatsLine,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => {
      useEFP.setState({ efpData: {} });
      return <Story />;
    },
  ],
};

export default meta;
type Story = StoryObj<typeof EfpStatsLine>;

export const Loading: Story = {
  args: { address: TEST_ADDRESS },
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

export const WithStats: Story = {
  args: { address: TEST_ADDRESS },
  decorators: [
    (Story) => {
      useEFP.setState({
        efpData: {
          [TEST_ADDRESS]: {
            followers_count: 42,
            following_count: 7,
            isFetching: false,
          },
        },
      });
      return <Story />;
    },
  ],
};

export const ZeroCounts: Story = {
  args: { address: TEST_ADDRESS },
  decorators: [
    (Story) => {
      useEFP.setState({
        efpData: {
          [TEST_ADDRESS]: {
            followers_count: 0,
            following_count: 0,
            isFetching: false,
          },
        },
      });
      return <Story />;
    },
  ],
};

export const Error: Story = {
  args: { address: TEST_ADDRESS },
  decorators: [
    (Story) => {
      useEFP.setState({
        efpData: {
          [TEST_ADDRESS]: {
            error: true,
            isFetching: false,
          },
        },
      });
      return <Story />;
    },
  ],
};
