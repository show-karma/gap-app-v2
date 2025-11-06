import { render, screen } from '@testing-library/react';
import { ActivityCard } from '@/components/Shared/ActivityCard';
import '@testing-library/jest-dom';

// Mock store hooks
jest.mock('@/store/owner', () => ({
  useOwnerStore: jest.fn((selector) => {
    const state = { isOwner: false };
    return selector ? selector(state) : state;
  }),
}));

jest.mock('@/store/project', () => ({
  useProjectStore: jest.fn((selector) => {
    const state = { isProjectAdmin: false };
    return selector ? selector(state) : state;
  }),
}));

// Mock child components
jest.mock('@/components/Shared/ActivityCard/UpdateCard', () => ({
  UpdateCard: ({ update, index, isAuthorized }: any) => (
    <div data-testid="update-card">
      <div data-testid="update-index">{index}</div>
      <div data-testid="update-authorized">{isAuthorized.toString()}</div>
    </div>
  ),
}));

jest.mock('@/components/Shared/ActivityCard/MilestoneCard', () => ({
  MilestoneCard: ({ milestone, isAuthorized }: any) => (
    <div data-testid="milestone-card">
      <div data-testid="milestone-title">{milestone.title}</div>
      <div data-testid="milestone-authorized">{isAuthorized.toString()}</div>
    </div>
  ),
}));

describe('ActivityCard', () => {
  const mockUpdate = {
    type: 'update' as const,
    data: {
      uid: 'update-1',
      title: 'Test Update',
      text: 'Update description',
    },
    index: 0,
  };

  const mockMilestone = {
    type: 'milestone' as const,
    data: {
      uid: 'milestone-1',
      title: 'Test Milestone',
      description: 'Milestone description',
    },
  };

  describe('Rendering', () => {
    it('should render update card for update activity', () => {
      render(<ActivityCard activity={mockUpdate} />);

      expect(screen.getByTestId('update-card')).toBeInTheDocument();
    });

    it('should render milestone card for milestone activity', () => {
      render(<ActivityCard activity={mockMilestone} />);

      expect(screen.getByTestId('milestone-card')).toBeInTheDocument();
    });

    it('should not render milestone card for update activity', () => {
      render(<ActivityCard activity={mockUpdate} />);

      expect(screen.queryByTestId('milestone-card')).not.toBeInTheDocument();
    });

    it('should not render update card for milestone activity', () => {
      render(<ActivityCard activity={mockMilestone} />);

      expect(screen.queryByTestId('update-card')).not.toBeInTheDocument();
    });

    it('should have main container with full width', () => {
      const { container } = render(<ActivityCard activity={mockUpdate} />);

      const mainDiv = container.querySelector('.flex.flex-col.w-full');
      expect(mainDiv).toBeInTheDocument();
    });
  });

  describe('Update Card Rendering', () => {
    it('should pass update data to UpdateCard', () => {
      render(<ActivityCard activity={mockUpdate} />);

      expect(screen.getByTestId('update-card')).toBeInTheDocument();
    });

    it('should pass index to UpdateCard', () => {
      render(<ActivityCard activity={mockUpdate} />);

      expect(screen.getByTestId('update-index')).toHaveTextContent('0');
    });

    it('should have container with border styling', () => {
      const { container } = render(<ActivityCard activity={mockUpdate} />);

      const updateContainer = container.querySelector(
        '.border.bg-white.dark\\:bg-zinc-800'
      );
      expect(updateContainer).toBeInTheDocument();
    });

    it('should have rounded corners on update container', () => {
      const { container } = render(<ActivityCard activity={mockUpdate} />);

      const updateContainer = container.querySelector('.rounded-xl');
      expect(updateContainer).toBeInTheDocument();
    });

    it('should pass different index values correctly', () => {
      const activity = { ...mockUpdate, index: 5 };
      render(<ActivityCard activity={activity} />);

      expect(screen.getByTestId('update-index')).toHaveTextContent('5');
    });
  });

  describe('Milestone Card Rendering', () => {
    it('should pass milestone data to MilestoneCard', () => {
      render(<ActivityCard activity={mockMilestone} />);

      expect(screen.getByTestId('milestone-title')).toHaveTextContent(
        'Test Milestone'
      );
    });

    it('should not have update container styling for milestone', () => {
      const { container } = render(<ActivityCard activity={mockMilestone} />);

      const updateContainer = container.querySelector(
        '.border.bg-white.dark\\:bg-zinc-800.rounded-xl'
      );
      expect(updateContainer).not.toBeInTheDocument();
    });
  });

  describe('Authorization Logic', () => {
    it('should pass false authorization when user is not owner or admin', () => {
      render(<ActivityCard activity={mockUpdate} />);

      expect(screen.getByTestId('update-authorized')).toHaveTextContent('false');
    });

    it('should pass true authorization when isAuthorized prop is true', () => {
      render(<ActivityCard activity={mockUpdate} isAuthorized={true} />);

      expect(screen.getByTestId('update-authorized')).toHaveTextContent('true');
    });

    it('should respect isAuthorized prop for milestone', () => {
      render(<ActivityCard activity={mockMilestone} isAuthorized={true} />);

      expect(screen.getByTestId('milestone-authorized')).toHaveTextContent('true');
    });

    it('should pass authorization to update card', () => {
      render(<ActivityCard activity={mockUpdate} isAuthorized={false} />);

      expect(screen.getByTestId('update-authorized')).toHaveTextContent('false');
    });

    it('should pass authorization to milestone card', () => {
      render(<ActivityCard activity={mockMilestone} isAuthorized={false} />);

      expect(screen.getByTestId('milestone-authorized')).toHaveTextContent('false');
    });
  });

  describe('Store Integration', () => {
    it('should use owner store to check authorization', () => {
      const { useOwnerStore } = require('@/store/owner');
      useOwnerStore.mockImplementation((selector: any) => {
        const state = { isOwner: true };
        return selector ? selector(state) : state;
      });

      render(<ActivityCard activity={mockUpdate} />);

      expect(screen.getByTestId('update-authorized')).toHaveTextContent('true');

      // Reset mock
      useOwnerStore.mockImplementation((selector: any) => {
        const state = { isOwner: false };
        return selector ? selector(state) : state;
      });
    });

    it('should use project store to check admin status', () => {
      const { useProjectStore } = require('@/store/project');
      useProjectStore.mockImplementation((selector: any) => {
        const state = { isProjectAdmin: true };
        return selector ? selector(state) : state;
      });

      render(<ActivityCard activity={mockUpdate} />);

      expect(screen.getByTestId('update-authorized')).toHaveTextContent('true');

      // Reset mock
      useProjectStore.mockImplementation((selector: any) => {
        const state = { isProjectAdmin: false };
        return selector ? selector(state) : state;
      });
    });

    it('should combine owner and admin checks correctly', () => {
      const { useOwnerStore } = require('@/store/owner');
      const { useProjectStore } = require('@/store/project');

      useOwnerStore.mockImplementation((selector: any) => {
        const state = { isOwner: true };
        return selector ? selector(state) : state;
      });
      useProjectStore.mockImplementation((selector: any) => {
        const state = { isProjectAdmin: true };
        return selector ? selector(state) : state;
      });

      render(<ActivityCard activity={mockUpdate} />);

      expect(screen.getByTestId('update-authorized')).toHaveTextContent('true');

      // Reset mocks
      useOwnerStore.mockImplementation((selector: any) => {
        const state = { isOwner: false };
        return selector ? selector(state) : state;
      });
      useProjectStore.mockImplementation((selector: any) => {
        const state = { isProjectAdmin: false };
        return selector ? selector(state) : state;
      });
    });
  });

  describe('Container Styling', () => {
    it('should have flex column layout', () => {
      const { container } = render(<ActivityCard activity={mockUpdate} />);

      const mainDiv = container.firstChild as HTMLElement;
      expect(mainDiv).toHaveClass('flex', 'flex-col', 'w-full');
    });

    it('should apply container class name to update wrapper', () => {
      const { container } = render(<ActivityCard activity={mockUpdate} />);

      const updateContainer = container.querySelector(
        '.border.border-gray-300.dark\\:border-zinc-400'
      );
      expect(updateContainer).toBeInTheDocument();
    });

    it('should have gap-0 in update container', () => {
      const { container } = render(<ActivityCard activity={mockUpdate} />);

      const updateContainer = container.querySelector('.gap-0');
      expect(updateContainer).toBeInTheDocument();
    });

    it('should align items to start in update container', () => {
      const { container } = render(<ActivityCard activity={mockUpdate} />);

      const updateContainer = container.querySelector('.items-start.justify-start');
      expect(updateContainer).toBeInTheDocument();
    });
  });

  describe('Dark Mode Support', () => {
    it('should have dark mode background for update card', () => {
      const { container } = render(<ActivityCard activity={mockUpdate} />);

      const updateContainer = container.querySelector('.dark\\:bg-zinc-800');
      expect(updateContainer).toBeInTheDocument();
    });

    it('should have dark mode border for update card', () => {
      const { container } = render(<ActivityCard activity={mockUpdate} />);

      const updateContainer = container.querySelector('.dark\\:border-zinc-400');
      expect(updateContainer).toBeInTheDocument();
    });
  });

  describe('Prop Variations', () => {
    it('should handle undefined isAuthorized prop', () => {
      render(<ActivityCard activity={mockUpdate} />);

      expect(screen.getByTestId('update-card')).toBeInTheDocument();
      expect(screen.getByTestId('update-authorized')).toHaveTextContent('false');
    });

    it('should handle different activity types correctly', () => {
      const { rerender } = render(<ActivityCard activity={mockUpdate} />);

      expect(screen.getByTestId('update-card')).toBeInTheDocument();

      rerender(<ActivityCard activity={mockMilestone} />);

      expect(screen.queryByTestId('update-card')).not.toBeInTheDocument();
      expect(screen.getByTestId('milestone-card')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should render with minimum required props', () => {
      const minimalUpdate = {
        type: 'update' as const,
        data: {},
        index: 0,
      };

      const { container } = render(<ActivityCard activity={minimalUpdate} />);

      expect(container.firstChild).toBeInTheDocument();
    });

    it('should handle zero index', () => {
      render(<ActivityCard activity={{ ...mockUpdate, index: 0 }} />);

      expect(screen.getByTestId('update-index')).toHaveTextContent('0');
    });

    it('should handle large index numbers', () => {
      render(<ActivityCard activity={{ ...mockUpdate, index: 999 }} />);

      expect(screen.getByTestId('update-index')).toHaveTextContent('999');
    });

    it('should maintain structure consistency across activity types', () => {
      const { container: updateContainer } = render(
        <ActivityCard activity={mockUpdate} />
      );
      const { container: milestoneContainer } = render(
        <ActivityCard activity={mockMilestone} />
      );

      expect(updateContainer.firstChild).toHaveClass('flex', 'flex-col', 'w-full');
      expect(milestoneContainer.firstChild).toHaveClass('flex', 'flex-col', 'w-full');
    });
  });

  describe('Type Safety', () => {
    it('should handle update type correctly', () => {
      render(<ActivityCard activity={mockUpdate} />);

      expect(screen.getByTestId('update-card')).toBeInTheDocument();
      expect(screen.queryByTestId('milestone-card')).not.toBeInTheDocument();
    });

    it('should handle milestone type correctly', () => {
      render(<ActivityCard activity={mockMilestone} />);

      expect(screen.getByTestId('milestone-card')).toBeInTheDocument();
      expect(screen.queryByTestId('update-card')).not.toBeInTheDocument();
    });
  });
});
