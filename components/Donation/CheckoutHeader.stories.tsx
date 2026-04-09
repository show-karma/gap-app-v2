import type { Meta, StoryObj } from '@storybook/react';
import { CheckoutHeader } from './CheckoutHeader';

const meta: Meta<typeof CheckoutHeader> = {
  title: 'Donation/CheckoutHeader',
  component: CheckoutHeader,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    nextjs: {
      appDirectory: true,
      navigation: {
        back: () => {},
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof CheckoutHeader>;

export const Default: Story = {
  args: {
    totalItems: 3,
    onClear: () => {},
  },
};

export const SingleItem: Story = {
  args: {
    totalItems: 1,
    onClear: () => {},
  },
};

export const WithCommunity: Story = {
  args: {
    communityId: 'community-123',
    totalItems: 5,
    onClear: () => {},
  },
};
