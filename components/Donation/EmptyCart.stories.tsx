import type { Meta, StoryObj } from '@storybook/react';
import { EmptyCart } from './EmptyCart';

const meta: Meta<typeof EmptyCart> = {
  title: 'Donation/EmptyCart',
  component: EmptyCart,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof EmptyCart>;

export const Default: Story = {
  args: {
    onBrowseProjects: () => {},
  },
};

export const WithAction: Story = {
  args: {
    onBrowseProjects: () => {
      alert('Navigating to project explorer...');
    },
  },
};
