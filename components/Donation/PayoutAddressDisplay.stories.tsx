import type { Meta, StoryObj } from '@storybook/react';
import { PayoutAddressDisplay } from './PayoutAddressDisplay';

const meta: Meta<typeof PayoutAddressDisplay> = {
  title: 'Donation/PayoutAddressDisplay',
  component: PayoutAddressDisplay,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof PayoutAddressDisplay>;

const shortAddress = (address?: string) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const NoPayoutInfo: Story = {
  args: {
    payoutInfo: undefined,
    formatAddress: shortAddress,
  },
};

export const LoadingAddress: Story = {
  args: {
    payoutInfo: {
      address: undefined,
      isLoading: true,
      isMissing: false,
    },
    formatAddress: shortAddress,
  },
};

export const MissingAddress: Story = {
  args: {
    payoutInfo: {
      address: undefined,
      isLoading: false,
      isMissing: true,
    },
    formatAddress: shortAddress,
  },
};

export const WithAddress: Story = {
  args: {
    payoutInfo: {
      address: '0x1234567890abcdef1234567890abcdef12345678',
      isLoading: false,
      isMissing: false,
    },
    formatAddress: shortAddress,
  },
};
