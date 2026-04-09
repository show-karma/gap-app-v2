import type { Meta, StoryObj } from '@storybook/react';
import { ValidationErrors } from './ValidationErrors';

const meta: Meta<typeof ValidationErrors> = {
  title: 'Donation/ValidationErrors',
  component: ValidationErrors,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof ValidationErrors>;

const mockItems = [
  { uid: 'proj-1', title: 'DeFi Governance Dashboard' },
  { uid: 'proj-2', title: 'NFT Marketplace v2' },
  { uid: 'proj-3', title: 'Cross-chain Bridge Protocol' },
];

export const NoErrors: Story = {
  args: {
    validationErrors: [],
    missingPayouts: [],
    items: mockItems,
  },
};

export const InsufficientBalance: Story = {
  args: {
    validationErrors: [
      'Insufficient ETH balance. Required: 2.5, Available: 0.8',
    ],
    missingPayouts: [],
    items: mockItems,
  },
};

export const MissingBalanceInfo: Story = {
  args: {
    validationErrors: [
      'No balance information available for USDC on Optimism',
    ],
    missingPayouts: [],
    items: mockItems,
  },
};

export const InvalidAmount: Story = {
  args: {
    validationErrors: [
      'Invalid amount for project DeFi Governance Dashboard',
    ],
    missingPayouts: [],
    items: mockItems,
  },
};

export const MissingPayoutAddress: Story = {
  args: {
    validationErrors: [],
    missingPayouts: ['proj-1', 'proj-3'],
    items: mockItems,
  },
};

export const MultipleErrors: Story = {
  args: {
    validationErrors: [
      'Insufficient ETH balance. Required: 2.5, Available: 0.8',
      'No balance information available for USDC on Optimism',
      'Invalid amount for project NFT Marketplace v2',
    ],
    missingPayouts: ['proj-2'],
    items: mockItems,
  },
};
