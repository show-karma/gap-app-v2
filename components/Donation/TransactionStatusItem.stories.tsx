import type { Meta, StoryObj } from '@storybook/react';
import { TransactionStatusItem } from './TransactionStatusItem';
import type { SupportedToken } from '@/constants/supportedTokens';

const meta: Meta<typeof TransactionStatusItem> = {
  title: 'Donation/TransactionStatusItem',
  component: TransactionStatusItem,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof TransactionStatusItem>;

const mockToken: SupportedToken = {
  symbol: 'ETH',
  name: 'Ethereum',
  address: 'native',
  decimals: 18,
  chainId: 10,
  chainName: 'Optimism',
  isNative: true,
};

export const Pending: Story = {
  args: {
    transfer: {
      projectId: 'proj-1',
      status: 'pending',
    },
    projectTitle: 'DeFi Governance Dashboard',
    token: mockToken,
  },
};

export const Success: Story = {
  args: {
    transfer: {
      projectId: 'proj-1',
      status: 'success',
      hash: '0xabc123def456789012345678901234567890abcdef',
    },
    projectTitle: 'DeFi Governance Dashboard',
    token: mockToken,
  },
};

export const Error: Story = {
  args: {
    transfer: {
      projectId: 'proj-1',
      status: 'error',
      error: 'User rejected the transaction',
    },
    projectTitle: 'DeFi Governance Dashboard',
    token: mockToken,
  },
};

export const ErrorWithoutTitle: Story = {
  args: {
    transfer: {
      projectId: 'proj-unknown',
      status: 'error',
      error: 'Insufficient gas for transaction',
    },
    token: mockToken,
  },
};

export const SuccessWithoutToken: Story = {
  args: {
    transfer: {
      projectId: 'proj-1',
      status: 'success',
      hash: '0xabc123',
    },
    projectTitle: 'Cross-chain Bridge Protocol',
  },
};
