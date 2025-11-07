import type { Meta, StoryObj } from '@storybook/react';
import { GrantCard } from './GrantCard';

const meta: Meta<typeof GrantCard> = {
  title: 'Cards/GrantCard',
  component: GrantCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof GrantCard>;

const mockGrant = {
  uid: 'grant-1',
  title: 'Sample Grant Program',
  description: 'This is a sample grant program description that showcases the grant card component with realistic data.',
  data: {
    communityUID: 'community-1',
  },
  details: {
    data: {
      programId: 'program-1',
      selectedTrackIds: ['track-1', 'track-2'],
    },
  },
  milestones: [
    {
      uid: 'milestone-1',
      title: 'Milestone 1',
      completed: true,
    },
    {
      uid: 'milestone-2',
      title: 'Milestone 2',
      completed: false,
    },
  ],
  createdAt: new Date('2024-01-01').toISOString(),
  updatedAt: new Date('2024-01-15').toISOString(),
} as any;

export const Default: Story = {
  args: {
    grant: mockGrant,
    index: 0,
  },
};

export const WithColorVariation: Story = {
  args: {
    grant: mockGrant,
    index: 3,
  },
};

export const WithoutStats: Story = {
  args: {
    grant: mockGrant,
    index: 0,
    hideStats: true,
  },
};

export const WithoutCategories: Story = {
  args: {
    grant: mockGrant,
    index: 0,
    hideCategories: true,
  },
};

export const WithActionSlot: Story = {
  args: {
    grant: mockGrant,
    index: 0,
    actionSlot: (
      <button className="px-3 py-1 bg-blue-500 text-white rounded">
        Action
      </button>
    ),
  },
};
