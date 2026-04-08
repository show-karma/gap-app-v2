import type { Meta, StoryObj } from '@storybook/react';
import { DonationSummary } from './DonationSummary';
import type { SupportedToken } from '@/constants/supportedTokens';

const meta: Meta<typeof DonationSummary> = {
  title: 'Donation/DonationSummary',
  component: DonationSummary,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof DonationSummary>;

const createToken = (overrides: Partial<SupportedToken> = {}): SupportedToken => ({
  symbol: 'ETH',
  name: 'Ethereum',
  address: 'native',
  decimals: 18,
  chainId: 1,
  chainName: 'Ethereum',
  isNative: true,
  ...overrides,
});

const ethToken = createToken();
const opToken = createToken({
  symbol: 'ETH',
  chainId: 10,
  chainName: 'Optimism',
});
const usdcToken = createToken({
  symbol: 'USDC',
  name: 'USD Coin',
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  decimals: 6,
  chainId: 1,
  chainName: 'Ethereum',
  isNative: false,
});
const arbUsdcToken = createToken({
  symbol: 'USDC',
  name: 'USD Coin',
  address: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
  decimals: 6,
  chainId: 42161,
  chainName: 'Arbitrum One',
  isNative: false,
});

export const Empty: Story = {
  args: {
    payments: [],
  },
};

export const SingleToken: Story = {
  args: {
    payments: [
      { projectId: 'proj-1', amount: '0.5', token: ethToken, chainId: 1 },
    ],
  },
};

export const MultipleTokensSameChain: Story = {
  args: {
    payments: [
      { projectId: 'proj-1', amount: '0.5', token: ethToken, chainId: 1 },
      { projectId: 'proj-2', amount: '100', token: usdcToken, chainId: 1 },
      { projectId: 'proj-3', amount: '0.25', token: ethToken, chainId: 1 },
    ],
  },
};

export const MultipleNetworks: Story = {
  args: {
    payments: [
      { projectId: 'proj-1', amount: '0.5', token: ethToken, chainId: 1 },
      { projectId: 'proj-2', amount: '1.0', token: opToken, chainId: 10 },
      { projectId: 'proj-3', amount: '250', token: usdcToken, chainId: 1 },
      { projectId: 'proj-4', amount: '50', token: arbUsdcToken, chainId: 42161 },
    ],
  },
};

export const LargeAmounts: Story = {
  args: {
    payments: [
      { projectId: 'proj-1', amount: '1234567.890123', token: ethToken, chainId: 1 },
      { projectId: 'proj-2', amount: '999999.999999', token: usdcToken, chainId: 1 },
    ],
  },
};
