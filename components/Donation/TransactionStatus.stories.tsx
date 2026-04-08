import type { Meta, StoryObj } from '@storybook/react';
import { TransactionStatus } from './TransactionStatus';
import type { SupportedToken } from '@/constants/supportedTokens';

const meta: Meta<typeof TransactionStatus> = {
  title: 'Donation/TransactionStatus',
  component: TransactionStatus,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof TransactionStatus>;

const mockItems = [
  { uid: 'proj-1', title: 'DeFi Governance Dashboard' },
  { uid: 'proj-2', title: 'NFT Marketplace v2' },
  { uid: 'proj-3', title: 'Cross-chain Bridge Protocol' },
];

const ethToken: SupportedToken = {
  symbol: 'ETH',
  name: 'Ethereum',
  address: 'native',
  decimals: 18,
  chainId: 10,
  chainName: 'Optimism',
  isNative: true,
};

const usdcToken: SupportedToken = {
  symbol: 'USDC',
  name: 'USD Coin',
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  decimals: 6,
  chainId: 1,
  chainName: 'Ethereum',
  isNative: false,
};

const selectedTokens: Record<string, SupportedToken> = {
  'proj-1': ethToken,
  'proj-2': usdcToken,
  'proj-3': ethToken,
};

export const Empty: Story = {
  args: {
    transfers: [],
    items: mockItems,
    selectedTokens,
  },
};

export const AllPending: Story = {
  args: {
    transfers: [
      { projectId: 'proj-1', status: 'pending' },
      { projectId: 'proj-2', status: 'pending' },
    ],
    items: mockItems,
    selectedTokens,
  },
};

export const AllSuccessful: Story = {
  args: {
    transfers: [
      { projectId: 'proj-1', status: 'success', hash: '0xabc123def456' },
      { projectId: 'proj-2', status: 'success', hash: '0x789ghi012jkl' },
    ],
    items: mockItems,
    selectedTokens,
  },
};

export const WithFailures: Story = {
  args: {
    transfers: [
      { projectId: 'proj-1', status: 'success', hash: '0xabc123def456' },
      { projectId: 'proj-2', status: 'error', error: 'User rejected the transaction' },
      { projectId: 'proj-3', status: 'error', error: 'Insufficient gas for transaction' },
    ],
    items: mockItems,
    selectedTokens,
    canRetry: true,
    onRetry: () => {},
  },
};

export const MixedStatuses: Story = {
  args: {
    transfers: [
      { projectId: 'proj-1', status: 'success', hash: '0xabc123def456' },
      { projectId: 'proj-2', status: 'pending' },
      { projectId: 'proj-3', status: 'error', error: 'Transaction timed out' },
    ],
    items: mockItems,
    selectedTokens,
    canRetry: false,
  },
};
