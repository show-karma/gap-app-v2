import type { Meta, StoryObj } from '@storybook/react';
import { NetworkSwitchItem } from './NetworkSwitchItem';

const meta: Meta<typeof NetworkSwitchItem> = {
  title: 'Donation/NetworkSwitchItem',
  component: NetworkSwitchItem,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <ul className="max-w-md space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
        <Story />
      </ul>
    ),
  ],
  argTypes: {
    index: {
      control: { type: 'number', min: 0, max: 10 },
      description: 'The zero-based index displayed as a numbered list item',
    },
    projectCount: {
      control: { type: 'number', min: 1, max: 50 },
      description: 'Number of projects on this network',
    },
    needsSwitch: {
      control: 'boolean',
      description: 'Whether a network switch is required',
    },
  },
};

export default meta;
type Story = StoryObj<typeof NetworkSwitchItem>;

export const CurrentNetwork: Story = {
  args: {
    index: 0,
    chainName: 'Optimism',
    projectCount: 3,
    needsSwitch: false,
  },
};

export const SwitchRequired: Story = {
  args: {
    index: 1,
    chainName: 'Arbitrum One',
    projectCount: 2,
    needsSwitch: true,
  },
};

export const SingleProject: Story = {
  args: {
    index: 0,
    chainName: 'Ethereum',
    projectCount: 1,
    needsSwitch: true,
  },
};

export const MultipleNetworksList: Story = {
  render: () => (
    <ul className="max-w-md space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
      <NetworkSwitchItem index={0} chainName="Optimism" projectCount={3} needsSwitch={false} />
      <NetworkSwitchItem index={1} chainName="Arbitrum One" projectCount={2} needsSwitch={true} />
      <NetworkSwitchItem index={2} chainName="Ethereum" projectCount={1} needsSwitch={true} />
    </ul>
  ),
};
