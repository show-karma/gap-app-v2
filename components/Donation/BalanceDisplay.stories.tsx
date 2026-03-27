import type { Meta, StoryObj } from '@storybook/react';
import { BalanceDisplay } from './BalanceDisplay';

const meta: Meta<typeof BalanceDisplay> = {
  title: 'Donation/BalanceDisplay',
  component: BalanceDisplay,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-64 text-right">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof BalanceDisplay>;

const ethToken = { symbol: 'ETH', chainId: 1 };
const usdcToken = { symbol: 'USDC', chainId: 10 };

export const NoToken: Story = {
  args: {
    selectedToken: undefined,
    balanceByTokenKey: {},
  },
};

export const WithBalance: Story = {
  args: {
    selectedToken: ethToken,
    balanceByTokenKey: { 'ETH-1': '2.543218' },
  },
};

export const Loading: Story = {
  args: {
    selectedToken: usdcToken,
    balanceByTokenKey: {},
    isFetchingBalances: true,
  },
};

export const SlowLoading: Story = {
  args: {
    selectedToken: usdcToken,
    balanceByTokenKey: {},
    isFetchingBalances: true,
    isSlowFetch: true,
  },
};

export const BalanceError: Story = {
  args: {
    selectedToken: ethToken,
    balanceByTokenKey: {},
    balanceError: {
      message: 'Failed to fetch balance for ETH',
      chainIds: [1],
      canRetry: true,
    },
    canRetry: true,
    onRetry: () => {},
  },
};

export const BalanceUnavailable: Story = {
  args: {
    selectedToken: usdcToken,
    balanceByTokenKey: {},
    isFetchingBalances: false,
  },
};
